export default () => ({
    nodeEnv: process.env.NODE_ENV,
    app: {
        host: process.env.APP_HOST,
        port: parseInt(process.env.APP_PORT, 10) || 3001,
    },
    database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
    },
    audioStorage: {
        s3Bucket: process.env.AWS_S3_BUCKET_AUDIO,
    },
    transcription: {
        aws: {
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            outputBucket: process.env.AWS_TRANSCRIBE_OUTPUT_BUCKET,
            roleArn: process.env.AWS_TRANSCRIBE_ROLE_ARN,
        },
    },
    llm: {
        provider: process.env.LLM_PROVIDER,
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
        },
        grok: {
            apiKey: process.env.GROK_API_KEY,
            modelName: process.env.GROK_MODEL_NAME,
        }
    },
    cognito: {
        userPoolId: process.env.COGNITO_USER_POOL_ID,
        clientId: process.env.COGNITO_CLIENT_ID,
        region: process.env.COGNITO_REGION,
    }
}); 