import { Module } from '@nestjs/common';
import { MatchesService } from './matches.service';
// If you create a MatchesController later, it would be imported and declared here too.

@Module({
  providers: [MatchesService],
  exports: [MatchesService] // Export if other modules will use this service directly
})
export class MatchesModule {} 