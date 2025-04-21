import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles/profiles.controller';
import { ProfilesService } from './profiles/profiles.service';
import { EmbeddingController } from './embedding/embedding.controller';
import { EmbeddingService } from './embedding/embedding.service';

@Module({
  imports: [],
  controllers: [ProfilesController, EmbeddingController],
  providers: [ProfilesService, EmbeddingService],
})
export class AppModule {} 