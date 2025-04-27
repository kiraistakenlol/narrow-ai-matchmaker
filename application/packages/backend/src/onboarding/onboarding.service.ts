import { Injectable, Inject, Logger, InternalServerErrorException, NotFoundException, BadRequestException, GoneException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingSession, OnboardingStatus } from './entities/onboarding-session.entity';
import { IAudioStorageService } from '@backend/audio-storage/audio-storage.interface';
import { InitiateOnboardingRequestDto, InitiateOnboardingResponseDto } from './dto/initiate-onboarding.dto';
import { NotifyUploadRequestDto } from './dto/notify-upload.dto';
import { OnboardingStatusResponseDto } from './dto/notify-upload.dto';
import { UserService } from '@backend/users/users.service';
import { ProfileService } from '@backend/profiles/profiles.service';
import { EventService } from '@backend/events/events.service';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        @InjectRepository(OnboardingSession)
        private onboardingSessionRepository: Repository<OnboardingSession>,
        @Inject(IAudioStorageService)
        private audioStorageService: IAudioStorageService,
        private readonly userService: UserService,
        private readonly profileService: ProfileService,
        private readonly eventService: EventService,
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
                 profileId: 'temp',
                 participationId: 'temp',
                 status: OnboardingStatus.STARTED,
            });
            const initialSession = await this.onboardingSessionRepository.save(tempSession);

            const newProfile = await this.profileService.createInitialProfile(newUser.id, initialSession.id);
            const newParticipation = await this.eventService.createInitialParticipation(newUser.id, event.id, initialSession.id);

            initialSession.profileId = newProfile.id;
            initialSession.participationId = newParticipation.id;
            initialSession.status = OnboardingStatus.AWAITING_AUDIO;

            const finalSession = await this.onboardingSessionRepository.save(initialSession);
            this.logger.log(`Created onboarding session: ${finalSession.id}`);

            const fileExtension = '.wav';
            const storageKey = `onboarding/${finalSession.id}/audio${fileExtension}`;
            const contentType = 'audio/wav';

            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );

            finalSession.audioStoragePath = storagePath;
            await this.onboardingSessionRepository.save(finalSession);


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