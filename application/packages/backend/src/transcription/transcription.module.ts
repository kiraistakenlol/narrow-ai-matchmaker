import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsTranscribeService } from './aws-transcribe.service';

@Module({
    imports: [ConfigModule], // AwsTranscribeService needs ConfigService
    providers: [
        // Directly provide and export AwsTranscribeService
        AwsTranscribeService,
    ],
    exports: [AwsTranscribeService], // Export the concrete service
})
export class TranscriptionModule {} 