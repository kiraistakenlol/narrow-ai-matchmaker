// --- ENUMS ---
export type VisitingStatus = string;
export type SkillLevel = string;

// --- INTERFACES ---
export interface HardSkillEntry {
    skill: string;
    level: SkillLevel | null;
}

export interface SoftSkillEntry {
    skill: string;
    level: SkillLevel | null;
}

export interface Organization {
    org_type: string | null;
    name: string | null;
    url: string | null;
    industries: string[];
}

export interface Engagement {
    type: string | null;
    commitment: string | null;
    work_mode: string | null;
}

export interface RoleSkills {
    hard: HardSkillEntry[];
    soft: SoftSkillEntry[];
}

export interface Role {
    organization: Organization;
    category: string | null;
    sub_category: string | null;
    title: string | null;
    seniority: string | null;
    engagement: Engagement;
    skills: RoleSkills;
    highlights: string[];
    active: boolean;
}

export interface EventGoals {
    looking_for: string[];
    offering: string[];
}

export interface EventContext {
    event_id: string;
    goals: EventGoals;
}

/**
 * Represents the structured data extracted for a user's profile.
 * This structure is stored within the 'data' JSONB column of the Profile entity.
 */
export interface ProfileData {
    raw_input: string | null;
    personal: {
        name: string | null;
        headline: string | null;
        visiting_status: VisitingStatus | null;
    };
    skills: {
        hard: HardSkillEntry[];
        soft: SoftSkillEntry[];
    };
    industries: string[];
    hobbies: string[];
    roles: Role[];
    extra_notes: string | null;
} 