import { Controller, Post, Body } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

class EmbedProfileDto {
  profileId: string;
  collectionName: string;
}

@Controller('embed')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Post()
  async createEmbedding(@Body() embedProfileDto: EmbedProfileDto) {
    return this.embeddingService.createEmbedding(
      embedProfileDto.profileId,
      embedProfileDto.collectionName
    );
  }
} 