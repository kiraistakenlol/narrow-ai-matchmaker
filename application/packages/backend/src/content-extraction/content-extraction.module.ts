import { Module } from '@nestjs/common';
import { ContentExtractionService } from './content-extraction.service';
import { AudioStorageModule } from '@backend/audio-storage/audio-storage.module';
import { LlmModule } from '@backend/llm/llm.module';
import { TranscriptionModule } from '@backend/transcription/transcription.module';

@Module({
  imports: [
    AudioStorageModule,
    LlmModule,
    TranscriptionModule,
  ],
  providers: [ContentExtractionService],
  exports: [ContentExtractionService],
})
export class ContentExtractionModule {} 