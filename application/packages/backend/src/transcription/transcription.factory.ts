import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITranscriptionService } from './transcription.interface';
import { AwsTranscribeService } from './aws-transcribe.service';
import { TestTranscriptionService } from './test-transcription.service';

@Injectable()
export class TranscriptionFactory {
    private readonly logger = new Logger(TranscriptionFactory.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly awsTranscribeService: AwsTranscribeService,
        private readonly testTranscriptionService: TestTranscriptionService,
    ) {}

    getTranscriptionService(): ITranscriptionService {
        const provider = this.configService.get<string>('transcription.provider', 'aws');
        
        switch (provider.toLowerCase()) {
            case 'aws':
                this.logger.log('Using AWS Transcribe service');
                return this.awsTranscribeService;
            case 'test':
                this.logger.log('Using Test Transcription service');
                return this.testTranscriptionService;
            default:
                this.logger.warn(`Unknown transcription provider: ${provider}. Defaulting to AWS.`);
                return this.awsTranscribeService;
        }
    }
} 