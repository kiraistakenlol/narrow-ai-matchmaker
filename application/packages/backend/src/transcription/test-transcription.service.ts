import { Injectable, Logger } from '@nestjs/common';
import { ITranscriptionService } from './transcription.interface';

@Injectable()
export class TestTranscriptionService implements ITranscriptionService {
    private readonly logger = new Logger(TestTranscriptionService.name);

    async transcribeAudio(s3Key: string, languageCode?: string): Promise<string> {
        this.logger.log(`Test transcription for audio: ${s3Key}`);
        return `Hi there! I'm Alex Rivera, founder of PixelPerfect.
         We're a brand new design-focused SaaS startup that just 
         secured initial funding. We've built our MVP and now need 
         our first talented marketing designer to help us establish 
         our brand identity and create compelling visual content for our launch.
          I have a technical background but need someone creative who's 
          excited about joining a tiny team and wearing multiple hats.
           Looking for that special someone who wants to be employee #1 and grow with us!`;
    }
} 