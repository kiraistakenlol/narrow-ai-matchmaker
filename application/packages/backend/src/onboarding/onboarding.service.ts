import { Injectable, Inject, Logger, InternalServerErrorException, NotFoundException, BadRequestException, GoneException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OnboardingSession, OnboardingStatus } from './entities/onboarding-session.entity';
import { IAudioStorageService } from '@backend/audio-storage/audio-storage.interface';
import { InitiateOnboardingRequestDto, InitiateOnboardingResponseDto } from './dto/initiate-onboarding.dto';
import { NotifyUploadRequestDto } from './dto/notify-upload.dto';
import { OnboardingStatusResponseDto } from './dto/notify-upload.dto';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        @InjectRepository(OnboardingSession)
        private onboardingSessionRepository: Repository<OnboardingSession>,
        @Inject(IAudioStorageService)
        private audioStorageService: IAudioStorageService,
    ) {}

    async initiateOnboarding(dto: InitiateOnboardingRequestDto): Promise<InitiateOnboardingResponseDto> {
        this.logger.log(`Initiating onboarding for event: ${dto.event_id}`);

        try {
            // --- Simulate creation of linked entities ---
            const placeholderUserId = uuidv4();
            const placeholderProfileId = uuidv4();
            const placeholderParticipationId = uuidv4();
            this.logger.log(`Placeholder IDs: User=${placeholderUserId}, Profile=${placeholderProfileId}, Participation=${placeholderParticipationId}`);
            // --- End Simulation ---

            const newSession = this.onboardingSessionRepository.create({
                eventId: dto.event_id,
                userId: placeholderUserId,
                profileId: placeholderProfileId,
                participationId: placeholderParticipationId,
                status: OnboardingStatus.AWAITING_AUDIO,
            });

            const savedSession = await this.onboardingSessionRepository.save(newSession);
            this.logger.log(`Created onboarding session: ${savedSession.id}`);

            const fileExtension = '.wav';
            const storageKey = `onboarding/${savedSession.id}/audio${fileExtension}`;
            const contentType = 'audio/wav';

            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );

            savedSession.audioStoragePath = storagePath;
            await this.onboardingSessionRepository.save(savedSession);


            return {
                onboarding_id: savedSession.id,
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

        const session = await this.onboardingSessionRepository.findOneBy({ id: onboardingId });

        if (!session) {
            throw new NotFoundException(`Onboarding session with ID ${onboardingId} not found.`);
        }

        if (session.expiresAt && session.expiresAt < new Date()) {
             this.logger.warn(`Upload notification received for expired session: ${onboardingId}`);
             throw new GoneException(`Onboarding session ${onboardingId} has expired.`);
        }

        if (session.status !== OnboardingStatus.AWAITING_AUDIO) {
             this.logger.warn(`Upload notification received for session ${onboardingId} not awaiting audio (status: ${session.status}). Might be duplicate or out of order.`);
             return { status: session.status };
        }

        if (session.audioStoragePath !== dto.s3_key) {
             this.logger.error(`Storage key mismatch for session ${onboardingId}. Expected: ${session.audioStoragePath}, Received: ${dto.s3_key}`);
             throw new BadRequestException(`Invalid storage key provided.`);
        }

        session.status = OnboardingStatus.AUDIO_UPLOADED;

        try {
            await this.onboardingSessionRepository.save(session);
            this.logger.log(`Updated session ${onboardingId} status to ${session.status}`);

            return { status: session.status };

        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to update session ${onboardingId} after upload notification: ${message}`, stack);
            throw new InternalServerErrorException('Failed to process upload notification.');
        }
    }
} 