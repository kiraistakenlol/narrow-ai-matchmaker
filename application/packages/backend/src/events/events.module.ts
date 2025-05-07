import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventParticipation } from './entities/event-participation.entity';
import { EventService } from './events.service';
import { ContentSynthesisModule } from '@backend/content-synthesis/content-synthesis.module';
import { EventsController } from './events.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, EventParticipation]),
    ContentSynthesisModule,
  ],
  providers: [EventService],
  exports: [EventService],
  controllers: [EventsController],
})
export class EventsModule {} 