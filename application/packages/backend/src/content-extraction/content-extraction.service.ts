import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
// Remove unused interface imports
// import { IAudioStorageService } from '@backend/audio-storage/audio-storage.interface';
// import { ITranscriptionService } from '@backend/transcription/transcription.interface'; 
import { ILlmService } from '@backend/llm/llm.interface';
import { Inject } from '@nestjs/common';

@Injectable()
export class ContentExtractionService {
    private readonly logger = new Logger(ContentExtractionService.name);

    constructor(
        // No longer needs audio storage or transcription service directly
        // @Inject(IAudioStorageService)
        // private readonly audioStorageService: IAudioStorageService,
        // @Inject(ITranscriptionService)
        // private readonly transcriptionService: ITranscriptionService, 
        @Inject(ILlmService)
        private readonly llmService: ILlmService,
    ) {}

    /**
     * Extracts structured data from a given text transcript using an LLM.
     * @param transcriptText The text content to process.
     * @param schema The JSON schema for the desired output structure.
     * @param instructions Guiding instructions for the LLM.
     * @returns The extracted structured data (JSON object).
     */
    async extractStructuredDataFromText(transcriptText: string, schema: object, instructions: string): Promise<any> {
        this.logger.log(`Extracting structured data from text transcript.`);
        try {
            const extractedData = await this.llmService.extractStructuredData(transcriptText, schema, instructions);
            this.logger.log('Successfully extracted structured data from text.');
            return extractedData;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown LLM error';
            this.logger.error(`Failed to extract structured data from text: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not extract structured data from text.');
        }
    }
} 