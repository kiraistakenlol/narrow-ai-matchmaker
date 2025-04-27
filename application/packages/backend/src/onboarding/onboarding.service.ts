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
import { Profile } from '@backend/profiles/entities/profile.entity';
import { EventParticipation } from '@backend/events/entities/event-participation.entity';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        private audioStorageService: S3AudioStorageService,
        @InjectRepository(OnboardingSession)
        private onboardingSessionRepository: Repository<OnboardingSession>,
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        @InjectRepository(EventParticipation)
        private eventParticipationRepository: Repository<EventParticipation>,
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
            const newUser = await this.userService.createUnauthenticatedUser();

            const tempSession = this.onboardingSessionRepository.create({
                 eventId: event.id,
                 userId: newUser.id,
                 profileId: 'placeholder-profile-id',
                 participationId: 'placeholder-participation-id',
                 status: OnboardingStatus.STARTED,
            });
            const initialSession = await this.onboardingSessionRepository.save(tempSession);
            this.logger.log(`Created initial onboarding session: ${initialSession.id}`);

            const newProfile = await this.profileService.createInitialProfile(newUser.id);
            const newParticipation = await this.eventService.createInitialParticipation(newUser.id, event.id, initialSession.id);

            initialSession.profileId = newProfile.id;
            initialSession.participationId = newParticipation.id;
            initialSession.status = OnboardingStatus.AWAITING_AUDIO;

            const fileExtension = '.wav';
            const storageKey = `onboarding/${initialSession.id}/audio${fileExtension}`;
            const contentType = 'audio/wav';

            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );

            initialSession.audioStoragePath = storagePath;

            const finalSession = await this.onboardingSessionRepository.save(initialSession);
            this.logger.log(`Updated onboarding session ${finalSession.id} with profile/participation IDs and audio path.`);

            return {
                onboarding_id: finalSession.id,
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

        if (session.status !== OnboardingStatus.AWAITING_AUDIO) {
             this.logger.warn(`Upload notification received for session ${onboardingId} not awaiting audio (status: ${session.status}). Processing will not be re-triggered.`);
             return { status: session.status };
        }

        if (session.audioStoragePath !== dto.s3_key) {
             this.logger.error(`Storage key mismatch for session ${onboardingId}. Expected: ${session.audioStoragePath}, Received: ${dto.s3_key}`);
             throw new BadRequestException(`Invalid storage key provided.`);
        }

        session.status = OnboardingStatus.AUDIO_UPLOADED;

        try {
            await this.onboardingSessionRepository.save(session);
            this.logger.log(`Updated session ${onboardingId} status to ${OnboardingStatus.AUDIO_UPLOADED}`);

            this._processAudioInBackground(session.id);

            return { status: session.status };

        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to update session ${onboardingId} status after upload notification: ${message}`, stack);
            throw new InternalServerErrorException('Failed to process upload notification.');
        }
    }

    private async _processAudioInBackground(sessionId: string): Promise<void> {
        this.logger.log(`Starting background audio processing for session: ${sessionId}`);
        let session: OnboardingSession | null = null;

        try {
            session = await this.onboardingSessionRepository.findOne({
                where: { id: sessionId },
                relations: ['profile', 'eventParticipation'],
            });

            if (!session || !session.profile || !session.eventParticipation || !session.audioStoragePath) {
                 throw new Error(`Session ${sessionId} or required data not found for background processing.`);
            }

            session.status = OnboardingStatus.PROCESSING;
            await this.onboardingSessionRepository.save(session);
            this.logger.log(`Updated session ${sessionId} status to ${OnboardingStatus.PROCESSING}`);

            const profileSchema = { type: 'object', properties: { name: { type: 'string' }, interests: { type: 'array', items: { type: 'string' } } }, required: ['name'] };
            const eventContextSchema = { type: 'object', properties: { goals: { type: 'array', items: { type: 'string' } }, availability: { type: 'string' } }, required: ['goals'] };
            const profileInstructions = "Extract the user's name and key interests mentioned in the audio.";
            const eventInstructions = "Extract the user's goals for this specific event and their general availability mentioned.";

            const extractedProfileData = await this.contentExtractionService.extractStructuredData(
                session.audioStoragePath,
                profileSchema,
                profileInstructions
            );

            const extractedEventData = await this.contentExtractionService.extractStructuredData(
                session.audioStoragePath,
                eventContextSchema,
                eventInstructions
            );

            session.profile.data = extractedProfileData;
            session.eventParticipation.contextData = extractedEventData;

            await this.profileRepository.save(session.profile);
            await this.eventParticipationRepository.save(session.eventParticipation);
            this.logger.log(`Updated profile and event participation data for session ${sessionId}`);

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