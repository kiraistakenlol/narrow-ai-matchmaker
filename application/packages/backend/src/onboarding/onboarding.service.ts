import { Injectable, Inject, Logger, InternalServerErrorException /*, NotFoundException */ } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingSession, OnboardingStatus } from './entities/onboarding-session.entity';
import { IAudioStorageService } from '@backend/audio-storage/audio-storage.interface';
import { InitiateOnboardingRequestDto, InitiateOnboardingResponseDto } from './dto/initiate-onboarding.dto';// import { ConfigService } from '@nestjs/config'; // Unused

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        @InjectRepository(OnboardingSession)
        private onboardingSessionRepository: Repository<OnboardingSession>,
        @Inject(IAudioStorageService)
        private audioStorageService: IAudioStorageService,
        // private configService: ConfigService, // Unused
    ) {}

    async initiateOnboarding(dto: InitiateOnboardingRequestDto): Promise<InitiateOnboardingResponseDto> {
        this.logger.log(`Initiating onboarding for event: ${dto.event_id}`);

        const newSession = this.onboardingSessionRepository.create({
            eventId: dto.event_id,
            status: OnboardingStatus.AWAITING_INITIAL_AUDIO,
            audioContexts: {
                [dto.initial_context]: { uploaded: false }
            },
        });

        try {
            const savedSession = await this.onboardingSessionRepository.save(newSession);
            this.logger.log(`Created onboarding session: ${savedSession.id}`);

            const fileExtension = '.wav';
            const storageKey = `onboarding/${savedSession.id}/${dto.initial_context}${fileExtension}`;
            const contentType = 'audio/wav';

            const { uploadUrl, storagePath } = await this.audioStorageService.generatePresignedUploadUrl(
                storageKey,
                contentType,
            );

            savedSession.audioContexts[dto.initial_context].storagePath = storagePath;
            await this.onboardingSessionRepository.save(savedSession);


            return {
                onboarding_id: savedSession.id,
                upload_url: uploadUrl,
                s3_key: storagePath,
                context: dto.initial_context,
            };

        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to initiate onboarding session for event ${dto.event_id}: ${message}`, stack);
            throw new InternalServerErrorException('Failed to initiate onboarding session.');
        }
    }
} 