import { Injectable, Logger } from '@nestjs/common';
import { ITranscriptionService } from './transcription.interface';

@Injectable()
export class TestTranscriptionService implements ITranscriptionService {
    private readonly logger = new Logger(TestTranscriptionService.name);

    async transcribeAudio(s3Key: string, languageCode?: string): Promise<string> {
        this.logger.log(`Test transcription for audio: ${s3Key}`);
        return `This is a test transcription for ${s3Key}. Language code: ${languageCode || 'en-US'}.`;
    }
} 