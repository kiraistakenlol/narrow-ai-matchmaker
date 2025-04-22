import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { ProfilesService } from '../profiles/profiles.service';
import { Profile } from 'narrow-ai-matchmaker-common'; // Import Profile interface

@Injectable()
export class EmbeddingService {
  private readonly qdrantClient: QdrantClient;
  private readonly openaiClient: OpenAI;
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly vectorSize = 3072; // Size of text-embedding-3-large vectors
  private readonly OPENAI_BATCH_SIZE = 100; // Adjust based on OpenAI limits and performance

  constructor(private readonly profilesService: ProfilesService) {
    this.logger.log('Initializing embedding service');
    
    // Initialize Qdrant client
    this.logger.log('Connecting to Qdrant at http://localhost:6333');
    this.qdrantClient = new QdrantClient({ url: 'http://localhost:6333' });
    
    // Initialize OpenAI client (requires API key in environment)
    this.logger.log('Initializing OpenAI client');
    this.openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Get API key from environment variable
    });
    
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('OPENAI_API_KEY environment variable not set. Embedding operations will fail.');
    }
  }

  async ensureCollectionExists(collectionName: string): Promise<boolean> {
    try {
      this.logger.log(`Checking if collection '${collectionName}' exists`);
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(collection => collection.name === collectionName);

      if (exists) {
        this.logger.log(`Collection '${collectionName}' already exists`);
        
        // Verify collection configuration matches our requirements
        const collectionInfo = await this.qdrantClient.getCollection(collectionName);
        const vectorSize = collectionInfo.config?.params?.vectors?.size;
        
        if (vectorSize !== this.vectorSize) {
          this.logger.warn(`Collection '${collectionName}' exists but has wrong vector size (${vectorSize} instead of ${this.vectorSize})`);
          return false;
        }
        
        return true;
      }

      this.logger.log(`Collection '${collectionName}' does not exist, creating it now with vector size ${this.vectorSize}`);
      
      try {
        await this.qdrantClient.createCollection(collectionName, {
          vectors: {
            size: this.vectorSize,
            distance: 'Cosine'
          }
        });
        
        this.logger.log(`Successfully created collection '${collectionName}'`);
        return true;
      } catch (createError) {
        this.logger.error(`Failed to create collection '${collectionName}': ${createError.message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error checking/creating collection '${collectionName}': ${error.message}`, error.stack);
      return false;
    }
  }

  async createEmbedding(profileId: string, collectionName: string) {
    this.logger.log(`Creating embedding for profile ${profileId} in collection ${collectionName}`);
    try {
      // Ensure collection exists before proceeding
      const collectionReady = await this.ensureCollectionExists(collectionName);
      if (!collectionReady) {
        throw new Error(`Could not prepare collection '${collectionName}' for embeddings`);
      }

      // Find the profile by ID
      this.logger.log(`Looking up profile with ID ${profileId}`);
      const profile = this.profilesService.findOne(profileId);
      if (!profile) {
        this.logger.error(`Profile with ID ${profileId} not found`);
        throw new Error(`Profile with ID ${profileId} not found`);
      }
      this.logger.log(`Found profile. Text length: ${profile.text.length} characters`);

      // Generate embedding with OpenAI
      this.logger.log(`Generating embedding with OpenAI (model: text-embedding-3-large)`);
      const startTime = Date.now();
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-large', // Use the latest embedding model
        input: profile.text,
        encoding_format: 'float', // Get float values
      });
      const embedTime = Date.now() - startTime;
      this.logger.log(`Embedding generated in ${embedTime}ms. Vector dimensions: ${response.data[0].embedding.length}`);

      const embedding = response.data[0].embedding;

      // Store embedding in Qdrant
      this.logger.log(`Storing embedding in Qdrant collection: ${collectionName}`);
      const qdrantStartTime = Date.now();

      try {
        // Qdrant JS client requires specific formats for IDs
        // Using numeric IDs for better compatibility
        const numericId = parseInt(profile.id.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 1000000);
        
        this.logger.debug(`Upserting point with ID: ${numericId}, vector length: ${embedding.length}`);
        
        // Simplified payload to avoid issues with large text
        const payload = {
          id: profile.id,
          // Keep only a short snippet of text to avoid payload size issues
          text_snippet: profile.text.substring(0, 200)
        };
        
        // Log the exact point structure we're sending
        this.logger.debug(`Point structure: ${JSON.stringify({
          id: numericId,
          vector_length: embedding.length,
          payload_keys: Object.keys(payload)
        })}`);

        const result = await this.qdrantClient.upsert(collectionName, {
          wait: true,
          points: [
            {
              id: numericId,
              vector: embedding,
              payload: payload,
            },
          ],
        });
        
        const qdrantTime = Date.now() - qdrantStartTime;
        this.logger.log(`Vector stored in Qdrant in ${qdrantTime}ms`);

        return {
          success: true,
          message: `Embedding created for profile ${profileId}`,
          profileId,
          pointId: numericId,
          collectionName,
          operation: result,
          timing: {
            embedding: embedTime,
            storage: qdrantTime,
            total: embedTime + qdrantTime
          }
        };
      } catch (qdrantError) {
        // More detailed logging for Qdrant errors
        this.logger.error(`Qdrant error storing vector: ${qdrantError.message}`);
        
        // Try to get more details if possible
        if (qdrantError.response) {
          this.logger.debug(`Qdrant error response: ${JSON.stringify(qdrantError.response.data || {})}`);
        }
        
        this.logger.debug(`Full error object: ${JSON.stringify(qdrantError)}`);
        throw new Error(`Failed to store vector in Qdrant: ${qdrantError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error creating embedding: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error creating embedding: ${error.message}`,
        profileId,
        collectionName,
      };
    }
  }

  async createAllEmbeddings(collectionName: string) {
    this.logger.log(`Starting batch embedding for all profiles into collection: ${collectionName}`);
    const batchStartTime = Date.now();
    
    try {
      // Ensure collection exists before proceeding
      const collectionReady = await this.ensureCollectionExists(collectionName);
      if (!collectionReady) {
        throw new Error(`Could not prepare collection '${collectionName}' for embeddings`);
      }

      const allProfiles = this.profilesService.findAll().profiles;
      this.logger.log(`Found ${allProfiles.length} profiles to embed`);
      
      if (allProfiles.length === 0) {
        this.logger.log('No profiles to embed.');
        return { success: true, message: 'No profiles found to embed.', collectionName, timing: { totalTime: 0 }, results: [] };
      }
      
      const allPoints = [];
      let openAiSuccessCount = 0;
      let openAiFailureCount = 0;
      let totalEmbedTime = 0;

      // Process profiles in batches for OpenAI API
      for (let i = 0; i < allProfiles.length; i += this.OPENAI_BATCH_SIZE) {
        const batchProfiles = allProfiles.slice(i, i + this.OPENAI_BATCH_SIZE);
        this.logger.log(`Processing batch ${Math.floor(i / this.OPENAI_BATCH_SIZE) + 1}: Profiles ${i + 1} to ${Math.min(i + this.OPENAI_BATCH_SIZE, allProfiles.length)}`);
        
        const batchInputs = batchProfiles.map(p => p.text);
        
        try {
          const openaiStartTime = Date.now();
          const response = await this.openaiClient.embeddings.create({
            model: 'text-embedding-3-large',
            input: batchInputs,
            encoding_format: 'float',
          });
          const openaiEndTime = Date.now();
          const batchEmbedTime = openaiEndTime - openaiStartTime;
          totalEmbedTime += batchEmbedTime;
          this.logger.log(`OpenAI batch processed in ${batchEmbedTime}ms. Got ${response.data.length} embeddings.`);
          openAiSuccessCount += batchInputs.length;
          
          // Match embeddings back to profiles and prepare Qdrant points
          response.data.forEach((embeddingData, index) => {
            const profile = batchProfiles[index];
            const numericId = parseInt(profile.id.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 1000000);
            const payload = {
              id: profile.id,
              text_snippet: profile.text.substring(0, 200)
            };
            allPoints.push({
              id: numericId,
              vector: embeddingData.embedding,
              payload: payload,
            });
          });

        } catch (openaiError) {
          this.logger.error(`Error calling OpenAI batch API: ${openaiError.message}`, openaiError.stack);
          openAiFailureCount += batchInputs.length;
          // Optionally, decide whether to continue or fail the whole batch
          // For now, we log and continue, reporting failures at the end
        }
      }

      this.logger.log(`OpenAI embedding generation complete. Success: ${openAiSuccessCount}, Failed: ${openAiFailureCount}. Total Embed Time: ${totalEmbedTime}ms`);

      // Batch upsert points into Qdrant
      if (allPoints.length > 0) {
        this.logger.log(`Upserting ${allPoints.length} points into Qdrant collection: ${collectionName}`);
        const qdrantStartTime = Date.now();
        try {
          const qdrantResult = await this.qdrantClient.upsert(collectionName, {
            wait: true,
            points: allPoints,
          });
          const qdrantEndTime = Date.now();
          const qdrantUpsertTime = qdrantEndTime - qdrantStartTime;
          this.logger.log(`Qdrant batch upsert completed in ${qdrantUpsertTime}ms. Result status: ${qdrantResult.status}`);

          const totalBatchTime = Date.now() - batchStartTime;
          return {
            success: true,
            message: `Completed embedding ${openAiSuccessCount} profiles successfully, ${openAiFailureCount} failed. Total time: ${totalBatchTime}ms.`,
            collectionName,
            timing: {
              totalTime: totalBatchTime,
              embeddingTime: totalEmbedTime,
              qdrantUpsertTime,
              averagePerProfile: allProfiles.length > 0 ? totalBatchTime / allProfiles.length : 0
            },
            // Note: Individual results aren't tracked in this batch approach
            results: { status: qdrantResult.status, operation_id: qdrantResult.operation_id }
          };

        } catch (qdrantError) {
          this.logger.error(`Error during Qdrant batch upsert: ${qdrantError.message}`, qdrantError.stack);
          throw new Error(`Failed to store batch vectors in Qdrant: ${qdrantError.message}`);
        }
      } else {
        this.logger.warn('No points were generated to upsert into Qdrant.');
        const totalBatchTime = Date.now() - batchStartTime;
        return {
          success: openAiFailureCount === 0,
          message: `Embedding process completed. ${openAiSuccessCount} profiles processed, ${openAiFailureCount} failed. No points upserted.`,
          collectionName,
          timing: { totalTime: totalBatchTime },
          results: {}
        };
      }

    } catch (error) {
      this.logger.error(`Error creating all embeddings: ${error.message}`, error.stack);
      const totalBatchTime = Date.now() - batchStartTime;
      return {
        success: false,
        message: `Error creating all embeddings: ${error.message}`,
        collectionName,
        timing: { totalTime: totalBatchTime }
      };
    }
  }

  async findSimilarProfiles(profileId: string, collectionName: string, limit: number = 5) {
    this.logger.log(`Finding similar profiles for ${profileId} in collection ${collectionName} (limit: ${limit})`);
    const overallStartTime = Date.now();
    try {
      // Ensure collection exists before proceeding
      const collectionExists = await this.ensureCollectionExists(collectionName);
      if (!collectionExists) {
        throw new Error(`Collection '${collectionName}' doesn't exist or couldn't be created`);
      }

      // Convert profileId to the numeric ID used in Qdrant
      const numericId = parseInt(profileId.replace(/\D/g, ''), 10);
      if (isNaN(numericId)) {
        throw new Error(`Invalid profile ID format: ${profileId}`);
      }
      this.logger.log(`Converted profile ID '${profileId}' to numeric ID ${numericId}`);

      // Retrieve the vector from Qdrant
      this.logger.log(`Retrieving vector for ID ${numericId} from collection ${collectionName}`);
      const retrieveStartTime = Date.now();
      const points = await this.qdrantClient.retrieve(collectionName, {
        ids: [numericId],
        with_vector: true,
      });
      const retrieveTime = Date.now() - retrieveStartTime;

      if (!points || points.length === 0 || !points[0].vector) {
        this.logger.error(`Vector not found in Qdrant for ID ${numericId}`);
        throw new Error(`Vector not found for profile ID ${profileId} (numeric ${numericId}) in collection ${collectionName}`);
      }
      this.logger.log(`Vector retrieved in ${retrieveTime}ms`);
      const queryEmbedding = points[0].vector as number[];

      // Search Qdrant for similar vectors
      this.logger.log(`Searching Qdrant collection ${collectionName} for similar profiles`);
      const searchStartTime = Date.now();
      
      try {
        const searchResult = await this.qdrantClient.search(collectionName, {
          vector: queryEmbedding,
          limit: limit + 1, // Fetch one extra to exclude self if it appears
          with_payload: true, // Retrieve payload which contains original profile ID
          // We don't need the filter anymore if we retrieve first, but good practice to keep
          filter: {
            must_not: [
              {
                key: 'id',
                match: { value: numericId } // Filter by numeric ID
              }
            ]
          }
        });
        
        const searchTime = Date.now() - searchStartTime;
        this.logger.log(`Found ${searchResult.length} raw results from Qdrant in ${searchTime}ms`);

        // Filter out the query point itself if it was returned
        const rawSimilarPoints = searchResult.filter(p => p.id !== numericId).slice(0, limit);
        
        // Fetch full profile data for each similar point
        this.logger.log(`Fetching full profile data for ${rawSimilarPoints.length} similar profiles`);
        const fetchProfileStartTime = Date.now();
        const finalResults = rawSimilarPoints.map(point => {
          const originalProfileId = point.payload?.id as string; // Get original ID from payload
          const fullProfile = this.profilesService.findOne(originalProfileId);
          
          if (!fullProfile) {
            this.logger.warn(`Could not find full profile for ID ${originalProfileId} (Qdrant point ID ${point.id})`);
            return null; // Handle case where profile might be missing
          }
          
          return {
            id: originalProfileId,
            score: point.score,
            profile: fullProfile // Return the full profile data
          };
        }).filter(result => result !== null); // Filter out any nulls (missing profiles)
        const fetchProfileTime = Date.now() - fetchProfileStartTime;
        this.logger.log(`Full profile data fetched in ${fetchProfileTime}ms`);
        
        // Log similarity scores for debugging
        finalResults.forEach((result, index) => {
          this.logger.verbose(`Match ${index+1}: ID ${result.id}, Score: ${result.score.toFixed(4)}`);
        });

        const overallTime = Date.now() - overallStartTime;
        return {
          success: true,
          message: `Found ${finalResults.length} similar profiles`,
          profileId,
          collectionName,
          timing: {
            retrieve: retrieveTime,
            search: searchTime,
            profileFetch: fetchProfileTime,
            total: overallTime
          },
          results: finalResults
        };
      } catch (searchError) {
        this.logger.error(`Qdrant search error: ${searchError.message}`);
        throw new Error(`Error searching similar profiles in Qdrant: ${searchError.message}`);
      }
    } catch (error) {
      this.logger.error(`Error finding similar profiles: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error finding similar profiles: ${error.message}`,
        profileId,
        collectionName
      };
    }
  }
  
  async deleteCollection(collectionName: string) {
    this.logger.log(`Deleting collection '${collectionName}'`);
    try {
      await this.qdrantClient.deleteCollection(collectionName);
      this.logger.log(`Collection '${collectionName}' deleted`);
      return { success: true, message: `Collection '${collectionName}' deleted` };
    } catch (error) {
      this.logger.error(`Error deleting collection '${collectionName}': ${error.message}`);
      return { success: false, message: `Error deleting collection '${collectionName}': ${error.message}` };
    }
  }
} 