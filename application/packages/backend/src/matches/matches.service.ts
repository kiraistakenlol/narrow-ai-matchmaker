import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MatchDto } from '@narrow-ai-matchmaker/common'; // This import might temporarily fail if common/index.ts is not fixed
import { EmbeddingService } from '../embedding/embedding.service'; // Import EmbeddingService
import { UserService } from '../users/users.service'; // Import UserService
import { ProfileService } from '@backend/profiles/profiles.service';
import { ContentSynthesisService } from '../content-synthesis/content-synthesis.service'; // Import ContentSynthesisService

@Injectable()
export class MatchesService {
    private readonly logger = new Logger(MatchesService.name); // Added logger

    constructor(
        private readonly embeddingService: EmbeddingService, 
        private readonly userService: UserService,
        private readonly profileService: ProfileService,
        private readonly contentSynthesisService: ContentSynthesisService // Inject ContentSynthesisService
    ) {}

    async injectProfile(profileId: string, rawProfileDescription: string): Promise<void> {
        this.logger.log(`Injecting profile for matching: ${profileId}`);
        try {
            await this.embeddingService.embedAndStoreProfile(profileId, rawProfileDescription);
            this.logger.log(`Successfully queued profile ${profileId} for embedding and storage.`);
        } catch (error) {
            // Log the error, but don't let it break the calling process (e.g., onboarding)
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during profile injection';
            this.logger.error(`Failed to inject profile ${profileId} for matching: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
        }
    }

    async findTopMatches(userId: string): Promise<MatchDto[]> {
        this.logger.log(`Attempting to find top matches for user: ${userId}`);

        // Fetch the user's profile first
        const user = await this.userService.findUserWithProfileById(userId);
        if (!user || !user.profile) {
            this.logger.warn(`User ${userId} has no profile. Cannot generate matches.`);
            return [];
        }
        
        this.logger.log(`Retrieving stored vector for profile ${user.profile.id}`);
        const currentUserVector = await this.embeddingService.getProfileVector(user.profile.id);

        if (!currentUserVector) {
            this.logger.warn(`Vector for user ${user.profile.id} not found in Qdrant. Cannot generate matches. User might need to complete onboarding or profile needs re-injection.`);
            return [];
        }
        this.logger.log(`Stored vector retrieved for user ${user.profile.id}. Searching for similar profiles.`);

        // The user ID in our system is the Profile ID for matching purposes
        const similarProfilePoints = await this.embeddingService.findSimilarProfiles(currentUserVector, 5, user.profile.id);

        if (!similarProfilePoints || similarProfilePoints.length === 0) {
            this.logger.log(`No similar profiles found for user ${userId}.`);
            return [];
        }

        this.logger.log(`Found ${similarProfilePoints.length} potential matches. Fetching details...`);
        const matches: MatchDto[] = [];

        for (const point of similarProfilePoints) {
            const matchedProfileId = typeof point.id === 'number' ? point.payload?.originalProfileId as string : point.id;
            if (!matchedProfileId) {
                this.logger.warn('Found a match from Qdrant without a usable profile ID in payload or ID itself.', point);
                continue;
            }

            if (matchedProfileId === userId) { // Double check exclusion, though filter should handle it
                this.logger.log(`Skipping self-match for user ${userId}`);
                continue;
            }

            try {
                const matchedProfile = await this.profileService.findProfileById(matchedProfileId);
                if (matchedProfile && matchedProfile.data?.personal?.name) {
                    
                    // Generate a more insightful reason
                    let matchReason = `Similarity score: ${point.score.toFixed(3)}`; // Default reason
                    if (user.profile?.data && matchedProfile.data) {
                        try {
                            const llmReason = await this.contentSynthesisService.generateMatchReason(
                                user.profile.data, 
                                matchedProfile.data
                            );
                            if (llmReason && llmReason.trim() !== '') {
                                matchReason = llmReason;
                            }
                        } catch (reasonError) {
                            this.logger.error(`Failed to generate LLM match reason for ${user.profile.id} and ${matchedProfileId}: ${reasonError}`);
                            // Fallback to similarity score if LLM reason fails
                        }
                    }
                    
                    matches.push({
                        userId: matchedProfile.userId, // userId from the matched Profile entity
                        name: matchedProfile.data.personal.name,
                        reason: matchReason,
                    });
                } else {
                    this.logger.warn(`Could not retrieve full profile or name for matched profile ID: ${matchedProfileId}`);
                }
            } catch (error) {
                // Handle cases where a profile ID from Qdrant might no longer exist or other errors
                 if (error instanceof NotFoundException) {
                    this.logger.warn(`Matched profile ID ${matchedProfileId} not found in user service: ${error.message}`);
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching matched user details';
                    this.logger.error(`Error fetching details for matched profile ID ${matchedProfileId}: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
                }
            }
        }
        this.logger.log(`Returning ${matches.length} formatted matches for user ${userId}.`);
        return matches;
    }
} 