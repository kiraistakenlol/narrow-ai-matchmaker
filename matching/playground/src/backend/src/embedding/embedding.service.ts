import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { QdrantClient, Schemas } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { ProfilesService } from '../profiles/profiles.service';
import { Profile } from 'narrow-ai-matchmaker-common'; // Import Profile interface
import * as fs from 'fs/promises'; // Added fs
import * as path from 'path'; // Added path
import { FullProfile, FullProfilesData } from '../../common/src/types/full-profile.types'; // Added FullProfilesData

// Interface for the expected structure of scenario JSON files
interface ScenarioFile {
  id: string;
  scenario: string;
  match_description: string;
  profiles: FullProfile[];
}

// Simple hash function to generate numeric ID from string
function hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    // Qdrant IDs are uint64, ensure non-negative integer within safe JS range
    return Math.abs(hash);
}

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

  async embedScenarioProfiles(scenarioId: string, collectionName: string) {
    const operationStartTime = Date.now();
    this.logger.log(`Starting embedding for scenario ${scenarioId} into collection ${collectionName}`);

    // 1. Ensure collection exists
    const collectionReady = await this.ensureCollectionExists(collectionName);
    if (!collectionReady) {
      throw new InternalServerErrorException(`Could not prepare collection '${collectionName}' for embeddings`);
    }

    // 2. Construct file path and read the scenario file
    const filePath = path.join(__dirname, '../../../../test_cases', `${scenarioId}.json`);
    let scenarioData: ScenarioFile;
    try {
      this.logger.log(`Reading scenario file: ${filePath}`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      scenarioData = JSON.parse(fileContent);
      this.logger.log(`Successfully read and parsed scenario file for ${scenarioId}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        this.logger.error(`Scenario file not found: ${filePath}`);
        throw new NotFoundException(`Scenario file not found for ID: ${scenarioId}`);
      } else {
        this.logger.error(`Failed to read or parse scenario file ${filePath}: ${error.message}`, error.stack);
        throw new InternalServerErrorException(`Failed to read/parse scenario file for ID: ${scenarioId}`);
      }
    }

    // 3. Validate profiles (expecting 2 signal profiles)
    if (!scenarioData.profiles || scenarioData.profiles.length === 0) {
         throw new InternalServerErrorException(`No profiles found in scenario file for ${scenarioId}.`);
    }
    // We proceed even if not exactly 2, but log a warning.
    if (scenarioData.profiles.length !== 2) {
        this.logger.warn(`Expected 2 profiles in scenario ${scenarioId}, but found ${scenarioData.profiles.length}. Proceeding anyway.`);
    }

    const pointsToUpsert = []; // Let type be inferred
    let profilesProcessed = 0;
    let openAiErrors = 0;
    let totalEmbedTime = 0;

    // 4. Process each profile
    for (let i = 0; i < scenarioData.profiles.length; i++) {
      const profile = scenarioData.profiles[i];
      const profileLogId = profile.id || `index-${i}`;

      if (!profile.raw_input) {
        this.logger.warn(`Profile ${profileLogId} in scenario ${scenarioId} has no raw_input. Skipping.`);
        continue;
      }

      try {
        // Generate embedding for raw_input
        this.logger.log(`Generating embedding for profile ${profileLogId} (Scenario ${scenarioId})`);
        const embedStartTime = Date.now();
        const response = await this.openaiClient.embeddings.create({
          model: 'text-embedding-3-large',
          input: profile.raw_input,
          encoding_format: 'float',
        });
        const embedding = response.data[0].embedding;
        const embedTime = Date.now() - embedStartTime;
        totalEmbedTime += embedTime;
        this.logger.log(`Embedding generated for ${profileLogId} in ${embedTime}ms`);

        // Prepare Qdrant point
        const targetStringId = `signal-${scenarioId}-${i + 1}`;
        const numericHashedId = hashCode(targetStringId); // Generate numeric ID from hash

        const payload = {
          scenarioId: scenarioId,
          originalProfileId: profile.id, // Store the original profile ID from the file
          source: 'scenario', // Indicate the source
          raw_input_snippet: profile.raw_input.substring(0, 100), // Optional: snippet for context
          signalId: targetStringId // Store the desired string ID in payload
        };

        pointsToUpsert.push({
          id: numericHashedId, // Use numeric ID generated from hash
          vector: embedding,
          payload: payload,
        });
        profilesProcessed++;

      } catch (openaiError) {
        this.logger.error(`Failed to generate embedding for profile ${profileLogId} (Scenario ${scenarioId}): ${openaiError.message}`, openaiError.stack);
        openAiErrors++;
        // Decide if one error should stop the whole process or just skip this profile
        // For now, we skip and report at the end.
      }
    }

    // 5. Upsert points to Qdrant if any were successfully processed
    let qdrantResult = null;
    let qdrantUpsertTime = 0;
    if (pointsToUpsert.length > 0) {
      this.logger.log(`Upserting ${pointsToUpsert.length} points for scenario ${scenarioId} into Qdrant collection: ${collectionName}`);
      const qdrantStartTime = Date.now();
      try {
        qdrantResult = await this.qdrantClient.upsert(collectionName, {
          wait: true,
          points: pointsToUpsert,
        });
        qdrantUpsertTime = Date.now() - qdrantStartTime;
        this.logger.log(`Qdrant upsert completed for scenario ${scenarioId} in ${qdrantUpsertTime}ms. Status: ${qdrantResult?.status}`);
      } catch (qdrantError) {
        this.logger.error(`Error during Qdrant upsert for scenario ${scenarioId}: ${qdrantError.message}`, qdrantError.stack);
        // If Qdrant fails, we should report it as a failure for the whole operation
        throw new InternalServerErrorException(`Failed to store vectors in Qdrant for scenario ${scenarioId}: ${qdrantError.message}`);
      }
    } else {
      this.logger.warn(`No points generated for scenario ${scenarioId}, nothing to upsert.`);
    }

    const operationTime = Date.now() - operationStartTime;
    const success = openAiErrors === 0 && profilesProcessed > 0; // Considered success if at least one processed without OpenAI errors

    return {
      success: success,
      message: `Scenario ${scenarioId}: Processed ${profilesProcessed} profiles. OpenAI errors: ${openAiErrors}. Upserted ${pointsToUpsert.length} points. Total time: ${operationTime}ms.`,
      scenarioId,
      collectionName,
      profilesFound: scenarioData.profiles.length,
      profilesProcessed,
      openAiErrors,
      pointsUpserted: pointsToUpsert.length,
      qdrantStatus: qdrantResult?.status,
      timing: {
        total: operationTime,
        embedding: totalEmbedTime,
        qdrantUpsert: qdrantUpsertTime
      }
    };
  }

  // Helper to delete and recreate collection
  private async resetCollection(collectionName: string): Promise<boolean> {
    this.logger.log(`Resetting collection '${collectionName}' by deleting and recreating.`);
    try {
      const collections = await this.qdrantClient.getCollections();
      const exists = collections.collections.some(collection => collection.name === collectionName);
      if (exists) {
          this.logger.log(`Collection '${collectionName}' exists. Deleting...`);
          await this.qdrantClient.deleteCollection(collectionName);
          this.logger.log(`Collection '${collectionName}' deleted.`);
      } else {
          this.logger.log(`Collection '${collectionName}' does not exist. Skipping deletion.`);
      }
      // Recreate using the standard ensure method
      return await this.ensureCollectionExists(collectionName);
    } catch (error) {
        this.logger.error(`Error resetting collection '${collectionName}': ${error.message}`, error.stack);
        return false;
    }
  }

  // Method to embed the entire base audience
  async embedBaseAudience(collectionName: string) {
      const operationStartTime = Date.now();
      this.logger.log(`Starting embedding for Base Audience into collection ${collectionName}`);

      // 1. Reset the collection
      const collectionReady = await this.resetCollection(collectionName);
      if (!collectionReady) {
        throw new InternalServerErrorException(`Failed to reset and prepare collection '${collectionName}'`);
      }

      // 2. Read base_audience.json
      const filePath = path.join(__dirname, '../../../../test_cases', 'base_audience.json');
      let baseData: FullProfilesData;
      try {
        this.logger.log(`Reading base audience file: ${filePath}`);
        const fileContent = await fs.readFile(filePath, 'utf-8');
        baseData = JSON.parse(fileContent);
        if (!baseData || !Array.isArray(baseData.profiles)) {
            throw new Error('Invalid format in base_audience.json');
        }
        this.logger.log(`Successfully read ${baseData.profiles.length} profiles from base audience.`);
      } catch (error) {
        if (error.code === 'ENOENT') {
            this.logger.error(`Base audience file not found: ${filePath}`);
            throw new NotFoundException(`Base audience file not found.`);
        } else {
            this.logger.error(`Failed to read or parse base audience file ${filePath}: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to read/parse base audience file.`);
        }
      }

      const allProfiles = baseData.profiles;
      if (allProfiles.length === 0) {
        this.logger.log('No profiles in base audience file to embed.');
        return { success: true, message: 'No profiles found in base_audience.json.', collectionName, pointsUpserted: 0 };
      }

      // 3. Batch process embeddings (using raw_input)
      const pointsToUpsert: Schemas['PointStruct'][] = []; // Correct type usage
      let openAiSuccessCount = 0;
      let openAiFailureCount = 0;
      let totalEmbedTime = 0;

      for (let i = 0; i < allProfiles.length; i += this.OPENAI_BATCH_SIZE) {
          const batchProfiles = allProfiles.slice(i, i + this.OPENAI_BATCH_SIZE);
          this.logger.log(`Processing base audience batch ${Math.floor(i / this.OPENAI_BATCH_SIZE) + 1}: Profiles ${i + 1} to ${Math.min(i + this.OPENAI_BATCH_SIZE, allProfiles.length)}`);
          
          // Filter profiles missing raw_input for this batch
          const validBatchProfiles = batchProfiles.filter(p => p.raw_input);
          const skippedCount = batchProfiles.length - validBatchProfiles.length;
          if (skippedCount > 0) {
              this.logger.warn(`Skipped ${skippedCount} profiles in batch due to missing raw_input.`);
          }
          if (validBatchProfiles.length === 0) continue; // Skip batch if no valid profiles

          const batchInputs = validBatchProfiles.map(p => p.raw_input as string); // Assert non-null
          
          try {
            const openaiStartTime = Date.now();
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-large',
                input: batchInputs,
                encoding_format: 'float',
            });
            const batchEmbedTime = Date.now() - openaiStartTime;
            totalEmbedTime += batchEmbedTime;
            this.logger.log(`OpenAI batch processed in ${batchEmbedTime}ms. Got ${response.data.length} embeddings.`);
            openAiSuccessCount += validBatchProfiles.length;
            
            // Prepare Qdrant points
            response.data.forEach((embeddingData, index) => {
                const profile = validBatchProfiles[index];
                const numericId = hashCode(profile.id); // Use hash of original ID
                const payload = {
                    originalProfileId: profile.id,
                    source: 'base',
                    raw_input_snippet: profile.raw_input!.substring(0, 100) // Use ! as we filtered nulls
                };
                pointsToUpsert.push({
                    id: numericId,
                    vector: embeddingData.embedding,
                    payload: payload,
                });
            });

          } catch (openaiError) {
              this.logger.error(`Error calling OpenAI batch API for base audience: ${openaiError.message}`, openaiError.stack);
              openAiFailureCount += validBatchProfiles.length;
          }
      }
      this.logger.log(`Base Audience OpenAI embedding generation complete. Success: ${openAiSuccessCount}, Failed: ${openAiFailureCount}. Total Embed Time: ${totalEmbedTime}ms`);

      // 4. Batch upsert points
      let qdrantResult = null;
      let qdrantUpsertTime = 0;
      if (pointsToUpsert.length > 0) {
          this.logger.log(`Upserting ${pointsToUpsert.length} base audience points into Qdrant collection: ${collectionName}`);
          const qdrantStartTime = Date.now();
          try {
              qdrantResult = await this.qdrantClient.upsert(collectionName, {
                  wait: true,
                  points: pointsToUpsert,
              });
              qdrantUpsertTime = Date.now() - qdrantStartTime;
              this.logger.log(`Qdrant batch upsert completed in ${qdrantUpsertTime}ms. Result status: ${qdrantResult.status}`);
          } catch (qdrantError) {
              this.logger.error(`Error during Qdrant batch upsert for base audience: ${qdrantError.message}`, qdrantError.stack);
              throw new InternalServerErrorException(`Failed to store base audience vectors in Qdrant: ${qdrantError.message}`);
          }
      } else {
          this.logger.warn('No base audience points were generated to upsert into Qdrant.');
      }

      const operationTime = Date.now() - operationStartTime;
      const success = openAiFailureCount === 0 && pointsToUpsert.length > 0;
      return {
          success: success,
          message: `Base Audience: Processed ${openAiSuccessCount} profiles. OpenAI errors: ${openAiFailureCount}. Upserted ${pointsToUpsert.length} points. Total time: ${operationTime}ms.`,
          collectionName,
          profilesInFile: allProfiles.length,
          profilesProcessed: openAiSuccessCount,
          openAiErrors: openAiFailureCount,
          pointsUpserted: pointsToUpsert.length,
          qdrantStatus: qdrantResult?.status,
          timing: {
              total: operationTime,
              embedding: totalEmbedTime,
              qdrantUpsert: qdrantUpsertTime
          }
      };
  }
} 