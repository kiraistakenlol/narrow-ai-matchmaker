import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './profiles.service';
import { ContentExtractionModule } from '@backend/content-extraction/content-extraction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile]),
    ContentExtractionModule,
  ],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfilesModule {} 