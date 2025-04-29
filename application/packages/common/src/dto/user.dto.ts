import { ProfileData } from '../types/profile.types';

export class UserDto {
    id!: string;
    email!: string;
    profile?: ProfileData | null; // Profile might be null initially
} 