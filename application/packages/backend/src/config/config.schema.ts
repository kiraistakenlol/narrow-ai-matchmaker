import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
    // Application
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    APP_HOST: Joi.string().default('localhost'),
    APP_PORT: Joi.number().default(3001),

    // Database (PostgreSQL)
    DB_HOST: Joi.string().required(),
    DB_PORT: Joi.number().default(5432),
    DB_USERNAME: Joi.string().required(),
    DB_PASSWORD: Joi.string().required(),
    DB_DATABASE: Joi.string().required(),

    // Audio Storage (S3 Only)
    AWS_S3_BUCKET_AUDIO: Joi.string().required(),

    // Transcription Service (AWS Only)
    AWS_REGION: Joi.string().required(),
    AWS_ACCESS_KEY_ID: Joi.string().optional(),
    AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
    AWS_TRANSCRIBE_OUTPUT_BUCKET: Joi.string().required(),
    AWS_TRANSCRIBE_ROLE_ARN: Joi.string().optional(),

    // LLM Provider
    LLM_PROVIDER: Joi.string().valid('openai', 'groq').default('groq'),
    OPENAI_API_KEY: Joi.string().when('LLM_PROVIDER', { is: 'openai', then: Joi.required() }),
    GROQ_API_KEY: Joi.string().when('LLM_PROVIDER', { is: 'groq', then: Joi.required() }),
    GROQ_MODEL_NAME: Joi.string().when('LLM_PROVIDER', { is: 'groq', then: Joi.required() }),
}); 