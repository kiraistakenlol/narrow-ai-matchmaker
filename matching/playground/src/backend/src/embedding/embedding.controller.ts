import { Controller, Post, Body, Get, Param, Query, Delete } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { EmbedProfileDto } from 'narrow-ai-matchmaker-common';

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

  @Post('all')
  async createAllEmbeddings(@Body() { collectionName }: { collectionName: string }) {
    return this.embeddingService.createAllEmbeddings(collectionName);
  }

  @Get('search')
  async findSimilar(
    @Query('profileId') profileId: string,
    @Query('collectionName') collectionName: string,
    @Query('limit') limit = '5'
  ) {
    return this.embeddingService.findSimilarProfiles(
      profileId,
      collectionName,
      parseInt(limit, 10)
    );
  }

  @Delete('collection/:collectionName')
  async deleteCollection(@Param('collectionName') collectionName: string) {
    return this.embeddingService.deleteCollection(collectionName);
  }
} 