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
    DB_SSL_ENABLED: Joi.string().valid('true', 'false').default('true'),

    // Audio Storage (S3 Only)
    AWS_S3_BUCKET_AUDIO: Joi.string().required(),

    // Transcription Service
    TRANSCRIPTION_PROVIDER: Joi.string().valid('aws', 'test').default('aws'),
    // AWS Transcription
    AWS_REGION: Joi.string().when('TRANSCRIPTION_PROVIDER', { is: 'aws', then: Joi.required() }),
    AWS_ACCESS_KEY_ID: Joi.string().when('TRANSCRIPTION_PROVIDER', { is: 'aws', then: Joi.required() }),
    AWS_SECRET_ACCESS_KEY: Joi.string().when('TRANSCRIPTION_PROVIDER', { is: 'aws', then: Joi.required() }),
    AWS_TRANSCRIBE_OUTPUT_BUCKET: Joi.string().when('TRANSCRIPTION_PROVIDER', { is: 'aws', then: Joi.required() }),
    AWS_TRANSCRIBE_ROLE_ARN: Joi.string().optional(),

    // LLM Provider
    LLM_PROVIDER: Joi.string().valid('openai', 'grok').default('grok'),
    OPENAI_API_KEY: Joi.string().when('LLM_PROVIDER', { is: 'openai', then: Joi.required() }),
    GROK_API_KEY: Joi.string().when('LLM_PROVIDER', { is: 'grok', then: Joi.required() }),
    GROK_MODEL_NAME: Joi.string().when('LLM_PROVIDER', { is: 'grok', then: Joi.required() }),

    // Add Cognito Vars
    COGNITO_USER_POOL_ID: Joi.string().required(),
    COGNITO_CLIENT_ID: Joi.string().required(),
    COGNITO_REGION: Joi.string().required()
}); 