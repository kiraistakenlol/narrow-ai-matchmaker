import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsTranscribeService } from './aws-transcribe.service';
import { TestTranscriptionService } from './test-transcription.service';
import { TranscriptionFactory } from './transcription.factory';

@Module({
    imports: [ConfigModule], // AwsTranscribeService needs ConfigService
    providers: [
        // Directly provide and export AwsTranscribeService
        AwsTranscribeService,
        TestTranscriptionService,
        TranscriptionFactory,
        {
            provide: 'ITranscriptionService',
            useFactory: (factory: TranscriptionFactory) => factory.getTranscriptionService(),
            inject: [TranscriptionFactory],
        },
    ],
    exports: ['ITranscriptionService'], // Export the concrete service
})
export class TranscriptionModule {} 