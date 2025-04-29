import { Controller, Get, NotFoundException, Param, Logger, ParseUUIDPipe } from '@nestjs/common';
import { EventService } from './events.service';
import { EventDto } from '@narrow-ai-matchmaker/common'; // Import DTO
import { Event } from './entities/event.entity';

@Controller('events')
export class EventsController {
    private readonly logger = new Logger(EventsController.name);

    constructor(private readonly eventService: EventService) {}

    @Get(':id')
    async findOneById(@Param('id', ParseUUIDPipe) id: string): Promise<EventDto> {
        this.logger.log(`Handling request for event ID: ${id}`);
        
        const event = await this.eventService.findEventById(id);

        if (!event) {
            this.logger.warn(`Event with ID ${id} not found.`);
            throw new NotFoundException(`Event with ID ${id} not found`);
        }

        // Map entity to DTO
        const eventDto: EventDto = {
            id: event.id,
            name: event.name,
            description: event.description,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime?.toISOString() ?? null,
        };

        this.logger.log(`Returning event DTO for ID: ${id}`);
        return eventDto;
    }
} 