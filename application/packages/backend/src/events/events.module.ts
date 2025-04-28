import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventParticipation } from './entities/event-participation.entity';
import { EventService } from './events.service';
import { ContentExtractionModule } from '@backend/content-extraction/content-extraction.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventParticipation]),
    ContentExtractionModule,
  ],
  providers: [EventService],
  exports: [EventService],
})
export class EventsModule {} 