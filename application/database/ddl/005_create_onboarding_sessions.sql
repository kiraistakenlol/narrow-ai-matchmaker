CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "eventId" UUID NULL,
    "userId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    status TEXT NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_onboarding_sessions_event
        FOREIGN KEY("eventId") 
        REFERENCES events(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_onboarding_sessions_user
        FOREIGN KEY("userId") 
        REFERENCES users(id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_onboarding_sessions_profile 
        FOREIGN KEY("profileId") 
        REFERENCES profiles(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_onboarding_sessions_profile_id UNIQUE ("profileId")
);