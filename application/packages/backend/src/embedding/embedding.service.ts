import { Injectable, Logger, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

// Simple hash function to generate numeric ID from string if needed by Qdrant for point IDs
// Qdrant can use UUIDs (strings) directly for point IDs, so hashing might not be strictly necessary
// but let's keep it if we want to ensure numeric IDs for some reason or follow the example closely.
function hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash); // Ensure positive for Qdrant (uint64)
}

@Injectable()
export class EmbeddingService implements OnModuleInit {
    private readonly logger = new Logger(EmbeddingService.name);
    private readonly qdrantClient: QdrantClient;
    private readonly openaiClient: OpenAI;
    private readonly vectorSize = 3072; // For text-embedding-3-large
    private readonly collectionName = 'profiles'; // Hardcoded as per plan

    constructor(private readonly configService: ConfigService) {
        const qdrantUrl = this.configService.get<string>('QDRANT_URL');
        if (!qdrantUrl) {
            throw new Error('QDRANT_URL environment variable is not configured');
        }
        
        this.qdrantClient = new QdrantClient({ url: qdrantUrl });
        
        const openAiApiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!openAiApiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not configured');
        }
        
        this.openaiClient = new OpenAI({
            apiKey: openAiApiKey,
        });
    }

    async onModuleInit() {
        this.logger.log('Ensuring Qdrant collection exists on module initialization...');
        await this.ensureCollectionExists(this.collectionName);
    }

    async ensureCollectionExists(collectionName: string): Promise<boolean> {
        try {
            this.logger.log(`Checking if collection '${collectionName}' exists.`);
            const collections = await this.qdrantClient.getCollections();
            const exists = collections.collections.some(collection => collection.name === collectionName);

            if (exists) {
                this.logger.log(`Collection '${collectionName}' already exists.`);
                const collectionInfo = await this.qdrantClient.getCollection(collectionName);
                const currentVectorSize = collectionInfo.config?.params?.vectors?.size;
                if (currentVectorSize !== this.vectorSize) {
                    this.logger.error(
                        `Collection '${collectionName}' exists but has WRONG vector size: ${currentVectorSize} (expected ${this.vectorSize}). ` +
                        `Please delete and recreate it manually or ensure it matches the configuration.`
                    );
                    return false; // Indicates a critical misconfiguration
                }
                return true;
            }

            this.logger.log(`Collection '${collectionName}' does not exist. Creating it...`);
            await this.qdrantClient.createCollection(collectionName, {
                vectors: {
                    size: this.vectorSize,
                    distance: 'Cosine',
                },
            });
            this.logger.log(`Successfully created collection '${collectionName}'.`);
            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during collection check/creation';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Error checking/creating Qdrant collection '${collectionName}': ${errorMessage}`, errorStack);
            throw new InternalServerErrorException(`Could not ensure Qdrant collection '${collectionName}' exists.`);
        }
    }

    async embedAndStoreProfile(profileId: string, rawProfileDescription: string): Promise<void> {
        this.logger.log(`Embedding and storing profile ID: ${profileId}`);
        try {
            if (!rawProfileDescription || rawProfileDescription.trim() === '') {
                this.logger.warn(`Raw profile description for profile ID ${profileId} is empty. Skipping embedding.`);
                return;
            }

            const collectionExists = await this.ensureCollectionExists(this.collectionName);
            if (!collectionExists) {
                throw new InternalServerErrorException(`Qdrant collection '${this.collectionName}' is not ready or misconfigured.`);
            }

            this.logger.log(`Generating embedding for profile ID: ${profileId}`);
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-large',
                input: rawProfileDescription,
                encoding_format: 'float',
            });
            const embedding = response.data[0]?.embedding;

            if (!embedding) {
                throw new InternalServerErrorException('Failed to generate embedding from OpenAI.');
            }
            this.logger.log(`Embedding generated for profile ID: ${profileId}`);

            // Using profileId directly as Qdrant point ID (Qdrant supports UUID strings)
            // const pointId = hashCode(profileId); // Or use hash if numeric IDs preferred
            const pointId = profileId; 

            await this.qdrantClient.upsert(this.collectionName, {
                wait: true, // Wait for operation to complete
                points: [
                    {
                        id: pointId,
                        vector: embedding,
                        payload: { 
                            originalProfileId: profileId, // Storing for clarity, though id is profileId
                            raw_input_snippet: rawProfileDescription.substring(0, 200) // For quick checks in Qdrant UI
                        },
                    },
                ],
            });
            this.logger.log(`Successfully upserted profile ID '${profileId}' into Qdrant collection '${this.collectionName}'.`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during profile embedding/storage';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to embed and store profile ID ${profileId}: ${errorMessage}`, errorStack);
            // Don't rethrow if this is called from a background process like onboarding where failure shouldn't stop the whole flow
            // But for direct calls, rethrowing might be appropriate.
            // For now, just logging the error, as per plan for onboarding integration.
            // throw new InternalServerErrorException(`Could not embed and store profile ${profileId}.`);
        }
    }

    async embedText(text: string): Promise<number[] | null> {
        this.logger.log(`Generating embedding for provided text (length: ${text.length}).`);
        if (!text || text.trim() === '') {
            this.logger.warn('Text for embedding is empty. Returning null.');
            return null;
        }
        try {
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-large',
                input: text,
                encoding_format: 'float',
            });
            const embedding = response.data[0]?.embedding;
            if (!embedding) {
                this.logger.error('OpenAI did not return an embedding for the text.');
                return null;
            }
            this.logger.log('Successfully generated embedding for text.');
            return embedding;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during text embedding';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to generate embedding for text: ${errorMessage}`, errorStack);
            // Depending on usage, might want to throw or return null.
            // For findTopMatches, returning null is probably better to signal an issue.
            return null; 
        }
    }

    async getProfileVector(profileId: string): Promise<number[] | null> {
        this.logger.log(`Retrieving vector for profile ID: ${profileId}`);
        const collectionExists = await this.ensureCollectionExists(this.collectionName);
        if (!collectionExists) {
            this.logger.error(`Qdrant collection '${this.collectionName}' is not ready for vector retrieval.`);
            // Or throw, but for this use case, returning null might be handled by the caller
            return null; 
        }

        try {
            // Qdrant point ID is the profileId itself in our current setup
            // Attempting with client.retrieve as getPoints might not be available/correct
            const pointsResponse = await this.qdrantClient.retrieve(this.collectionName, {
                ids: [profileId],
                with_vector: true,
            });

            if (pointsResponse.length > 0 && pointsResponse[0].vector) {
                this.logger.log(`Vector found for profile ID: ${profileId}`);
                return pointsResponse[0].vector as number[]; // Cast based on expectation
            } else {
                this.logger.warn(`No vector found in Qdrant for profile ID: ${profileId}`);
                return null;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error retrieving vector';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to retrieve vector for profile ID ${profileId}: ${errorMessage}`, errorStack);
            return null; // Return null on error to be handled by the caller
        }
    }

    async findSimilarProfiles(
        vector: number[], 
        limit: number = 5, 
        excludeProfileId?: string
    ): Promise<Array<{ id: string; score: number; payload?: Record<string, any> }>> {
        this.logger.log(`Finding similar profiles. Limit: ${limit}, Exclude ID: ${excludeProfileId || 'None'}`);
        if (!vector || vector.length === 0) {
            this.logger.warn('Input vector for similarity search is empty. Returning empty array.');
            return [];
        }

        const collectionExists = await this.ensureCollectionExists(this.collectionName);
        if (!collectionExists) {
            this.logger.error(`Qdrant collection '${this.collectionName}' is not ready for search.`);
            throw new InternalServerErrorException(`Collection '${this.collectionName}' not available for search.`);
        }

        try {
            const searchRequest: any = {
                vector: vector,
                limit: limit,
                with_payload: true, // We need the payload to get originalProfileId
            };

            if (excludeProfileId) {
                searchRequest.filter = {
                    must_not: [
                        {
                            key: 'originalProfileId', // Assuming this field is in your payload
                            match: { value: excludeProfileId },
                        },
                    ],
                };
            }

            const searchResult = await this.qdrantClient.search(this.collectionName, searchRequest);
            
            this.logger.log(`Found ${searchResult.length} similar profiles from Qdrant.`);
            // Qdrant typically returns points with id, score, payload, vector (optional)
            // We map to the expected return type.
            return searchResult.map(point => ({
                id: point.id.toString(), // Ensure ID is string, Qdrant might return number/string depending on original
                score: point.score,
                payload: point.payload as Record<string, any> | undefined,
            }));

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during similarity search';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Similarity search failed: ${errorMessage}`, errorStack);
            throw new InternalServerErrorException('Could not perform similarity search.');
        }
    }

    async deleteAllPointsFromCollection(collectionName: string): Promise<{ operationStatus: string, pointsDeleted: number | string } > {
        this.logger.warn(`Attempting to delete ALL points from Qdrant collection: ${collectionName}`);
        const collectionExists = await this.ensureCollectionExists(collectionName);
        if (!collectionExists) {
            const msg = `Qdrant collection '${collectionName}' does not exist or is not ready. Cannot delete points.`;
            this.logger.error(msg);
            // Depending on desired strictness, could throw an error or return a specific status
            return { operationStatus: 'failed_collection_not_ready', pointsDeleted: 0 }; 
        }

        try {
            // To delete all points, we can use a filter that effectively matches everything, 
            // or if the client supports a more direct "clear collection" that keeps the schema, that'd be better.
            // The Qdrant documentation suggests deleting points with a filter that matches all, 
            // or deleting and recreating the collection if schema persistence isn't an issue.
            // For now, let's use a filter that matches all points by omitting specific conditions.
            // A more robust way might be to scroll through all IDs and delete by batches if "delete all" isn't direct.
            // However, an empty filter for `delete` usually means "delete all points".
            
            // Simpler approach: Delete and recreate the collection. This ensures it's clean and has the right schema.
            // This is often safer than trying to construct a filter that truly matches all possible points.
            this.logger.log(`Deleting collection '${collectionName}' to clear all points.`);
            await this.qdrantClient.deleteCollection(collectionName);
            this.logger.log(`Collection '${collectionName}' deleted. Recreating...`);
            await this.ensureCollectionExists(collectionName); // This will recreate it with the correct schema
            
            this.logger.log(`Successfully cleared all points from collection '${collectionName}' by delete and recreate.`);
            return { operationStatus: 'completed', pointsDeleted: 'all (collection recreated)' };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error deleting points';
            const errorStack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to delete all points from collection ${collectionName}: ${errorMessage}`, errorStack);
            // throw new InternalServerErrorException(`Could not delete points from ${collectionName}.`);
            return { operationStatus: 'error', pointsDeleted: 0 };
        }
    }
} 