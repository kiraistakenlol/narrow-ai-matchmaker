import { Controller, Post, Body, HttpCode, HttpStatus, ValidationPipe, Param, ParseUUIDPipe, Logger, Get, Query, NotFoundException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { InitiateOnboardingRequestDto, InitiateOnboardingResponseDto } from './dto/initiate-onboarding.dto';
import { NotifyUploadRequestDto, OnboardingStatusResponseDto } from './dto/notify-upload.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CognitoIdTokenPayload } from '../common/types/auth.types';
import { OnboardingSessionDto } from '@narrow-ai-matchmaker/common';
import { IsOptional, IsUUID } from 'class-validator';

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
        @CurrentUser() currentUser: CognitoIdTokenPayload,
        @Query(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })) 
        query: GetMyOnboardingQueryDto
    ): Promise<OnboardingSessionDto> {
        const externalUserId = currentUser.sub;
        
        this.logger.log(`Fetching latest onboarding session for external user ${externalUserId}` + (query.event_id ? ` for event ${query.event_id}` : ''));
        const session = await this.onboardingService.findLatestUserOnboardingSessionByExternalId(externalUserId, query.event_id);
        
        if (!session) {
            throw new NotFoundException('No matching onboarding session found for the current user.');
        }

        const sessionDto: OnboardingSessionDto = {
            id: session.id,
            eventId: session.eventId,
            status: session.status,
            createdAt: session.createdAt.toISOString(),
            updatedAt: session.updatedAt.toISOString(),
        };

        return sessionDto;
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