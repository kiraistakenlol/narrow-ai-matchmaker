import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileService } from './profiles.service';
import { ContentSynthesisModule } from '@backend/content-synthesis/content-synthesis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile]),
    ContentSynthesisModule,
  ],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfilesModule {} 