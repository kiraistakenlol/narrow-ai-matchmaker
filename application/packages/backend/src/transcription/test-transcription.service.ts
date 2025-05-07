import { Injectable, Logger } from '@nestjs/common';
import { ITranscriptionService } from './transcription.interface';

@Injectable()
export class TestTranscriptionService implements ITranscriptionService {
    private readonly logger = new Logger(TestTranscriptionService.name);

    async transcribeAudio(s3Key: string, languageCode?: string): Promise<string> {
        this.logger.log(`Test transcription for audio: ${s3Key}`);
        return `Hi there! I'm Alex Rivera, founder of PixelPerfect. 
        I've been in the tech industry for over 10 years, previously
         leading design at TechGiant before starting this venture. 
         We're a brand new design-focused SaaS startup that just 
         secured $2M in seed funding from Acme Ventures. 
         We're building an AI-powered design collaboration
          platform that helps teams create consistent 
          brand assets in minutes instead of days. 
          We've built our MVP and now need our first talented marketing 
          designer to help us establish our brand identity and create 
          compelling visual content for our launch. I have a technical 
          background in full-stack development and product management 
          but need someone creative who's excited about joining a tiny 
          team and wearing multiple hats. Our current team consists of 
          myself and two engineers, and we're looking for that special 
          someone who wants to be employee #1 on the design side and grow
           with us as we scale! We offer competitive equity, flexible 
           remote work, and the chance to define our visual direction
            from the ground up.`;
    }
} 