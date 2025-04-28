-- DDL for creating the onboarding_sessions table

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "eventId" UUID NOT NULL,         -- Foreign key to events
    "userId" UUID NOT NULL,          -- Foreign key to users
    "profileId" UUID NOT NULL,       -- Foreign key to profiles
    "participationId" UUID NOT NULL, -- Foreign key to event_participations
    status TEXT NOT NULL,          -- Corresponds to status (Consider ENUM type if values are fixed)
    -- audio_storage_path is removed as per decision
    "expiresAt" TIMESTAMP WITH TIME ZONE NULL, -- Corresponds to expires_at
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Corresponds to created_at
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Corresponds to updated_at

    CONSTRAINT fk_onboarding_sessions_event
        FOREIGN KEY("eventId") 
        REFERENCES events(id)
        ON DELETE CASCADE, -- Or SET NULL / RESTRICT

    CONSTRAINT fk_onboarding_sessions_user
        FOREIGN KEY("userId") 
        REFERENCES users(id)
        ON DELETE CASCADE, -- Or SET NULL / RESTRICT
    
    -- Profile FK: Consider ON DELETE SET NULL or RESTRICT if profile deletion shouldn't cascade from session
    CONSTRAINT fk_onboarding_sessions_profile 
        FOREIGN KEY("profileId") 
        REFERENCES profiles(id)
        ON DELETE RESTRICT, 

    -- Participation FK: Consider ON DELETE SET NULL or RESTRICT
    CONSTRAINT fk_onboarding_sessions_participation
        FOREIGN KEY("participationId") 
        REFERENCES event_participations(id)
        ON DELETE RESTRICT,

    -- Ensure profileId and participationId are unique as they are created by the session (1:1)
    CONSTRAINT uq_onboarding_sessions_profile_id UNIQUE ("profileId"),
    CONSTRAINT uq_onboarding_sessions_participation_id UNIQUE ("participationId")
);