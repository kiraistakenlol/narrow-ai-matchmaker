import { ProfileData } from '../types/profile.types.js';

export class UserDto {
    id!: string;
    email!: string;
    onboardingComplete!: boolean;
    profile?: ProfileData | null; // Profile might be null initially
} 