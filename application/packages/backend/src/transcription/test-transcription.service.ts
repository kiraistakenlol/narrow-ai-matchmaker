import { Injectable, Logger } from '@nestjs/common';
import { ITranscriptionService } from './transcription.interface';

@Injectable()
export class TestTranscriptionService implements ITranscriptionService {
    private readonly logger = new Logger(TestTranscriptionService.name);

    async transcribeAudio(s3Key: string, languageCode?: string): Promise<string> {
        this.logger.log(`Test transcription for audio: ${s3Key}`);
        return `Hi, I'm Olivia Parker, founder of HealthTrack, 
            a health monitoring app that helps users track and analyze their wellness data. 
            I have a business background and a clear vision for the product but I'm looking 
            for a technical co-founder who can build and lead our tech stack. 
            My app idea has received positive feedback from early testers, 
            but I need a skilled engineer to turn this vision into reality.`;
    }
} 