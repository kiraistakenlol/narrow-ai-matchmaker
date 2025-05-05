import { Controller, Post, Body, HttpCode, HttpStatus, ValidationPipe, Param, ParseUUIDPipe, Logger, Get, Query, NotFoundException, Req } from '@nestjs/common';
import { Request } from 'express';
import { OnboardingService } from './onboarding.service';
import { 
    InitiateOnboardingRequestDto, 
    InitiateOnboardingResponseDto, 
    OnboardingSessionDto, 
    PresignedUrlResponseDto, 
    OnboardingDto,
} from '@narrow-ai-matchmaker/common';
import { NotifyUploadRequestDto, OnboardingStatusResponseDto } from './dto/notify-upload.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CognitoIdTokenPayload } from '../common/types/auth.types';
import { IsOptional, IsUUID, validate } from 'class-validator';

class GetMyOnboardingQueryDto {
    @IsUUID()
    @IsOptional()
    event_id?: string;
}

@Controller('onboarding')
export class OnboardingController {
    private readonly logger = new Logger(OnboardingController.name);
    constructor(private readonly onboardingService: OnboardingService) {}

    @Post('initiate')
    @HttpCode(HttpStatus.CREATED)
    async initiate(
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
        dto: InitiateOnboardingRequestDto,
        @CurrentUser() currentUser?: CognitoIdTokenPayload
    ): Promise<InitiateOnboardingResponseDto> {
        const externalUserId = currentUser?.sub;
        this.logger.log(`Initiate request received. Event ID: ${dto.event_id || '[None]'}. External User ID: ${externalUserId || '[Anonymous]'}`);
        
        return this.onboardingService.initiate(dto.event_id, externalUserId);
    }

    @Get()
    async getCurrentUserOnboarding(
        @CurrentUser() user?: CognitoIdTokenPayload,
        @Req() request?: Request
    ): Promise<OnboardingDto> {
        let sessionDto: OnboardingSessionDto | null = null;
        let eventIdQuery: string | undefined = undefined;

        if (request?.query) {
            const queryDto = new GetMyOnboardingQueryDto();
            queryDto.event_id = request.query.event_id as string | undefined;
            
            const errors = await validate(queryDto);
            if (errors.length > 0) {
                this.logger.warn(`Invalid query parameters received: ${JSON.stringify(request.query)}`, errors);
            } else {
                eventIdQuery = queryDto.event_id;
            }
        }

        if (user) {
            const externalUserId = user.sub;
            this.logger.log(`Fetching latest onboarding session/guidance for external user ${externalUserId}` + (eventIdQuery ? ` for event ${eventIdQuery}` : ''));
            const session = await this.onboardingService.findLatestUserOnboardingSessionByExternalId(externalUserId, eventIdQuery);
            if (session) {
                sessionDto = {
                    id: session.id,
                    eventId: session.eventId,
                    status: session.status,
                    createdAt: session.createdAt.toISOString(),
                    updatedAt: session.updatedAt.toISOString(),
                };
            }
        } else {
            this.logger.log('Fetching onboarding guidance for anonymous user.');
        }
        
        const hardcodedHints = [
            "Hint 1: Tell us about your background.",
            "Hint 2: What are your main goals?",
            "Hint 3: Mention any specific skills."
        ];
        const guidance = { hints: hardcodedHints };

        const onboardingDto = new OnboardingDto(sessionDto, guidance);
        return onboardingDto;
    }

    @Post(':onboarding_id/audio-upload-url')
    @HttpCode(HttpStatus.OK)
    async getSubsequentAudioUploadUrl(
        @Param('onboarding_id', ParseUUIDPipe) onboardingId: string,
    ): Promise<PresignedUrlResponseDto> {
        this.logger.log(`Request for subsequent audio upload URL for onboarding ID: ${onboardingId}`);
        return this.onboardingService.requestSubsequentAudioUploadUrl(onboardingId);
    }

    @Post(':onboarding_id/notify-upload')
    @HttpCode(HttpStatus.OK)
    async notifyUpload(
        @Param('onboarding_id', ParseUUIDPipe) onboardingId: string,
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
        dto: NotifyUploadRequestDto,
    ): Promise<OnboardingStatusResponseDto> {
        this.logger.log(`Notify upload request for onboarding ID: ${onboardingId}`);
        return this.onboardingService.processAudio(onboardingId, dto.s3_key);
    }
} 