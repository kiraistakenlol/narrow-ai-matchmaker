import { Injectable, Logger, InternalServerErrorException, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { S3AudioStorageService } from '@backend/audio-storage/s3-audio-storage.service';
import { OnboardingStatus, PresignedUrlResponseDto } from '@narrow-ai-matchmaker/common';
import { UserService } from '@backend/users/users.service';
import { ProfileService } from '@backend/profiles/profiles.service';
import { EventService } from '@backend/events/events.service';
import { Event } from '@backend/events/entities/event.entity';
import { ProfileValidationService } from '../profile-validation/profile-validation.service';
import { User } from '@backend/users/entities/user.entity';
import { ITranscriptionService } from '../transcription/transcription.interface';
import { MatchesService } from '../matches/matches.service';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        private audioStorageService: S3AudioStorageService,
        @InjectRepository(OnboardingSession)
        private onboardingSessionRepository: Repository<OnboardingSession>,
        private readonly userService: UserService,
        private readonly profileService: ProfileService,
        private readonly eventService: EventService,
        @Inject('ITranscriptionService')
        private readonly transcriptionService: ITranscriptionService,
        private readonly profileValidationService: ProfileValidationService,
        private readonly matchesService: MatchesService,
    ) {}

    async create(eventId?: string, externalUserId?: string): Promise<OnboardingSession> {
        let event: Event | null = null;
        if (eventId) {
            this.logger.log(`Initiating onboarding for specific event: ${eventId}`);
            event = await this.eventService.findEventById(eventId);
            if (!event) {
                throw new NotFoundException(`Event with ID ${eventId} not found.`);
            }
            this.logger.log(`Using event ${event.id} (${event.name}) for onboarding.`);
        }
        
        const user = externalUserId 
            ? await this.userService.getByExternalId(externalUserId)
            : await this.userService.createUnauthenticatedUser();

        const profile = await this.profileService.findProfileByUserId(user.id) || 
            await this.profileService.createInitialProfile(user.id);

        const onboarding = await this.onboardingSessionRepository.save(
            this.onboardingSessionRepository.create({
                eventId: event?.id,
                userId: user.id,
                profileId: profile.id,
                status: OnboardingStatus.STARTED
            })
        );
        this.logger.log(`Created onboarding session ID: ${onboarding.id} (Event: ${event?.id ?? 'None'})`);

        try {
            const fileExtension = '.webm';
            const storageKey = `onboarding/${onboarding.id}/audio-initial${fileExtension}`;
            const contentType = 'audio/webm';

            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );
            this.logger.log(`Generated pre-signed URL for session ${onboarding.id}`);

            return onboarding;
        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            const eventContext = event ? `Event: ${event.id}` : 'No Event Context';
            this.logger.error(`Failed to initiate onboarding session (${eventContext}, User: ${externalUserId || '[New User]'}): ${message}`, stack);
            throw new InternalServerErrorException('Failed to initiate onboarding session.');
        }
    }

    async processAudio(onboardingId: string, s3_key: string): Promise<OnboardingSession> {
        this.logger.log(`Processing audio for onboarding: ${onboardingId}`);

        const onboarding = await this.onboardingSessionRepository.findOneBy({ id: onboardingId });

        if (!onboarding) {
            this.logger.error(`Onboarding session with ID ${onboardingId} not found.`);
            throw new NotFoundException(`Onboarding session ${onboardingId} not found.`);
        }
        
        let user: User | null = null;
        
        try {
            this.logger.log(`Starting transcription for onboarding ${onboardingId}, key: ${s3_key}`);
            const transcriptText = await this.transcriptionService.transcribeAudio(s3_key);
            this.logger.log(`Transcription completed for onboarding ${onboardingId}, transcript length: ${transcriptText?.length || 0}`);

            // Process profile update (always required)
            const updatedProfile = await this.profileService.processProfileUpdate(onboarding.userId, transcriptText);
            
            // Validate the updated profile data
            const validationResult = this.profileValidationService.validateProfile(updatedProfile.data);
            this.logger.log(`Profile validation for user ${onboarding.userId}: 
                score=${validationResult.completenessScore}, 
                isComplete=${validationResult.isComplete}, 
                hints=${validationResult.hints.join(' | ')}`);
            
            // Process event participation only if eventId exists
            if (onboarding.eventId) {
                this.logger.log(`Processing event participation update for event ${onboarding.eventId}`);
                 await this.eventService.processParticipationUpdate(onboarding.userId, onboarding.eventId, transcriptText);
            } else {
                 this.logger.log(`Skipping event participation update as no eventId is linked to session ${onboardingId}.`);
            }
            
            this.logger.log(`Updated profile data (and event participation if applicable) for onboarding ${onboardingId}`);
            
            // Determine the new status based on validation
            if (validationResult.isComplete) {
                onboarding.status = OnboardingStatus.COMPLETED;
                user = await this.userService.findById(onboarding.userId);
                if (user) {
                    user.onboardingComplete = true;
                    // Profile injection will happen after user and session are saved
                } else {
                    this.logger.error(`Could not find user ${onboarding.userId} to mark onboarding complete.`);
                }
            } else {
                onboarding.status = OnboardingStatus.NEEDS_MORE_INFO;
            }
            // Save both in a transaction if your setup supports it easily.
            // For simplicity here, save them sequentially.
            await this.onboardingSessionRepository.save(onboarding);
            if (user && user.onboardingComplete) {
                await this.userService.save(user);
                this.logger.log(`Marked user ${user.id} onboarding as complete.`);

                // Inject profile for matching after successful completion and save
                if (updatedProfile?.data?.raw_input && updatedProfile.id) { // Ensure raw_input and profile ID exist
                    this.logger.log(`User ${user.id} completed onboarding. Injecting profile ${updatedProfile.id} for matching.`);
                    // Intentionally not awaiting, or wrapping in a try-catch that doesn't rethrow,
                    // to prevent matching injection failure from breaking the onboarding flow.
                    this.matchesService.injectProfile(updatedProfile.id, updatedProfile.data.raw_input)
                        .catch(err => {
                            // Log error from injectProfile if any, but don't fail onboarding
                            const injectErrorMsg = err instanceof Error ? err.message : 'Unknown error during injectProfile call';
                            this.logger.error(`Error injecting profile ${updatedProfile.id} for matching after onboarding: ${injectErrorMsg}`, err instanceof Error ? err.stack : undefined);
                        });
                } else {
                    this.logger.warn(`Skipping profile injection for user ${user.id} due to missing raw_input or profile ID after onboarding.`);
                }
            }
            
            this.logger.log(`Updated session ${onboardingId} status to ${onboarding.status}`);
            
            // Re-fetch session
            const updatedSession = await this.onboardingSessionRepository.findOne({ where: { id: onboardingId } });
            if (!updatedSession) throw new InternalServerErrorException('Failed to reload session after update.');
            return updatedSession;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown processing error';
            this.logger.error(`Audio processing failed for session ${onboardingId}: ${message}`, error instanceof Error ? error.stack : undefined);
            
            // Attempt to update session status to failed
            try {
                 const currentSession = await this.onboardingSessionRepository.findOneBy({ id: onboardingId });
                 if (currentSession) {
                     currentSession.status = OnboardingStatus.FAILED;
                     await this.onboardingSessionRepository.save(currentSession);
                     this.logger.log(`Updated session ${onboardingId} status to ${OnboardingStatus.FAILED}`);
                 } 
            } catch (saveError) {
                 this.logger.error(`Failed to update session ${onboardingId} status to FAILED after processing error: ${saveError}`);
            }
            
            throw error; // Re-throw the original processing error
        }
    }

    async getAudioUploadUrl(onboardingId: string): Promise<PresignedUrlResponseDto> {
        this.logger.log(`Requesting subsequent audio upload URL for onboarding session: ${onboardingId}`);
        
        // Verify the session exists
        const onboarding = await this.onboardingSessionRepository.findOneBy({ id: onboardingId });
        if (!onboarding) {
            this.logger.error(`Onboarding session ${onboardingId} not found when requesting upload URL.`);
            throw new NotFoundException(`Onboarding session ${onboardingId} not found.`);
        }

        // Generate a unique key for the subsequent audio file
        // TODO: Refine key generation based on context tracking later
        const timestamp = Date.now();
        const fileExtension = '.webm'; // Assuming same format
        const storageKey = `onboarding/${onboardingId}/audio-extra-${timestamp}${fileExtension}`;
        const contentType = 'audio/webm';

        try {
            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );
            this.logger.log(`Generated subsequent pre-signed URL for session ${onboardingId} at path: ${storagePath}`);

            // Map to DTO (matches the service method return type directly)
            return {
                upload_url: uploadUrl,
                s3_key: storagePath,
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown S3 error';
            this.logger.error(`Failed to generate subsequent pre-signed URL for session ${onboardingId}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Failed to generate audio upload URL.');
        }
    }

    // New method to find the latest onboarding session for a user
    async findLatestUserOnboardingSession(userId: string, eventId?: string): Promise<OnboardingSession | null> {
        this.logger.log(`Finding latest onboarding session for user ${userId}` + (eventId ? ` and event ${eventId}` : ' (any event)'));
        
        const whereClause: any = { userId: userId };
        if (eventId) {
            whereClause.eventId = eventId;
        }

        try {
            const session = await this.onboardingSessionRepository.findOne({
                where: whereClause,
                order: { createdAt: 'DESC' } // Get the most recent session
            });
            
            if (session) {
                this.logger.log(`Found latest session ${session.id} created at ${session.createdAt}`);
            } else {
                 this.logger.log(`No onboarding session found for user ${userId}` + (eventId ? ` and event ${eventId}` : ''));
            }
            return session;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find onboarding session for user ${userId}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not retrieve onboarding session.');
        }
    }

    async findLatestUserOnboardingSessionByExternalId(externalUserId: string, eventId?: string): Promise<OnboardingSession | null> {
        this.logger.log(`Attempting to find user by external ID: ${externalUserId}`);
        // Get internal user ID first
        const user = await this.userService.findByExternalId(externalUserId); // Use find, as user might not exist
        if (!user) {
            this.logger.log(`No user found for external ID ${externalUserId}. Cannot find onboarding session.`);
            return null; // No user means no session
        }
        this.logger.log(`User found (internal ID: ${user.id}). Finding their latest session.`);
        // Call the existing method with the internal ID
        return this.findLatestUserOnboardingSession(user.id, eventId);
    }

    async findById(id: string): Promise<OnboardingSession | null> {
        this.logger.log(`Finding onboarding session by ID: ${id}`);
        try {
            return await this.onboardingSessionRepository.findOneBy({ id });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find onboarding session ${id}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException(`Could not retrieve onboarding session ${id}.`);
        }
    }

    async getById(id: string): Promise<OnboardingSession> {
        this.logger.log(`Getting onboarding session by ID: ${id}`);
        const session = await this.findById(id);
        if (!session) {
            this.logger.error(`Onboarding session with ID ${id} not found`);
            throw new NotFoundException(`Onboarding session with ID ${id} not found`);
        }
        return session;
    }
}