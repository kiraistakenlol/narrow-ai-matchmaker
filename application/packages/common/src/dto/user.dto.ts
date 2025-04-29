import { IsUUID, IsEmail } from 'class-validator';

/**
 * Basic Data Transfer Object for User information.
 */
export class UserDto {
    @IsUUID()
    id!: string;

    @IsEmail()
    email!: string;
} 