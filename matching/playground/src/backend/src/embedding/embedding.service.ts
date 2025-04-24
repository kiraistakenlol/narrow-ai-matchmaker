import {Injectable, InternalServerErrorException, Logger, NotFoundException} from '@nestjs/common';
import {QdrantClient, Schemas} from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import * as fs from 'fs/promises'; // Added fs
import * as path from 'path'; // Added path
import {Profile, FullProfilesWithEmbeddings} from 'narrow-ai-matchmaker-common/src/types/full-profile.types';
import {v4 as uuidv4} from 'uuid'; // Import uuid

// Interface for the expected structure of scenario JSON files
interface ScenarioFile {
    id: string;
    scenario: string;
    match_description: string;
    profiles: Profile[];
    // Add embeddings to store generated embeddings
    embeddings?: {
        [profileId: string]: number[];
    };
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
    private readonly vectorSize = 3072;
    private readonly OPENAI_BATCH_SIZE = 100;

    constructor() {
        this.logger.log('Initializing embedding service');

        // Initialize Qdrant client
        this.logger.log('Connecting to Qdrant at http://localhost:6333');
        this.qdrantClient = new QdrantClient({url: 'http://localhost:6333'});

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

    async embedScenarioProfiles(scenarioId: string, collectionName: string) {
        const operationStartTime = Date.now();
        this.logger.log(`Starting embedding for scenario ${scenarioId} into collection ${collectionName}`);

        // 1. Ensure collection exists
        const collectionReady = await this.ensureCollectionExists(collectionName);
        if (!collectionReady) {
            throw new InternalServerErrorException(`Could not prepare collection '${collectionName}' for embeddings`);
        }

        // 2. Delete all existing scenario signals
        this.logger.log(`Deleting existing scenario signals from collection ${collectionName}`);
        try {
            await this.qdrantClient.delete(collectionName, {
                filter: {
                    must: [
                        {
                            key: 'source',
                            match: {value: 'scenario'}
                        }
                    ]
                },
                wait: true
            });
            this.logger.log(`Successfully deleted existing scenario signals from collection ${collectionName}`);
        } catch (error) {
            this.logger.error(`Failed to delete existing scenario signals: ${error.message}`, error.stack);
            // Continue with operation even if deletion fails
        }

        // 3. Construct file path and read the scenario file
        const filePath = path.join(__dirname, '../../../../test_cases', `${scenarioId}.json`);
        let scenarioData: ScenarioFile;
        let fileUpdated = false;

        try {
            this.logger.log(`Reading scenario file: ${filePath}`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            scenarioData = JSON.parse(fileContent);
            this.logger.log(`Successfully read and parsed scenario file for ${scenarioId}`);

            // Initialize embeddings object if it doesn't exist
            if (!scenarioData.embeddings) {
                scenarioData.embeddings = {};
            }
        } catch (error) {
            if (error.code === 'ENOENT') {
                this.logger.error(`Scenario file not found: ${filePath}`);
                throw new NotFoundException(`Scenario file not found for ID: ${scenarioId}`);
            } else {
                this.logger.error(`Failed to read or parse scenario file ${filePath}: ${error.message}`, error.stack);
                throw new InternalServerErrorException(`Failed to read/parse scenario file for ID: ${scenarioId}`);
            }
        }

        // 4. Validate profiles (expecting 2 signal profiles)
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
        let embeddingsFromFile = 0;
        let embeddingsGenerated = 0;

        // 5. Process each profile
        for (let i = 0; i < scenarioData.profiles.length; i++) {
            const profile = scenarioData.profiles[i];
            const profileLogId = profile.id || `index-${i}`;

            if (!profile.raw_input) {
                this.logger.warn(`Profile ${profileLogId} in scenario ${scenarioId} has no raw_input. Skipping.`);
                continue;
            }

            // Create consistent ID for the profile
            const targetStringId = `signal-${scenarioId}-${i + 1}`;
            const numericHashedId = hashCode(targetStringId);

            let embedding: number[];

            // Check if embedding already exists in the file
            if (scenarioData.embeddings[profileLogId]) {
                this.logger.log(`Using existing embedding for profile ${profileLogId} from file`);
                embedding = scenarioData.embeddings[profileLogId];
                embeddingsFromFile++;
            } else {
                try {
                    // Generate embedding for raw_input
                    this.logger.log(`Generating new embedding for profile ${profileLogId} (Scenario ${scenarioId})`);
                    const embedStartTime = Date.now();
                    const response = await this.openaiClient.embeddings.create({
                        model: 'text-embedding-3-large',
                        input: profile.raw_input,
                        encoding_format: 'float',
                    });
                    embedding = response.data[0].embedding;
                    const embedTime = Date.now() - embedStartTime;
                    totalEmbedTime += embedTime;
                    embeddingsGenerated++;
                    this.logger.log(`Embedding generated for ${profileLogId} in ${embedTime}ms`);

                    // Save embedding to the scenario file for future use
                    scenarioData.embeddings[profileLogId] = embedding;
                    fileUpdated = true;
                } catch (openaiError) {
                    this.logger.error(`Failed to generate embedding for profile ${profileLogId} (Scenario ${scenarioId}): ${openaiError.message}`, openaiError.stack);
                    openAiErrors++;
                    continue; // Skip this profile
                }
            }

            // Prepare Qdrant point
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
        }

        // Write updated scenario file with embeddings if any were generated
        if (fileUpdated) {
            try {
                this.logger.log(`Saving updated scenario file with embeddings: ${filePath}`);
                await fs.writeFile(filePath, JSON.stringify(scenarioData, null, 2), 'utf-8');
                this.logger.log(`Successfully saved embeddings to scenario file ${filePath}`);
            } catch (writeError) {
                this.logger.error(`Failed to write updated scenario file: ${writeError.message}`, writeError.stack);
                // Continue with operation even if file write fails
            }
        }

        // 6. Upsert points to Qdrant if any were successfully processed
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
            message: `Scenario ${scenarioId}: Processed ${profilesProcessed} profiles. OpenAI errors: ${openAiErrors}. Upserted ${pointsToUpsert.length} points. Used ${embeddingsFromFile} cached embeddings, generated ${embeddingsGenerated} new. Total time: ${operationTime}ms.`,
            scenarioId,
            collectionName,
            profilesFound: scenarioData.profiles.length,
            profilesProcessed,
            openAiErrors,
            pointsUpserted: pointsToUpsert.length,
            embeddingsFromFile,
            embeddingsGenerated,
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
        let baseData: FullProfilesWithEmbeddings;
        let fileUpdated = false;

        try {
            this.logger.log(`Reading base audience file: ${filePath}`);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            baseData = JSON.parse(fileContent);
            if (!baseData || !Array.isArray(baseData.profiles)) {
                throw new Error('Invalid format in base_audience.json');
            }
            this.logger.log(`Successfully read ${baseData.profiles.length} profiles from base audience.`);

            // Initialize embeddings object if it doesn't exist
            if (!baseData.embeddings) {
                baseData.embeddings = {};
            }
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
            return {
                success: true,
                message: 'No profiles found in base_audience.json.',
                collectionName,
                pointsUpserted: 0
            };
        }

        // 3. Batch process embeddings (using raw_input)
        const pointsToUpsert: Schemas['PointStruct'][] = []; // Correct type usage
        let openAiSuccessCount = 0;
        let openAiFailureCount = 0;
        let totalEmbedTime = 0;
        let embeddingsFromFile = 0;
        let embeddingsGenerated = 0;

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

            // Process each profile
            for (const profile of validBatchProfiles) {
                const profileLogId = profile.id;

                // Skip profiles without raw_input
                if (!profile.raw_input) continue;

                let embedding: number[];

                // Check if embedding already exists in the file
                if (baseData.embeddings[profileLogId]) {
                    this.logger.log(`Using existing embedding for profile ${profileLogId} from file`);
                    embedding = baseData.embeddings[profileLogId];
                    embeddingsFromFile++;

                    // Prepare Qdrant point with cached embedding
                    const numericId = hashCode(profile.id);
                    const payload = {
                        originalProfileId: profile.id,
                        source: 'base',
                        raw_input_snippet: profile.raw_input.substring(0, 100)
                    };

                    pointsToUpsert.push({
                        id: numericId,
                        vector: embedding,
                        payload: payload,
                    });

                    openAiSuccessCount++;
                } else {
                    // Need to generate new embedding
                    try {
                        this.logger.log(`Generating new embedding for profile ${profileLogId}`);
                        const embedStartTime = Date.now();
                        const response = await this.openaiClient.embeddings.create({
                            model: 'text-embedding-3-large',
                            input: profile.raw_input,
                            encoding_format: 'float',
                        });
                        embedding = response.data[0].embedding;
                        const embedTime = Date.now() - embedStartTime;
                        totalEmbedTime += embedTime;
                        this.logger.log(`Embedding generated for ${profileLogId} in ${embedTime}ms`);
                        embeddingsGenerated++;

                        // Save embedding to file for future use
                        baseData.embeddings[profileLogId] = embedding;
                        fileUpdated = true;

                        // Prepare Qdrant point
                        const numericId = hashCode(profile.id);
                        const payload = {
                            originalProfileId: profile.id,
                            source: 'base',
                            raw_input_snippet: profile.raw_input.substring(0, 100)
                        };

                        pointsToUpsert.push({
                            id: numericId,
                            vector: embedding,
                            payload: payload,
                        });

                        openAiSuccessCount++;
                    } catch (openaiError) {
                        this.logger.error(`Error generating embedding for profile ${profileLogId}: ${openaiError.message}`, openaiError.stack);
                        openAiFailureCount++;
                    }
                }
            }
        }

        this.logger.log(`Base Audience embedding complete. Success: ${openAiSuccessCount}, Failed: ${openAiFailureCount}. From file: ${embeddingsFromFile}, Generated: ${embeddingsGenerated}. Total Embed Time: ${totalEmbedTime}ms`);

        // Write updated file with embeddings if any were generated
        if (fileUpdated) {
            try {
                this.logger.log(`Saving updated base audience file with embeddings: ${filePath}`);
                await fs.writeFile(filePath, JSON.stringify(baseData, null, 2), 'utf-8');
                this.logger.log(`Successfully saved embeddings to base audience file`);
            } catch (writeError) {
                this.logger.error(`Failed to write updated base audience file: ${writeError.message}`, writeError.stack);
                // Continue with operation even if file write fails
            }
        }

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
            message: `Base Audience: Processed ${openAiSuccessCount} profiles. OpenAI errors: ${openAiFailureCount}. Upserted ${pointsToUpsert.length} points. Used ${embeddingsFromFile} cached embeddings, generated ${embeddingsGenerated} new. Total time: ${operationTime}ms.`,
            collectionName,
            profilesInFile: allProfiles.length,
            profilesProcessed: openAiSuccessCount,
            openAiErrors: openAiFailureCount,
            pointsUpserted: pointsToUpsert.length,
            embeddingsFromFile,
            embeddingsGenerated,
            qdrantStatus: qdrantResult?.status,
            timing: {
                total: operationTime,
                embedding: totalEmbedTime,
                qdrantUpsert: qdrantUpsertTime
            }
        };
    }

