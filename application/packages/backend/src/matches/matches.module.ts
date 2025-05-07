import { Module, forwardRef } from '@nestjs/common';
import { MatchesService } from './matches.service';
import { EmbeddingModule } from '../embedding/embedding.module';
import { UsersModule } from '../users/users.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { ContentSynthesisModule } from '../content-synthesis/content-synthesis.module';
// If you create a MatchesController later, it would be imported and declared here too.

@Module({
  imports: [
    EmbeddingModule, 
    forwardRef(() => UsersModule),
    ProfilesModule,
    ContentSynthesisModule
  ],
  providers: [MatchesService],
  exports: [MatchesService] // Export if other modules will use this service directly
})
export class MatchesModule {} 