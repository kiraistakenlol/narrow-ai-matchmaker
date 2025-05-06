import { OnboardingStatus } from './onboarding-status.enum.js';

export interface OnboardingSessionDto {
    id: string;
    eventId: string | null; // Keep nullable as per entity
    status: OnboardingStatus;
    createdAt: string; // Use string for ISO date format
    updatedAt: string; // Use s tring for ISO date format
} 