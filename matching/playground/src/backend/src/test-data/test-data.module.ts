import { Module } from '@nestjs/common';
import { TestDataController } from './test-data.controller';
import { TestDataService } from './test-data.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule], // Import ConfigModule to use ConfigService
  controllers: [TestDataController],
  providers: [TestDataService],
})
export class TestDataModule {} 