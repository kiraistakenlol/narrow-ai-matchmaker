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
        groq: {
            apiKey: process.env.GROQ_API_KEY,
            modelName: process.env.GROQ_MODEL_NAME,
        }
    },
    vectorDb: {
        provider: process.env.VECTOR_DB_PROVIDER,
        qdrant: {
            url: process.env.QDRANT_URL,
            apiKey: process.env.QDRANT_API_KEY,
        },
    },
}); 