import { IsUUID, IsOptional } from 'class-validator';

export class CreateOnboardingRequestDto {
    @IsUUID()
    @IsOptional()
    event_id?: string;
}