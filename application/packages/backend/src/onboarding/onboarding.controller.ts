import { Controller, Post, Body, HttpCode, HttpStatus, ValidationPipe } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { InitiateOnboardingRequestDto, InitiateOnboardingResponseDto } from './dto/initiate-onboarding.dto';

@Controller('onboarding')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) {}

    @Post('initiate')
    @HttpCode(HttpStatus.CREATED)
    async initiate(
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
        dto: InitiateOnboardingRequestDto,
    ): Promise<InitiateOnboardingResponseDto> {
        return this.onboardingService.initiateOnboarding(dto);
    }
} 