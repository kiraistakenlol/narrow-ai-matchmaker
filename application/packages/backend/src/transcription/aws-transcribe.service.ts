import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    TranscribeClient,
    StartTranscriptionJobCommand,
    GetTranscriptionJobCommand,
    TranscriptionJobStatus as AwsJobStatus,
    LanguageCode,
    GetTranscriptionJobCommandOutput,
} from '@aws-sdk/client-transcribe';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from 'stream';
import { ITranscriptionService } from './transcription.interface';

@Injectable()
export class AwsTranscribeService implements ITranscriptionService {
    private readonly logger = new Logger(AwsTranscribeService.name);
    private readonly transcribeClient: TranscribeClient;
    private readonly s3Client: S3Client;
    private readonly outputBucket: string;
    private readonly audioBucket: string;
    private readonly region: string;
    private readonly maxPollingAttempts = 30; // 5 minutes with 10-second intervals
    private readonly pollingInterval = 10000; // 10 seconds

    constructor(private configService: ConfigService) {
        this.region = this.configService.get<string>('transcription.aws.region');
        const accessKeyId = this.configService.get<string>('transcription.aws.accessKeyId');
        const secretAccessKey = this.configService.get<string>('transcription.aws.secretAccessKey');
        this.outputBucket = this.configService.get<string>('transcription.aws.outputBucket');
        this.audioBucket = this.configService.get<string>('audioStorage.s3Bucket');

        if (!this.region || !this.outputBucket || !this.audioBucket) {
            throw new Error('AWS region, Transcribe output bucket, and audio storage bucket must be configured.');
        }

        const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

        this.transcribeClient = new TranscribeClient({ region: this.region, credentials });
        this.s3Client = new S3Client({ region: this.region, credentials });

        this.logger.log(`AwsTranscribeService initialized for region ${this.region}, output bucket ${this.outputBucket}, and audio bucket ${this.audioBucket}`);
    }

