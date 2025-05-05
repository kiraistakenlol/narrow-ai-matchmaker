import { OnboardingSessionDto } from './onboarding-session.dto';

interface OnboardingGuidance {
    hints: string[];
}

/**
 * Represents the combined state and guidance for the onboarding process.
 */
export class OnboardingDto {
    session: OnboardingSessionDto | null;
    guidance: OnboardingGuidance;

    constructor(session: OnboardingSessionDto | null, guidance: OnboardingGuidance) {
        this.session = session;
        this.guidance = guidance;
    }
} 