import { IsNotEmpty, IsString } from 'class-validator';
import { OnboardingStatus } from '../entities/onboarding-session.entity';

export class NotifyUploadRequestDto {
    @IsString()
    @IsNotEmpty()
    s3_key: string;
}

export class OnboardingStatusResponseDto {
    status: OnboardingStatus;
} 