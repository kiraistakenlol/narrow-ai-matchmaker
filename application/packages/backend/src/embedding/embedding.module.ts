import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule as EmbeddingService uses ConfigService

@Module({
  imports: [ConfigModule], // Add ConfigModule here
  providers: [EmbeddingService],
  exports: [EmbeddingService],
})
export class EmbeddingModule {} 