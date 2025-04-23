import { Controller, Post, Body, Get, Param, Query, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

@Controller('embed')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Post('all')
  async createAllEmbeddings(@Body() { collectionName }: { collectionName: string }) {
    return this.embeddingService.createAllEmbeddings(collectionName);
  }

  @Post('base-audience')
  @HttpCode(HttpStatus.OK)
  async embedBaseAudience(@Body() { collectionName }: { collectionName: string }) {
    if (!collectionName) {
        throw new Error('collectionName must be provided in the request body.');
    }
    return this.embeddingService.embedBaseAudience(collectionName);
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

  @Post('scenario/:scenarioId')
  @HttpCode(HttpStatus.OK)
  async embedScenario(
    @Param('scenarioId') scenarioId: string,
    @Body() body: { collectionName: string }
  ) {
    if (!body || !body.collectionName) {
      throw new Error('collectionName must be provided in the request body.');
    }
    return this.embeddingService.embedScenarioProfiles(scenarioId, body.collectionName);
  }

  @Delete('collection/:collectionName')
  async deleteCollection(@Param('collectionName') collectionName: string) {
    return this.embeddingService.deleteCollection(collectionName);
  }
} 