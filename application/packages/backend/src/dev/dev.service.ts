import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { EmbeddingService } from '../embedding/embedding.service';
import { ProfileService } from '../profiles/profiles.service';
import { MatchesService } from '../matches/matches.service';
import { UserService } from '../users/users.service';
import { ProfileValidationService } from '../profile-validation/profile-validation.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class DevService {
    private readonly logger = new Logger(DevService.name);

    constructor(
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly embeddingService: EmbeddingService,
        private readonly profileService: ProfileService,
        private readonly matchesService: MatchesService,
        private readonly userService: UserService,
        private readonly profileValidationService: ProfileValidationService,
    ) {}

    async cleanupDatabase(): Promise<{ message: string, truncatedTables: string[] }> {
        this.logger.warn('Attempting to cleanup database (TRUNCATE ALL TABLES)');
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();

            // Get all table names in the public schema
            const tables: { tablename: string }[] = await queryRunner.query(
                "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
            );

            const truncatedTables: string[] = [];
            // Filter out the migration table and build the truncate command
            const tablesToTruncate = tables
                .map(t => t.tablename)
                .filter(tableName => tableName !== 'typeorm_migrations'); // Exclude migrations table
            
            if (tablesToTruncate.length === 0) {
                this.logger.log('No user tables found to truncate.');
                return { message: 'No user tables found to truncate.', truncatedTables: [] };
            }
            
            const tableNamesString = tablesToTruncate.map(name => `\"public\".\"${name}\"`).join(', ');
            const truncateQuery = `TRUNCATE TABLE ${tableNamesString} RESTART IDENTITY CASCADE;`;

            this.logger.warn(`Executing: ${truncateQuery}`);
            await queryRunner.query(truncateQuery);
            truncatedTables.push(...tablesToTruncate);

            this.logger.log(`Successfully truncated tables: ${truncatedTables.join(', ')}`);
            return { message: 'Database cleanup successful.', truncatedTables };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Database cleanup failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw new Error(`Database cleanup failed: ${errorMessage}`); // Re-throw a generic error
        } finally {
            await queryRunner.release();
        }
    }

    async reindexAllProfiles(): Promise<{ message: string, profilesReindexed: number, errorsEncountered: number }> {
        this.logger.warn('[DEV] Starting re-indexing of all profiles into Qdrant...');
        let profilesReindexed = 0;
        let errorsEncountered = 0;

        try {
            // 1. Clear existing Qdrant points
            this.logger.log('Clearing existing points from Qdrant profile collection...');
            const deleteResult = await this.embeddingService.deleteAllPointsFromCollection('profiles');
            this.logger.log(`Qdrant collection clear result: ${deleteResult.operationStatus}`);
            if (!['completed', 'failed_collection_not_ready'].includes(deleteResult.operationStatus)) { 
                // Only throw if it's an unexpected error, not if collection was just missing
                 throw new Error(`Failed to clear Qdrant collection: ${deleteResult.operationStatus}`);
            }

            // 2. Fetch all profiles from the database
            this.logger.log('Fetching all profiles from database...');
            const allProfiles = await this.profileService.findAllWithData();
            this.logger.log(`Found ${allProfiles.length} profiles to re-index.`);

            // 3. Iterate and inject each profile
            for (const profile of allProfiles) {
                if (profile.id && profile.data?.raw_input) {
                    try {
                        // Call injectProfile (which handles embedding + upsert)
                        // We await here to process sequentially, could be parallelized with Promise.all for performance if needed
                        await this.matchesService.injectProfile(profile.id, profile.data.raw_input);
                        profilesReindexed++;
                    } catch (injectError) {
                        this.logger.error(`Error injecting profile ${profile.id} during re-index: ${injectError}`);
                        errorsEncountered++;
                    }
                } else {
                    this.logger.warn(`Skipping profile ${profile.id || '(no ID)'} due to missing ID or raw_input.`);
                    errorsEncountered++; // Count as an error/skipped item
                }
            }

            const message = `Re-indexing complete. Processed: ${allProfiles.length}, Successfully Re-indexed: ${profilesReindexed}, Errors/Skipped: ${errorsEncountered}.`;
            this.logger.log(message);
            return { message, profilesReindexed, errorsEncountered };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Re-indexing failed during overall process: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw new Error(`Re-indexing failed: ${errorMessage}`);
        }
    }

    async onboardUserFromText(text: string): Promise<{ 
        message: string, 
        userId: string, 
        profileId: string, 
        validationStatus: string 
    }> {
        this.logger.warn(`[DEV] Attempting to onboard new dummy user from text.`);
        
        let user: User;
        try {
            // Always create a new dummy user
            user = await this.userService.createUnauthenticatedUser();
            this.logger.log(`Created new dummy user ${user.id}`);

            // Get or create profile (will always be create for a new user)
            let profile = await this.profileService.findProfileByUserId(user.id);
            if (!profile) {
                profile = await this.profileService.createInitialProfile(user.id);
            }

            // Process profile update using the provided text
            this.logger.log(`Processing profile update for user ${user.id} / profile ${profile.id}`);
            const updatedProfile = await this.profileService.processProfileUpdate(user.id, text);

            // Validate the profile
            const validationResult = this.profileValidationService.validateProfile(updatedProfile.data);
            const validationStatus = validationResult.isComplete ? 'Complete' : `Needs Info (${validationResult.hints.join(', ')})`;
            this.logger.log(`Profile validation status: ${validationStatus}`);

            // Mark user as onboarded
            user.onboardingComplete = true;
            await this.userService.save(user);
            this.logger.log(`Marked user ${user.id} as onboarding complete.`);

            // Inject profile for matching
            if (updatedProfile?.data?.raw_input && updatedProfile.id) {
                this.logger.log(`Injecting profile ${updatedProfile.id} for matching.`);
                this.matchesService.injectProfile(updatedProfile.id, updatedProfile.data.raw_input)
                    .catch(err => {
                        this.logger.error(`Error during background profile injection for ${updatedProfile.id}: ${err}`)
                    });
            } else {
                this.logger.warn(`Skipping profile injection for user ${user.id} due to missing raw_input or profile ID.`);
            }

            return {
                message: `Successfully processed onboarding from text for new dummy user ${user.id}.`,
                userId: user.id,
                profileId: updatedProfile.id,
                validationStatus: validationStatus
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Onboarding user from text failed: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
            throw new Error(`Onboarding user from text failed: ${errorMessage}`);
        }
    }
} 