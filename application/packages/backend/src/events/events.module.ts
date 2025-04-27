import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventParticipation } from './entities/event-participation.entity';
import { EventService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventParticipation])],
  providers: [EventService],
  exports: [EventService],
})
export class EventsModule {} 