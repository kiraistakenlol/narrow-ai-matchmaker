import { Injectable, Inject, Logger, InternalServerErrorException } from '@nestjs/common';
import { S3AudioStorageService } from '@backend/audio-storage/s3-audio-storage.service';
import { AwsTranscribeService } from '@backend/transcription/aws-transcribe.service';
import { ILlmService } from '@backend/llm/llm.interface';
import { ProfileData } from '@narrow-ai-matchmaker/common';

@Injectable()
export class ContentExtractionService {
    private readonly logger = new Logger(ContentExtractionService.name);

    constructor(
        private readonly audioStorageService: S3AudioStorageService,
        private readonly transcriptionService: AwsTranscribeService,
        @Inject(ILlmService)
        private readonly llmService: ILlmService,
    ) {
        this.logger.log('ContentExtractionService initialized');
    }

    /**
     * Core logic: Transcribes audio from S3 and uses LLM to extract structured data.
     * Assumes extraction targets the ProfileData structure for now.
     * @param audioStoragePath S3 key for the audio file.
     * @param targetSchema The JSON schema describing the desired output structure (currently ProfileData implied).
     * @param llmInstructions Context/prompt guidance for the LLM.
     * @returns The extracted ProfileData object.
     * @throws Error if any step (transcription, LLM extraction) fails.
     */
    async extractStructuredData(
        audioStoragePath: string,
        targetSchema: object,
        llmInstructions: string
    ): Promise<ProfileData> {
        this.logger.log(`Starting structured data extraction for audio S3 key: ${audioStoragePath}`);
        let transcript: string | null = null;

        try {
            this.logger.log(`Starting transcription for ${audioStoragePath}`);
            const s3Uri = this.audioStorageService.getS3Uri(audioStoragePath);
            const { jobId } = await this.transcriptionService.startTranscription(s3Uri, audioStoragePath);
            this.logger.log(`Transcription job ${jobId} started. Polling for completion...`);

            let status = await this.transcriptionService.getTranscriptionStatus(jobId);
            const maxAttempts = 10;
            let attempts = 0;
            while (status === 'IN_PROGRESS' || status === 'QUEUED') {
                attempts++;
                if (attempts > maxAttempts) {
                    this.logger.error(`Transcription job ${jobId} timed out after ${attempts} attempts.`);
                    throw new Error(`Transcription job ${jobId} timed out.`);
                }
                this.logger.debug(`Job ${jobId} status: ${status}. Waiting 30 seconds (Attempt ${attempts}/${maxAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, 3000));
                status = await this.transcriptionService.getTranscriptionStatus(jobId);
            }

            if (status !== 'COMPLETED') {
                this.logger.error(`Transcription job ${jobId} did not complete successfully. Final status: ${status}`);
                throw new Error(`Transcription job ${jobId} failed or ended with status: ${status}`);
            }

            const transcriptionResult = await this.transcriptionService.getTranscriptionResult(jobId);
            if (!transcriptionResult) {
                 this.logger.error(`Transcription job ${jobId} completed but result could not be retrieved.`);
                throw new Error(`Transcription job ${jobId} completed but result could not be retrieved.`);
            }
            transcript = transcriptionResult.transcript;
            this.logger.log(`Transcription complete for ${audioStoragePath}. Length: ${transcript.length}`);

            this.logger.log(`Extracting JSON from transcription using LLM provider: ${this.llmService.constructor.name}`);
            const llmResult = await this.llmService.extractStructuredData(transcript, targetSchema, llmInstructions);
            const extractedJson = llmResult.extractedData as ProfileData;
            this.logger.log(`Finished structured data extraction for audio: ${audioStoragePath}.`);

            return extractedJson;

        } catch (error) {
             const message = error instanceof Error ? error.message : 'Unknown extraction error';
             this.logger.error(`Extraction failed for audio ${audioStoragePath}: ${message}`, error instanceof Error ? error.stack : undefined);
             const errorMessage = `Failed to extract structured data from audio ${audioStoragePath}: ${message}${transcript ? ` (Transcript obtained before failure)` : ''}`;
             throw new InternalServerErrorException(errorMessage);
        }
    }

    // Removed redundant processAudio method
} 