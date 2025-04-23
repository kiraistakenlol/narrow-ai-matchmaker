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
} from '@nestjs/common';
import { TestDataService } from './test-data.service';

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
} 