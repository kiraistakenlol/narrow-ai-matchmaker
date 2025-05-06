import { Controller, Post, Body, HttpCode, HttpStatus, ValidationPipe, Param, ParseUUIDPipe, Logger, Get, Query, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import {
    CreateOnboardingRequestDto,
    OnboardingSessionDto,
    PresignedUrlResponseDto,
    OnboardingDto,
    OnboardingGuidanceDto,
} from '@narrow-ai-matchmaker/common';
import { NotifyUploadRequestDto, OnboardingStatusResponseDto } from './dto/notify-upload.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CognitoIdTokenPayload } from '../common/types/auth.types';
import { ProfileService } from '../profiles/profiles.service';
import { ProfileValidationService } from '../profile-validation/profile-validation.service';
import { ProfileData } from '@narrow-ai-matchmaker/common';
import { UserService } from '../users/users.service';

@Controller('onboarding')
export class OnboardingController {
    private readonly logger = new Logger(OnboardingController.name);
    constructor(
        private readonly onboardingService: OnboardingService,
        private readonly profileService: ProfileService,
        private readonly profileValidationService: ProfileValidationService,
        private readonly userService: UserService,
    ) { }

    @Get('base-guidance')
    async getOnboardingSchema(): Promise<OnboardingGuidanceDto> {
        const validationResult = this.profileValidationService.validateProfile(null);
        return { hints: validationResult.hints } as OnboardingGuidanceDto;
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
        dto: CreateOnboardingRequestDto,
        @CurrentUser() currentUser?: CognitoIdTokenPayload
    ): Promise<OnboardingDto> {
        const externalUserId = currentUser?.sub;
        this.logger.log(` Event ID: ${dto.event_id || '[None]'}. External User ID: ${externalUserId || '[Anonymous]'}`);

        const onboarding = await this.onboardingService.create(dto.event_id, externalUserId);

        const validationResult = this.profileValidationService.validateProfile(null);

        const guidance = { hints: validationResult.hints };

        const sessionDto: OnboardingSessionDto = {
            id: onboarding.id,
            eventId: onboarding.eventId,
            status: onboarding.status,
            createdAt: onboarding.createdAt.toISOString(),
            updatedAt: onboarding.updatedAt.toISOString(),
        };

        return new OnboardingDto(sessionDto, guidance);
    }

    @Post(':onboarding_id/audio-upload-url')
    @HttpCode(HttpStatus.OK)
    async getAudioUploadUrl(
        @Param('onboarding_id', ParseUUIDPipe) onboardingId: string,
    ): Promise<PresignedUrlResponseDto> {
        this.logger.log(`Request for subsequent audio upload URL for onboarding ID: ${onboardingId}`);
        return this.onboardingService.requestSubsequentAudioUploadUrl(onboardingId);
    }

    @Post(':onboarding_id/notify-upload')
    @HttpCode(HttpStatus.OK)
    async notifyAudioUploaded(
        @Param('onboarding_id', ParseUUIDPipe) onboardingId: string,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
        dto: NotifyUploadRequestDto,
    ): Promise<OnboardingStatusResponseDto> {
        this.logger.log(`Notify upload request for onboarding ID: ${onboardingId}`);
        const response = await this.onboardingService.processAudio(onboardingId, dto.s3_key);
        console.log('response.status', response.status);
        return { status: response.status };
    }

    @Get(':onboarding_id')
    async getOnboardingById(
        @Param('onboarding_id', ParseUUIDPipe) onboardingId: string,
        @CurrentUser() cognitoUser?: CognitoIdTokenPayload
    ): Promise<OnboardingDto> {
        this.logger.log(`Fetching onboarding by ID: ${onboardingId}`);

        const onboarding = await this.onboardingService.findById(onboardingId);
        if (!onboarding) {
            throw new NotFoundException(`Onboarding session ${onboardingId} not found.`);
        }

        if (cognitoUser) {
            const user = await this.userService.findByExternalId(cognitoUser.sub);
            if (!user || user.id !== onboarding.userId) {
                throw new UnauthorizedException('You can only access your own onboarding sessions.');
            }
        }

        let profileData: ProfileData | null = null;
        if (onboarding.profileId) {
            const profile = await this.profileService.findProfileByUserId(onboarding.userId);
            if (profile) {
                profileData = profile.data;
            }
        }

        const validationResult = this.profileValidationService.validateProfile(profileData);
        const guidance = { hints: validationResult.hints };

        this.logger.log(`Onboarding status: ${onboarding.status}`);
        const sessionDto: OnboardingSessionDto = {
            id: onboarding.id,
            eventId: onboarding.eventId,
            status: onboarding.status,
            createdAt: onboarding.createdAt.toISOString(),
            updatedAt: onboarding.updatedAt.toISOString(),
        };

        return new OnboardingDto(sessionDto, guidance);
    }
} 