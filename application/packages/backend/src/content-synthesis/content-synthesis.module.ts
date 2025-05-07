import { Module } from '@nestjs/common';
import { ContentSynthesisService } from './content-synthesis.service';
import { LlmModule } from '@backend/llm/llm.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    LlmModule,
    ConfigModule,
  ],
  providers: [ContentSynthesisService],
  exports: [ContentSynthesisService],
})
export class ContentSynthesisModule {}