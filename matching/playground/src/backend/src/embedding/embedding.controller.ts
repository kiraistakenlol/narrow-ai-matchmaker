import { Controller, Post, Body, Get, Param, Query, HttpCode, HttpStatus, Delete, BadRequestException } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { EmbedProfileDto } from 'narrow-ai-matchmaker-common';

@Controller('embed')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Post('base-audience')
  @HttpCode(HttpStatus.OK)
  async embedBaseAudience(@Body() { collectionName }: { collectionName: string }) {
    if (!collectionName) {
        throw new BadRequestException('collectionName must be provided in the request body.');
    }
    return this.embeddingService.embedBaseAudience(collectionName);
  }
  
  @Post('scenario/:scenarioId')
  @HttpCode(HttpStatus.OK)
  async embedScenario(
    @Param('scenarioId') scenarioId: string,
    @Body() body: { collectionName: string }
  ) {
    if (!body || !body.collectionName) {
      throw new BadRequestException('collectionName must be provided in the request body.');
    }
    return this.embeddingService.embedScenarioProfiles(scenarioId, body.collectionName);
  }

  // Endpoint to remove non-base profiles
  @Delete('collection/:collectionName/non-base')
  @HttpCode(HttpStatus.OK)
  async removeNonBaseProfiles(@Param('collectionName') collectionName: string) {
    if (!collectionName) {
      throw new BadRequestException('collectionName must be provided as a URL parameter.');
    }
    return this.embeddingService.removeNonBaseProfiles(collectionName);
  }

  // Endpoint to embed a single profile
  @Post('profile')
  @HttpCode(HttpStatus.CREATED) // Use 201 for resource creation
  async embedSingleProfile(@Body() embedProfileDto: EmbedProfileDto) {
    const { collectionName, description } = embedProfileDto;
    if (!collectionName || !description) {
      throw new BadRequestException('collectionName and description must be provided in the request body.');
    }
    return this.embeddingService.embedSingleProfile(collectionName, description);
  }
} 