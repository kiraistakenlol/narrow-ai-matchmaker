import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    TranscribeClient,
    StartTranscriptionJobCommand,
    GetTranscriptionJobCommand,
    TranscriptionJobStatus as AwsJobStatus, // Renamed to avoid conflict
    LanguageCode,
    GetTranscriptionJobCommandOutput,
} from '@aws-sdk/client-transcribe';
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"; // To fetch the result
// import { ITranscriptionService, TranscriptionJobStatus, TranscriptionResult } from '../transcription.interface'; // Removed
import { Readable } from 'stream';

// Define status enum and result interface locally if needed, or import from a shared types location
export enum TranscriptionJobStatus {
    QUEUED = 'QUEUED',
    IN_PROGRESS = 'IN_PROGRESS',
    FAILED = 'FAILED',
    COMPLETED = 'COMPLETED',
}

export interface TranscriptionResult {
    transcript: string;
}

@Injectable()
// export class AwsTranscribeService implements ITranscriptionService { // Removed implements
export class AwsTranscribeService {
    private readonly logger = new Logger(AwsTranscribeService.name);
    private readonly transcribeClient: TranscribeClient;
    private readonly s3Client: S3Client; // Needed to fetch results
    private readonly outputBucket: string;
    private readonly region: string;

    constructor(private configService: ConfigService) {
        this.region = this.configService.get<string>('transcription.aws.region');
        const accessKeyId = this.configService.get<string>('transcription.aws.accessKeyId');
        const secretAccessKey = this.configService.get<string>('transcription.aws.secretAccessKey');
        this.outputBucket = this.configService.get<string>('transcription.aws.outputBucket');

        if (!this.region || !this.outputBucket) {
            throw new Error('AWS region and Transcribe output bucket must be configured.');
        }

        const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

        this.transcribeClient = new TranscribeClient({ region: this.region, credentials });
        this.s3Client = new S3Client({ region: this.region, credentials }); // Use same region/creds for S3 access

        this.logger.log(`AwsTranscribeService initialized for region ${this.region} and output bucket ${this.outputBucket}`);
    }

    async startTranscription(audioStorageUri: string, outputKey: string, languageCode: LanguageCode | string = LanguageCode.EN_US): Promise<{ jobId: string }> {
        // Use outputKey as the TranscriptionJobName - must be unique
        const jobName = outputKey;
        this.logger.log(`Starting transcription job: ${jobName} for audio: ${audioStorageUri}`);

        const command = new StartTranscriptionJobCommand({
            TranscriptionJobName: jobName,
            LanguageCode: languageCode as LanguageCode, // Cast needed as SDK enum is stricter
            Media: {
                MediaFileUri: audioStorageUri, // Assuming audioStorageUri is an S3 URI like s3://bucket/key
            },
            OutputBucketName: this.outputBucket,
            // OutputKey: `${jobName}.json`, // Optional: control output path within bucket, default is job name
            // DataAccessRoleArn: this.dataAccessRoleArn, // Removed
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

    async getTranscriptionStatus(jobId: string): Promise<TranscriptionJobStatus> {
        this.logger.debug(`Checking status for transcription job: ${jobId}`);
        const command = new GetTranscriptionJobCommand({ TranscriptionJobName: jobId });

        try {
            const result = await this.transcribeClient.send(command);
            const status = result.TranscriptionJob?.TranscriptionJobStatus;

            switch (status) {
                case AwsJobStatus.COMPLETED:
                    return TranscriptionJobStatus.COMPLETED;
                case AwsJobStatus.FAILED:
                    this.logger.warn(`Transcription job ${jobId} failed. Reason: ${result.TranscriptionJob?.FailureReason}`);
                    return TranscriptionJobStatus.FAILED;
                case AwsJobStatus.IN_PROGRESS:
                    return TranscriptionJobStatus.IN_PROGRESS;
                case AwsJobStatus.QUEUED:
                    return TranscriptionJobStatus.QUEUED;
                default:
                    this.logger.error(`Unknown transcription job status for ${jobId}: ${status}`);
                    throw new InternalServerErrorException(`Unknown job status: ${status}`);
            }
        } catch (error: any) {
            // Handle case where job might not be found (e.g., invalid ID, eventual consistency issues)
             if (error.name === 'NotFoundException' || error.name === 'BadRequestException') {
                this.logger.error(`Transcription job ${jobId} not found.`);
                throw new NotFoundException(`Transcription job ${jobId} not found.`);
            }
            this.logger.error(`Failed to get status for transcription job ${jobId}`, error);
            throw new InternalServerErrorException(`Could not get status for transcription job ${jobId}`);
        }
    }

    async getTranscriptionResult(jobId: string): Promise<TranscriptionResult | null> {
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
                // Or throw an error? Returning null seems safer for now.
                return null;
            }

            const transcriptUri = jobDetails.TranscriptionJob?.Transcript?.TranscriptFileUri;
            if (!transcriptUri) {
                this.logger.error(`Transcription job ${jobId} completed but TranscriptFileUri is missing.`);
                throw new InternalServerErrorException(`Transcript URI missing for completed job ${jobId}`);
            }

            // Extract S3 bucket and key from the URI
            const url = new URL(transcriptUri);
            if (url.protocol !== 'https:') { // Transcribe usually returns HTTPS URLs
                this.logger.error(`Unexpected transcript URI format for job ${jobId}: ${transcriptUri}`);
                throw new InternalServerErrorException(`Unexpected transcript URI format for job ${jobId}`);
            }
            // Example HTTPS URL: https://s3.<region>.amazonaws.com/<bucket-name>/<job-name>.json
            // Or presigned: https://<bucket-name>.s3.<region>.amazonaws.com/<job-name>.json?...
            const bucketName = this.outputBucket; // We know the output bucket
            const key = url.pathname.startsWith(`/${bucketName}/`)
                        ? url.pathname.substring(bucketName.length + 2) // Remove leading /<bucket>/
                        : url.pathname.substring(1); // Remove leading / if path style URL

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

            // Optional: Delete the S3 object after retrieving
            // await this.s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
            // this.logger.log(`Deleted transcript file from S3: s3://${bucketName}/${key}`);

             return { transcript: fullTranscript };

        } catch (error: any) {
             if (error.name === 'NotFoundException' || error.name === 'BadRequestException' && !jobDetails) {
                this.logger.error(`Transcription job ${jobId} not found when trying to get result.`);
                throw new NotFoundException(`Transcription job ${jobId} not found.`);
            }
             if (error instanceof InternalServerErrorException || error instanceof NotFoundException) {
                throw error; // Re-throw known handled errors
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