import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class InitiateOnboardingRequestDto {
    @IsUUID()
    @IsNotEmpty()
    event_id: string;

    @IsString()
    @IsNotEmpty()
    initial_context: string;
}

export class InitiateOnboardingResponseDto {
    onboarding_id: string;
    upload_url: string;
    s3_key: string;
    context: string;
} 