import { IsNotEmpty, IsUUID } from 'class-validator';

export class InitiateOnboardingRequestDto {
    @IsUUID()
    @IsNotEmpty()
    event_id: string;
}

export class InitiateOnboardingResponseDto {
    onboarding_id: string;
    upload_url: string;
    s3_key: string;
} 