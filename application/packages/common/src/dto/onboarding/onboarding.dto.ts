import { OnboardingSessionDto } from './onboarding-session.dto.js';

export interface OnboardingGuidanceDto {
    hints: string[];
}

/**
 * Represents the combined state and guidance for the onboarding process.
 */
export class OnboardingDto {
    session: OnboardingSessionDto;
    guidance: OnboardingGuidanceDto;

    constructor(session: OnboardingSessionDto, guidance: OnboardingGuidanceDto) {
        this.session = session;
        this.guidance = guidance;
    }
} 