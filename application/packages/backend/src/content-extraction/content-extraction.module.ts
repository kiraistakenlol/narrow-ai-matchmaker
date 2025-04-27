import { Module } from '@nestjs/common';
import { ContentExtractionService } from './content-extraction.service';
import { AudioStorageModule } from '@backend/audio-storage/audio-storage.module';

@Module({
  imports: [
    AudioStorageModule, // Fixed import
    // LlmModule, // Uncomment when LlmModule is ready
    // TranscriptionModule, // Uncomment when TranscriptionModule is ready
  ],
  providers: [ContentExtractionService],
  exports: [ContentExtractionService], // Export if other modules need to trigger it directly
})
export class ContentExtractionModule {} 