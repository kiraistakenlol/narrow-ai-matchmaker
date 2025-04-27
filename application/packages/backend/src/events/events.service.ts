import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
        this.logger.log(`Finding event with ID: ${eventId}`);
        const event = await this.eventRepository.findOneBy({ id: eventId });
        if (!event) {
             this.logger.warn(`Event with ID ${eventId} not found.`);
        }
        return event;
    }

    async createInitialParticipation(userId: string, eventId: string, onboardingId: string): Promise<EventParticipation> {
        this.logger.log(`Creating initial participation for user ${userId}, event ${eventId}, onboarding ${onboardingId}`);
        const newParticipation = this.participationRepository.create({
            userId: userId,
            eventId: eventId,
            contextData: { onboardingId },
            completenessScore: 0,
        });
        try {
            const savedParticipation = await this.participationRepository.save(newParticipation);
            this.logger.log(`Created participation with ID: ${savedParticipation.id}`);
            return savedParticipation;
        } catch (error) {
            this.logger.error(`Failed to save initial participation for user ${userId}, event ${eventId}`, error);
            throw new InternalServerErrorException('Could not create event participation record.');
        }
    }

} 