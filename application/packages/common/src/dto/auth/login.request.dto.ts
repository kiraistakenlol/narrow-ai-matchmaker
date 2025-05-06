import { IsJWT, IsOptional, IsUUID } from 'class-validator';

export class LoginRequestDto {
    @IsJWT()
    id_token!: string;

    @IsUUID()
    @IsOptional()
    onboarding_id?: string | null;
} 