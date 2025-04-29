import { IsJWT, IsString, IsOptional } from 'class-validator';

export class LoginRequestDto {
    @IsJWT()
    id_token: string;

    @IsString()
    @IsOptional()
    state?: string | null;
} 