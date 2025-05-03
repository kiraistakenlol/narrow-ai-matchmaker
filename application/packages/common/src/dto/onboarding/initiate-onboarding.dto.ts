import { IsUUID, IsOptional } from 'class-validator';
// Import PresignedUrlResponseDto relatively within the common package
import { PresignedUrlResponseDto } from './presigned-url-response.dto'; 

export class InitiateOnboardingRequestDto {
    @IsUUID()
    @IsOptional()
    event_id?: string;
}

export interface InitiateOnboardingResponseDto {
    onboarding_id: string;
    upload_details: PresignedUrlResponseDto;
} 