    /**
     * Transcribes audio from an S3 key and returns the transcript text.
     * This method handles the entire process including polling for completion.
     * 
     * @param s3Key The S3 key of the audio file to transcribe
     * @param languageCode The language code for transcription (defaults to English US)
     * @returns The transcript text
     */
    async transcribeAudio(s3Key: string, languageCode: LanguageCode | string = LanguageCode.EN_US): Promise<string> {
        this.logger.log(`Starting transcription for audio: ${s3Key}`);
        
        try {
            // Convert S3 key to S3 URI using the audio storage bucket, not the output bucket
            const s3Uri = `s3://${this.audioBucket}/${s3Key}`;
            this.logger.log(`Using S3 URI for transcription: ${s3Uri}`);
            
            // Generate a unique job name based on the S3 key
            const jobName = `transcript-${Date.now()}-${s3Key.replace(/[^a-zA-Z0-9]/g, '-')}`;
            
            // Start the transcription job
            const { jobId } = await this.startTranscription(s3Uri, jobName, languageCode);
            
            // Poll for completion and get the result
            const transcriptText = await this.pollForTranscriptionResult(jobId);
            
            this.logger.log(`Transcription completed for audio: ${s3Key}`);
    
            return transcriptText;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown transcription error';
            this.logger.error(`Failed to transcribe audio ${s3Key}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException(`Could not transcribe audio: ${message}`);
        }
    }

    /**
     * Starts a transcription job and returns the job ID.
     * This is an internal method used by transcribeAudio.
     */
    private async startTranscription(audioStorageUri: string, outputKey: string, languageCode: LanguageCode | string = LanguageCode.EN_US): Promise<{ jobId: string }> {
        const jobName = outputKey;
        this.logger.log(`Starting transcription job: ${jobName} for audio: ${audioStorageUri}`);

        const command = new StartTranscriptionJobCommand({
            TranscriptionJobName: jobName,
            LanguageCode: languageCode as LanguageCode,
            Media: {
                MediaFileUri: audioStorageUri,
            },
            OutputBucketName: this.outputBucket,
        });

        try {
            const result = await this.transcribeClient.send(command);
            const jobId = result.TranscriptionJob?.TranscriptionJobName;
            if (!jobId) {
                throw new Error('Transcription job started but did not return a Job Name.');
            }
            this.logger.log(`Transcription job ${jobId} started successfully.`);
            return { jobId };
        } catch (error) {
            this.logger.error(`Failed to start transcription job ${jobName}`, error);
            throw new InternalServerErrorException(`Could not start transcription job for ${outputKey}`);
        }
    }

    /**
     * Polls for the transcription result until completion or failure.
     * This is an internal method used by transcribeAudio.
     */
    private async pollForTranscriptionResult(jobId: string): Promise<string> {
        this.logger.log(`Polling for transcription result for job: ${jobId}`);
        
        for (let attempt = 1; attempt <= this.maxPollingAttempts; attempt++) {
            const status = await this.getTranscriptionStatus(jobId);
            
            if (status === 'COMPLETED') {
                const result = await this.getTranscriptionResult(jobId);
                if (!result) {
                    throw new Error(`Transcription job ${jobId} completed but result is null.`);
                }
                return result.transcript;
            } else if (status === 'FAILED') {
                throw new Error(`Transcription job ${jobId} failed.`);
            }
            
            this.logger.debug(`Transcription job ${jobId} status: ${status} (Attempt ${attempt}/${this.maxPollingAttempts})`);
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
        }
        
        throw new Error(`Transcription job ${jobId} did not complete after ${this.maxPollingAttempts} attempts.`);
    }

    /**
     * Gets the status of a transcription job.
     * This is an internal method used by pollForTranscriptionResult.
     */
    private async getTranscriptionStatus(jobId: string): Promise<string> {
        this.logger.debug(`Checking status for transcription job: ${jobId}`);
        const command = new GetTranscriptionJobCommand({ TranscriptionJobName: jobId });

        try {
            const result = await this.transcribeClient.send(command);
            const status = result.TranscriptionJob?.TranscriptionJobStatus;

            switch (status) {
                case AwsJobStatus.COMPLETED:
                    return 'COMPLETED';
                case AwsJobStatus.FAILED:
                    this.logger.warn(`Transcription job ${jobId} failed. Reason: ${result.TranscriptionJob?.FailureReason}`);
                    return 'FAILED';
                case AwsJobStatus.IN_PROGRESS:
                    return 'IN_PROGRESS';
                case AwsJobStatus.QUEUED:
                    return 'QUEUED';
                default:
                    this.logger.error(`Unknown transcription job status for ${jobId}: ${status}`);
                    throw new InternalServerErrorException(`Unknown job status: ${status}`);
            }
        } catch (error: any) {
            if (error.name === 'NotFoundException' || error.name === 'BadRequestException') {
                this.logger.error(`Transcription job ${jobId} not found.`);
                throw new NotFoundException(`Transcription job ${jobId} not found.`);
            }
            this.logger.error(`Failed to get status for transcription job ${jobId}`, error);
            throw new InternalServerErrorException(`Could not get status for transcription job ${jobId}`);
        }
    }

    /**
     * Gets the result of a completed transcription job.
     * This is an internal method used by pollForTranscriptionResult.
     */
    private async getTranscriptionResult(jobId: string): Promise<{ transcript: string } | null> {
        this.logger.log(`Fetching result for transcription job: ${jobId}`);
        const jobStatusCommand = new GetTranscriptionJobCommand({ TranscriptionJobName: jobId });

        let jobDetails: GetTranscriptionJobCommandOutput;
        try {
            jobDetails = await this.transcribeClient.send(jobStatusCommand);
            const status = jobDetails.TranscriptionJob?.TranscriptionJobStatus;

            if (status === AwsJobStatus.FAILED) {
                this.logger.warn(`Transcription job ${jobId} failed, cannot retrieve result. Reason: ${jobDetails.TranscriptionJob?.FailureReason}`);
                return null;
            }

            if (status !== AwsJobStatus.COMPLETED) {
                this.logger.warn(`Transcription job ${jobId} is not completed (status: ${status}). Cannot retrieve result yet.`);
                return null;
            }

            const transcriptUri = jobDetails.TranscriptionJob?.Transcript?.TranscriptFileUri;
            if (!transcriptUri) {
                this.logger.error(`Transcription job ${jobId} completed but TranscriptFileUri is missing.`);
                throw new InternalServerErrorException(`Transcript URI missing for completed job ${jobId}`);
            }

            // Extract S3 bucket and key from the URI
            const url = new URL(transcriptUri);
            if (url.protocol !== 'https:') {
                this.logger.error(`Unexpected transcript URI format for job ${jobId}: ${transcriptUri}`);
                throw new InternalServerErrorException(`Unexpected transcript URI format for job ${jobId}`);
            }
            
            const bucketName = this.outputBucket;
            const key = url.pathname.startsWith(`/${bucketName}/`)
                        ? url.pathname.substring(bucketName.length + 2)
                        : url.pathname.substring(1);

            this.logger.log(`Fetching transcript content from S3: bucket=${bucketName}, key=${key}`);

            const getObjectCommand = new GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });

            const s3Response = await this.s3Client.send(getObjectCommand);

            if (!s3Response.Body) {
                throw new InternalServerErrorException(`S3 response body is empty for transcript ${key}`);
            }

            const transcriptJson = await this.streamToString(s3Response.Body as Readable);
            const transcriptData = JSON.parse(transcriptJson);

            // Extract the full transcript text
            const fullTranscript = transcriptData.results?.transcripts?.[0]?.transcript;
            if (typeof fullTranscript !== 'string') {
                this.logger.error(`Could not find transcript text in S3 object content for job ${jobId}`);
                throw new InternalServerErrorException(`Invalid transcript content format for job ${jobId}`);
            }

            return { transcript: fullTranscript };

        } catch (error: any) {
            if (error.name === 'NotFoundException' || error.name === 'BadRequestException' && !jobDetails) {
                this.logger.error(`Transcription job ${jobId} not found when trying to get result.`);
                throw new NotFoundException(`Transcription job ${jobId} not found.`);
            }
            if (error instanceof InternalServerErrorException || error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to get or process result for transcription job ${jobId}`, error);
            throw new InternalServerErrorException(`Could not get result for transcription job ${jobId}`);
        }
    }

    // Helper function to convert stream to string
    private async streamToString(stream: Readable): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Uint8Array[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        });
    }
} 