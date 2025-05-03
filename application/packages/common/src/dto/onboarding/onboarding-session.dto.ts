import { OnboardingStatus } from './onboarding-status.enum';

export interface OnboardingSessionDto {
    id: string;
    eventId: string | null; // Keep nullable as per entity
    status: OnboardingStatus;
    createdAt: string; // Use string for ISO date format
    updatedAt: string; // Use string for ISO date format
} 