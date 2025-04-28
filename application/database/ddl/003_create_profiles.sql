-- DDL for creating the profiles table

-- Ensure uuid-ossp extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "userId" UUID NOT NULL,    -- Foreign key to users table
    data JSONB NULL DEFAULT '{}', -- Corresponds to data, default empty JSONB
    "completenessScore" FLOAT NULL DEFAULT 0.0, -- Corresponds to completeness_score
    "embeddingUpdatedAt" TIMESTAMP WITH TIME ZONE NULL, -- Corresponds to embedding_updated_at
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Corresponds to created_at
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- Corresponds to updated_at

    CONSTRAINT fk_profiles_user
        FOREIGN KEY("userId") 
        REFERENCES users(id)
        ON DELETE CASCADE, -- Or SET NULL / RESTRICT depending on desired behavior

    -- Add unique constraint on userId to ensure one profile per user
    CONSTRAINT uq_profiles_user_id UNIQUE ("userId")
);
