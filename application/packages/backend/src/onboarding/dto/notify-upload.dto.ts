import { OnboardingStatus } from '@narrow-ai-matchmaker/common';
import { IsNotEmpty, IsString } from 'class-validator';

export class NotifyUploadRequestDto {
    @IsString()
    @IsNotEmpty()
    s3_key: string;
}

export class OnboardingStatusResponseDto {
    status: OnboardingStatus;
} 