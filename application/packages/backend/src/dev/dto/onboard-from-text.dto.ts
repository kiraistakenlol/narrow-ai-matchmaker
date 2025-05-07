import { IsNotEmpty, IsString } from 'class-validator';

export class OnboardFromTextDto {
    @IsNotEmpty()
    @IsString()
    text: string;
} 