    /**
     * Removes all profiles from a collection except those marked as 'base'.
     * Uses the 'source' payload field for filtering.
     */
    async removeNonBaseProfiles(collectionName: string): Promise<{
        success: boolean,
        message: string,
        operation?: Schemas['UpdateResult']
    }> {
        this.logger.log(`Removing non-base profiles (source != 'base') from collection: ${collectionName}`);
        try {
            const filter: Schemas['Filter'] = {
                must_not: [
                    {
                        key: 'source', // Field in the payload
                        match: {value: 'base'},
                    },
                ],
            };

            const result = await this.qdrantClient.delete(collectionName, {
                filter: filter,
                wait: true, // Wait for the operation to complete
            });

            this.logger.log(`Delete operation status for non-base profiles: ${result.status}`);
            if (result.status === 'completed') {
                return {
                    success: true,
                    message: `Successfully submitted request to remove non-base profiles from ${collectionName}.`,
                    operation: result
                };
            } else {
                throw new Error(`Qdrant delete operation did not complete successfully: ${result.status}`);
            }
        } catch (error) {
            this.logger.error(`Error removing non-base profiles from ${collectionName}: ${error.message}`, error.stack);
            return {success: false, message: `Error removing non-base profiles: ${error.message}`};
        }
    }

    /**
     * Embeds a single profile based on its description and stores it in Qdrant.
     */
    async embedSingleProfile(collectionName: string, description: string): Promise<{
        success: boolean,
        message: string,
        profileId?: string,
        pointId?: number,
        timing?: { total: number, embedding: number, storage: number }
    }> {
        this.logger.log(`Embedding single profile in collection: ${collectionName}`);
        const overallStartTime = Date.now();
        try {
            // 1. Ensure collection exists
            const collectionReady = await this.ensureCollectionExists(collectionName);
            if (!collectionReady) {
                throw new Error(`Could not prepare collection '${collectionName}'`);
            }

            // 2. Generate a unique ID for this profile
            const profileId = uuidv4();
            this.logger.log(`Generated new profile ID: ${profileId}`);

            // 3. Generate embedding using OpenAI
            this.logger.log(`Generating embedding for new profile ${profileId}`);
            const embedStartTime = Date.now();
            const response = await this.openaiClient.embeddings.create({
                model: 'text-embedding-3-large',
                input: description,
                encoding_format: 'float',
            });
            const embedding = response.data[0].embedding;
            const embedTime = Date.now() - embedStartTime;
            this.logger.log(`Embedding generated in ${embedTime}ms`);

            // 4. Generate Qdrant point ID and payload
            const pointId = hashCode(profileId);
            const payload: Schemas['Payload'] = {
                originalProfileId: profileId,
                source: 'single', // Mark as a single, non-base profile
                raw_input_snippet: description.substring(0, 200), // Store snippet
            };

            // 5. Store embedding and payload in Qdrant
            this.logger.log(`Storing new profile ${profileId} (point ID ${pointId}) in Qdrant collection: ${collectionName}`);
            const qdrantStartTime = Date.now();
            const result = await this.qdrantClient.upsert(collectionName, {
                wait: true,
                points: [
                    {
                        id: pointId,
                        vector: embedding,
                        payload: payload,
                    },
                ],
            });
            const qdrantTime = Date.now() - qdrantStartTime;
            this.logger.log(`Vector stored in Qdrant in ${qdrantTime}ms`);

            if (result.status !== 'completed') {
                throw new Error(`Qdrant upsert operation failed: ${result.status}`);
            }
            const overallTime = Date.now() - overallStartTime;
            return {
                success: true,
                message: `Successfully embedded profile ${profileId}`,
                profileId,
                pointId,
                timing: {
                    total: overallTime,
                    embedding: embedTime,
                    storage: qdrantTime,
                }
            };

        } catch (error) {
            this.logger.error(`Error embedding single profile: ${error.message}`, error.stack);
            return {
                success: false,
                message: `Error embedding single profile: ${error.message}`,
            };
        }
    }
} 