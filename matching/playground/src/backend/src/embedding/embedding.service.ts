import { Injectable, Logger } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class EmbeddingService {
  private readonly qdrantClient: QdrantClient;
  private readonly openaiClient: OpenAI;
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly vectorSize = 3072; // Size of text-embedding-3-large vectors

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
      this.logger.log(`Found profile. Text length: ${profile.input_text.length} characters`);

      // Generate embedding with OpenAI
      this.logger.log(`Generating embedding with OpenAI (model: text-embedding-3-large)`);
      const startTime = Date.now();
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-large', // Use the latest embedding model
        input: profile.input_text,
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
        const numericId = parseInt(profile.user_id.replace(/\D/g, ''), 10) || Math.floor(Math.random() * 1000000);
        
        this.logger.debug(`Upserting point with ID: ${numericId}, vector length: ${embedding.length}`);
        
        // Simplified payload to avoid issues with large text
        const payload = {
          user_id: profile.user_id,
          // Keep only a short snippet of text to avoid payload size issues
          text_snippet: profile.input_text.substring(0, 200)
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
    try {
      // Ensure collection exists before proceeding
      const collectionReady = await this.ensureCollectionExists(collectionName);
      if (!collectionReady) {
        throw new Error(`Could not prepare collection '${collectionName}' for embeddings`);
      }

      const allProfiles = this.profilesService.findAll().profiles;
      this.logger.log(`Found ${allProfiles.length} profiles to embed`);
      
      const results = [];
      let successCount = 0;
      let failureCount = 0;
      const startTime = Date.now();

      for (let i = 0; i < allProfiles.length; i++) {
        const profile = allProfiles[i];
        this.logger.log(`Processing profile ${i+1}/${allProfiles.length}: ${profile.user_id}`);
        
        try {
          const result = await this.createEmbedding(profile.user_id, collectionName);
          results.push(result);
          
          if (result.success) {
            successCount++;
            this.logger.log(`Successfully embedded profile ${profile.user_id} (${successCount} successful, ${failureCount} failed)`);
          } else {
            failureCount++;
            this.logger.warn(`Failed to embed profile ${profile.user_id} (${successCount} successful, ${failureCount} failed)`);
          }
        } catch (error) {
          failureCount++;
          this.logger.error(`Exception embedding profile ${profile.user_id}: ${error.message}`, error.stack);
          results.push({
            success: false,
            message: `Error embedding profile ${profile.user_id}: ${error.message}`,
            profileId: profile.user_id
          });
        }
      }

      const totalTime = Date.now() - startTime;
      this.logger.log(`Completed embedding all profiles in ${totalTime}ms. Success: ${successCount}, Failed: ${failureCount}`);

      return {
        success: true,
        message: `Completed embedding all profiles. Success: ${successCount}, Failed: ${failureCount}`,
        collectionName,
        timing: {
          totalTime,
          averagePerProfile: allProfiles.length > 0 ? totalTime / allProfiles.length : 0
        },
        results
      };
    } catch (error) {
      this.logger.error(`Error creating all embeddings: ${error.message}`, error.stack);
      return {
        success: false,
        message: `Error creating all embeddings: ${error.message}`,
        collectionName
      };
    }
  }

  async findSimilarProfiles(profileId: string, collectionName: string, limit: number = 5) {
    this.logger.log(`Finding similar profiles for ${profileId} in collection ${collectionName} (limit: ${limit})`);
    try {
      // Ensure collection exists before proceeding
      const collectionExists = await this.ensureCollectionExists(collectionName);
      if (!collectionExists) {
        throw new Error(`Collection '${collectionName}' doesn't exist or couldn't be created`);
      }

      // Find the profile by ID
      this.logger.log(`Looking up profile with ID ${profileId}`);
      const profile = this.profilesService.findOne(profileId);
      if (!profile) {
        this.logger.error(`Profile with ID ${profileId} not found`);
        throw new Error(`Profile with ID ${profileId} not found`);
      }
      this.logger.log(`Found profile. Text length: ${profile.input_text.length} characters`);

      // Generate embedding for the query
      this.logger.log(`Generating query embedding with OpenAI (model: text-embedding-3-large)`);
      const startTime = Date.now();
      const response = await this.openaiClient.embeddings.create({
        model: 'text-embedding-3-large',
        input: profile.input_text,
        encoding_format: 'float',
      });
      const embedTime = Date.now() - startTime;
      this.logger.log(`Query embedding generated in ${embedTime}ms`);

      const queryEmbedding = response.data[0].embedding;

      // Convert to numeric ID for search filter
      const numericId = parseInt(profile.user_id.replace(/\D/g, ''), 10) || 0;

      // Search Qdrant for similar vectors
      this.logger.log(`Searching Qdrant collection ${collectionName} for similar profiles`);
      const searchStartTime = Date.now();
      
      try {
        const searchResult = await this.qdrantClient.search(collectionName, {
          vector: queryEmbedding,
          limit: limit,
          with_payload: true,
          filter: numericId > 0 ? {
            must_not: [
              {
                key: 'user_id',
                match: { value: profile.user_id }
              }
            ]
          } : undefined
        });
        
        const searchTime = Date.now() - searchStartTime;
        this.logger.log(`Found ${searchResult.length} similar profiles in ${searchTime}ms`);
        
        // Log similarity scores for debugging
        searchResult.forEach((result, index) => {
          this.logger.verbose(`Match ${index+1}: ID ${result.id}, Score: ${result.score.toFixed(4)}`);
        });

        return {
          success: true,
          message: `Found ${searchResult.length} similar profiles`,
          profileId,
          collectionName,
          timing: {
            embedding: embedTime,
            search: searchTime,
            total: embedTime + searchTime
          },
          results: searchResult
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
} 