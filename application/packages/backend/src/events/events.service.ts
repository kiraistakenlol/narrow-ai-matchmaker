import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventParticipation } from './entities/event-participation.entity';

@Injectable()
export class EventService {
    private readonly logger = new Logger(EventService.name);

    constructor(
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        @InjectRepository(EventParticipation)
        private participationRepository: Repository<EventParticipation>,
    ) {}

    async findEventById(eventId: string): Promise<Event | null> {
        this.logger.log(`Finding event by ID: ${eventId}`);
        try {
            const event = await this.eventRepository.findOneBy({ id: eventId });
            if (!event) {
                this.logger.warn(`Event with ID ${eventId} not found.`);
                // Consider throwing NotFoundException here or let the caller handle null
            }
            return event;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find event by ID ${eventId}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not retrieve event.');
        }
    }

    async createInitialParticipation(userId: string, eventId: string, onboardingId: string): Promise<EventParticipation> {
        this.logger.log(`Creating initial participation for user ${userId}, event ${eventId}, onboarding ${onboardingId}`);
        try {
            const newParticipation = this.participationRepository.create({
                userId: userId,
                eventId: eventId,
                contextData: {},
                completenessScore: 0,
            });
            const savedParticipation = await this.participationRepository.save(newParticipation);
            this.logger.log(`Successfully created initial participation ${savedParticipation.id}`);
            return savedParticipation;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to create initial participation for user ${userId}, event ${eventId}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not create initial event participation.');
        }
    }

    async save(participation: EventParticipation): Promise<EventParticipation> {
        this.logger.log(`Saving participation ${participation.id} for user ${participation.userId}, event ${participation.eventId}`);
        try {
            const savedParticipation = await this.participationRepository.save(participation);
            this.logger.log(`Successfully saved participation ${savedParticipation.id}`);
            return savedParticipation;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to save participation ${participation.id}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException(`Could not save participation ${participation.id}.`);
        }
    }

} 