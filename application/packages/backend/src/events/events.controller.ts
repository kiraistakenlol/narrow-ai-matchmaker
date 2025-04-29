import { Controller, Get, NotFoundException, Param, Logger, ParseUUIDPipe } from '@nestjs/common';
import { EventService } from './events.service';
import { JoinedEventDto } from '@narrow-ai-matchmaker/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CognitoIdTokenPayload } from '../common/types/auth.types';

@Controller('events')
export class EventsController {
    private readonly logger = new Logger(EventsController.name);

    constructor(private readonly eventService: EventService) {}

    @Get(':id')
    async findOneById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() currentUser?: CognitoIdTokenPayload
    ): Promise<JoinedEventDto> {
        const userId = currentUser?.sub;
        this.logger.log(`Handling request for event ID: ${id} (User ID: ${userId || 'Anonymous'})`);
        
        const result = await this.eventService.findEventWithOptionalParticipation(id, userId);

        if (!result) {
            this.logger.warn(`Event with ID ${id} not found.`);
            throw new NotFoundException(`Event with ID ${id} not found`);
        }

        const { event, participation } = result;

        // Map entity to DTO
        const eventDto: JoinedEventDto = {
            id: event.id,
            name: event.name,
            description: event.description,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime?.toISOString() ?? null,
            participationId: participation?.id ?? null,
            contextData: participation?.contextData ?? null,
        };

        this.logger.log(`Returning JoinedEventDto for event ID: ${id} (User: ${userId || 'Anonymous'})`);
        return eventDto;
    }
} 