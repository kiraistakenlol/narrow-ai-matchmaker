import { Module } from '@nestjs/common';
import { ContentExtractionService } from './content-extraction.service';
import { LlmModule } from '@backend/llm/llm.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    LlmModule,
    ConfigModule,
  ],
  providers: [ContentExtractionService],
  exports: [ContentExtractionService],
})
export class ContentExtractionModule {} 