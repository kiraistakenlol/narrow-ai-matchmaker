import {
  Controller,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  Injectable,
  Inject,
  InternalServerErrorException,
  BadRequestException,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { TestDataService } from './test-data.service';
import { MatchScenarioCategories } from '../../common/src/types/match-scenarios.types';

@Controller('test-data')
export class TestDataController {
  constructor(private readonly testDataService: TestDataService) {}

  @Post('generate-base-set')
  @HttpCode(HttpStatus.OK) // Use OK for successful action, even if it creates a file
  async generateBaseSet(
    @Query('count', new DefaultValuePipe(50), ParseIntPipe) count: number,
  ) {
    if (count <= 0 || count > 500) { // Add some reasonable limits
      throw new BadRequestException('Count must be between 1 and 500.');
    }
    try {
      const result = await this.testDataService.generateAndSaveBaseSet(count);
      return {
        message: `Successfully generated and saved ${result.count} profiles.`,
        filePath: result.filePath,
      };
    } catch (error) {
      console.error('Error generating base set:', error);
      // Avoid exposing raw error details to the client
      throw new InternalServerErrorException('Failed to generate base set.');
    }
  }

  @Get('scenarios')
  @HttpCode(HttpStatus.OK)
  async getMatchScenarios(): Promise<MatchScenarioCategories> {
    try {
      return this.testDataService.getMatchScenarios();
    } catch (error) {
      console.error('Error fetching match scenarios:', error);
      throw new InternalServerErrorException('Failed to fetch match scenarios.');
    }
  }

  @Post('generate-scenario/:scenarioId')
  @HttpCode(HttpStatus.OK)
  async generateScenarioBundle(
    @Param('scenarioId') scenarioId: string,
  ) {
    if (!scenarioId) {
      throw new BadRequestException('Scenario ID must be provided.');
    }
    try {
      const result = await this.testDataService.generateAndSaveScenarioBundle(scenarioId);
      return {
        message: `Successfully generated ${result.profilesGenerated} profiles for scenario ${scenarioId}.`,
        filePath: result.filePath,
      };
    } catch (error) {
      console.error(`Error generating scenario bundle for ${scenarioId}:`, error);
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      // Avoid exposing raw error details for other errors
      throw new InternalServerErrorException(`Failed to generate scenario bundle for ${scenarioId}.`);
    }
  }
} 