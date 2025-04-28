-- DDL for creating the event_participations table

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE event_participations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,    -- Foreign key to users table
    "eventId" UUID NOT NULL,   -- Foreign key to events table
    "contextData" JSONB NULL DEFAULT '{}', -- Corresponds to context_data
    "completenessScore" FLOAT NULL DEFAULT 0.0, -- Corresponds to completeness_score
    "joinedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Corresponds to joined_at
    "embeddingUpdatedAt" TIMESTAMP WITH TIME ZONE NULL, -- Corresponds to embedding_updated_at
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Corresponds to created_at
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Corresponds to updated_at

    CONSTRAINT fk_event_participations_user
        FOREIGN KEY("userId") 
        REFERENCES users(id)
        ON DELETE CASCADE, -- Or SET NULL / RESTRICT

    CONSTRAINT fk_event_participations_event
        FOREIGN KEY("eventId") 
        REFERENCES events(id)
        ON DELETE CASCADE, -- Or SET NULL / RESTRICT

    -- Add unique constraint for user+event combination
    CONSTRAINT uq_event_participations_user_event UNIQUE ("userId", "eventId")
);
