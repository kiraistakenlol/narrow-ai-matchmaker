import { Injectable, Logger } from '@nestjs/common';
import { ITranscriptionService } from './transcription.interface';

@Injectable()
export class TestTranscriptionService implements ITranscriptionService {
    private readonly logger = new Logger(TestTranscriptionService.name);

    async transcribeAudio(s3Key: string, languageCode?: string): Promise<string> {
        this.logger.log(`Test transcription for audio: ${s3Key}`);
        return `My name is Alex Martinez. I'm currently living in Buenos Aires, Argentina, and I'm deeply involved in advancing AI-driven solutions for automated linguistic analysis and cross-cultural communication platforms. My primary focus is on developing NLP models that can understand and generate nuanced human language`;
    }
} 