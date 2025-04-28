import { Injectable, Logger, InternalServerErrorException, NotFoundException, BadRequestException, GoneException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingSession, OnboardingStatus } from './entities/onboarding-session.entity';
import { S3AudioStorageService } from '@backend/audio-storage/s3-audio-storage.service';
import { InitiateOnboardingRequestDto, InitiateOnboardingResponseDto } from './dto/initiate-onboarding.dto';
import { NotifyUploadRequestDto, OnboardingStatusResponseDto } from './dto/notify-upload.dto';
import { UserService } from '@backend/users/users.service';
import { ProfileService } from '@backend/profiles/profiles.service';
import { EventService } from '@backend/events/events.service';
import { ContentExtractionService } from '@backend/content-extraction/content-extraction.service';

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
        private readonly contentExtractionService: ContentExtractionService,
    ) {}

    async initiateOnboarding(dto: InitiateOnboardingRequestDto): Promise<InitiateOnboardingResponseDto> {
        this.logger.log(`Initiating onboarding for event: ${dto.event_id}`);

        const event = await this.eventService.findEventById(dto.event_id);
        if (!event) {
            throw new NotFoundException(`Event with ID ${dto.event_id} not found.`);
        }

        try {
            // 1. Create User
            const newUser = await this.userService.createUnauthenticatedUser();
            this.logger.log(`Created new user: ${newUser.id}`);

            // 2. Create initial Profile
            const newProfile = await this.profileService.createInitialProfile(newUser.id);
            this.logger.log(`Created initial profile: ${newProfile.id}`);

            // 3. Create initial Event Participation
            const newParticipation = await this.eventService.createInitialParticipation(newUser.id, event.id, '');
            this.logger.log(`Created initial event participation: ${newParticipation.id}`);

            // 4. Create the Onboarding Session 
            const newOnboarding = await this.onboardingSessionRepository.save(
                this.onboardingSessionRepository.create({
                    eventId: event.id,
                    userId: newUser.id,
                    profileId: newProfile.id,
                    participationId: newParticipation.id,
                    status: OnboardingStatus.AWAITING_AUDIO
                })
            );
            this.logger.log(`Created onboarding session with ID: ${newOnboarding.id}`);

            // 5. Construct storage key using the session ID and new format
            const fileExtension = '.webm'; // New format
            const storageKey = `onboarding/${newOnboarding.id}/audio-initial${fileExtension}`;
            const contentType = 'audio/webm'; // New format

            // 6. Generate the presigned URL using the final storage key
            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );
            this.logger.log(`Generated pre-signed URL for session ${newOnboarding.id} at path: ${storagePath}`);

            // 7. Return response
            return {
                onboarding_id: newOnboarding.id,
                upload_url: uploadUrl,
                s3_key: storagePath,
            };

        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initiate onboarding session for event ${dto.event_id}: ${message}`, stack);
            throw new InternalServerErrorException('Failed to initiate onboarding session.');
        }
    }

    async notifyUploadComplete(onboardingId: string, dto: NotifyUploadRequestDto): Promise<OnboardingStatusResponseDto> {
        this.logger.log(`Received upload notification for session: ${onboardingId}, key: ${dto.s3_key}`);

        const session = await this.onboardingSessionRepository.findOne({
             where: { id: onboardingId },
             relations: ['profile', 'eventParticipation'],
        });

        if (!session) {
            throw new NotFoundException(`Onboarding session with ID ${onboardingId} not found.`);
        }
        if (!session.profile || !session.eventParticipation) {
            this.logger.error(`Session ${onboardingId} is missing required profile or eventParticipation relation.`);
            throw new InternalServerErrorException('Incomplete session data.');
        }

        if (session.expiresAt && session.expiresAt < new Date()) {
             this.logger.warn(`Upload notification received for expired session: ${onboardingId}`);
             throw new GoneException(`Onboarding session ${onboardingId} has expired.`);
        }

        // Construct the expected storage key based on session ID and new format
        const fileExtension = '.webm'; // New format
        const expectedStorageKey = `onboarding/${session.id}/audio-initial${fileExtension}`;

        if (session.status !== OnboardingStatus.AWAITING_AUDIO) {
             this.logger.warn(`Upload notification received for session ${onboardingId} not awaiting audio (status: ${session.status}). Processing will not be re-triggered.`);
             // Even if not awaiting audio, check if the key matches what we *would* expect
             if (expectedStorageKey !== dto.s3_key) {
                this.logger.error(`CRITICAL: Storage key mismatch for completed/failed session ${onboardingId}. Expected: ${expectedStorageKey}, Received: ${dto.s3_key}`);
             }
             return { status: session.status };
        }

        // Check the received key against the dynamically constructed expected key
        if (expectedStorageKey !== dto.s3_key) {
             this.logger.error(`Storage key mismatch for session ${onboardingId}. Expected: ${expectedStorageKey}, Received: ${dto.s3_key}`);
             throw new BadRequestException(`Invalid storage key provided.`);
        }

        session.status = OnboardingStatus.AUDIO_UPLOADED;

        try {
            await this.onboardingSessionRepository.save(session);
            this.logger.log(`Updated session ${onboardingId} status to ${OnboardingStatus.AUDIO_UPLOADED}`);

            this._processAudioInBackground(session.id, dto.s3_key);

            return { status: session.status };

        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to update session ${onboardingId} status after upload notification: ${message}`, stack);
            throw new InternalServerErrorException('Failed to process upload notification.');
        }
    }

    private async _processAudioInBackground(sessionId: string, s3_key: string): Promise<void> {
        this.logger.log(`Starting background audio processing for session: ${sessionId}`);
        let session: OnboardingSession | null = null;

        try {
            session = await this.onboardingSessionRepository.findOne({
                where: { id: sessionId },
                relations: ['profile', 'eventParticipation'],
            });

            const storageKey = s3_key;

            // Check session and relations exist
            if (!session || !session.profile || !session.eventParticipation) {
                 throw new Error(`Session ${sessionId} or required relations not found for background processing.`);
            }

            session.status = OnboardingStatus.PROCESSING;
            await this.onboardingSessionRepository.save(session);
            this.logger.log(`Updated session ${sessionId} status to ${OnboardingStatus.PROCESSING}`);

            const profileSchema = { type: 'object', properties: { name: { type: 'string' }, interests: { type: 'array', items: { type: 'string' } } }, required: ['name'] };
            const eventContextSchema = { type: 'object', properties: { goals: { type: 'array', items: { type: 'string' } }, availability: { type: 'string' } }, required: ['goals'] };
            const profileInstructions = "Extract the user's name and key interests mentioned in the audio.";
            const eventInstructions = "Extract the user's goals for this specific event and their general availability mentioned.";

            // Use the dynamically constructed storageKey for content extraction
            const extractedProfileData = await this.contentExtractionService.extractStructuredData(
                storageKey,
                profileSchema,
                profileInstructions
            );

            const extractedEventData = await this.contentExtractionService.extractStructuredData(
                storageKey,
                eventContextSchema,
                eventInstructions
            );

            session.profile.data = extractedProfileData;
            session.eventParticipation.contextData = extractedEventData;

            await this.profileService.save(session.profile);
            await this.eventService.save(session.eventParticipation);
            this.logger.log(`Updated profile and event participation data for session ${sessionId} via services.`);

            session.status = OnboardingStatus.COMPLETED;
            await this.onboardingSessionRepository.save(session);
            this.logger.log(`Updated session ${sessionId} status to ${OnboardingStatus.COMPLETED}`);

            this.logger.log(`Successfully finished background audio processing for session: ${sessionId}`);

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown processing error';
            this.logger.error(`Background audio processing failed for session ${sessionId}: ${message}`, error instanceof Error ? error.stack : undefined);

            if (session) {
                try {
                    const currentSession = await this.onboardingSessionRepository.findOneBy({ id: sessionId });
                    if (currentSession) {
                         currentSession.status = OnboardingStatus.FAILED;
                         await this.onboardingSessionRepository.save(currentSession);
                         this.logger.log(`Updated session ${sessionId} status to ${OnboardingStatus.FAILED}`);
                    }
                } catch (saveError) {
                    this.logger.error(`Failed to update session ${sessionId} status to FAILED after processing error: ${saveError}`);
                }
            }
        }
    }
}