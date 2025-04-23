import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProfilesController } from './profiles/profiles.controller';
import { ProfilesService } from './profiles/profiles.service';
import { EmbeddingController } from './embedding/embedding.controller';
import { EmbeddingService } from './embedding/embedding.service';
import { TestDataModule } from './test-data/test-data.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../../../../.env',
    }),
    TestDataModule,
  ],
  controllers: [ProfilesController, EmbeddingController],
  providers: [ProfilesService, EmbeddingService],
})
export class AppModule {} 