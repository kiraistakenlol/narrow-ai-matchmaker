import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventParticipation } from './entities/event-participation.entity';
import { ContentExtractionService } from '../content-extraction/content-extraction.service';

@Injectable()
export class EventService {
    private readonly logger = new Logger(EventService.name);

    constructor(
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        @InjectRepository(EventParticipation)
        private participationRepository: Repository<EventParticipation>,
        private readonly contentExtractionService: ContentExtractionService,
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

    // New method to find events joined by a user
    async findJoinedEventsByUserId(userId: string): Promise<{ event: Event, participation: EventParticipation }[]> {
        this.logger.log(`Finding events joined by user ID: ${userId}`);
        try {
            const participations = await this.participationRepository.find({
                where: { userId: userId },
                relations: {
                    event: true
                },
                order: {
                    event: { startTime: 'ASC' }
                }
            });

            const joinedEvents = participations.map(p => ({ event: p.event, participation: p }));

            this.logger.log(`Found ${joinedEvents.length} joined events for user ${userId}`);
            return joinedEvents;

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find joined events for user ${userId}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not retrieve joined events.');
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

    async processParticipationUpdate(userId: string, eventId: string, transcriptText: string): Promise<EventParticipation> {
        this.logger.log(`Processing event participation update for user: ${userId}, event: ${eventId} using transcript`);
        
        const participation = await this.participationRepository.findOne({ 
            where: { userId, eventId } 
        });
        
        if (!participation) {
            throw new NotFoundException(`Event participation for user ${userId} and event ${eventId} not found`);
        }
        
        const eventContextSchema = { 
            type: 'object', 
            properties: { 
                goals: { type: 'array', items: { type: 'string' } }, 
                availability: { type: 'string' } 
            }, 
            required: ['goals'] 
        };
        
        const extractedEventData = await this.contentExtractionService.extractStructuredDataFromText<any>(
            transcriptText,
            eventContextSchema
        );
            
        participation.contextData = extractedEventData;
        return this.save(participation);
    }

    // New method to find event and optionally the user's participation
    async findEventWithOptionalParticipation(
        eventId: string, 
        userId?: string | null
    ): Promise<{ event: Event, participation: EventParticipation | null } | null> {
        this.logger.log(`Finding event ${eventId} with optional participation for user ${userId || 'N/A'}`);
        try {
            const event = await this.eventRepository.findOneBy({ id: eventId });
            if (!event) {
                this.logger.warn(`Event with ID ${eventId} not found.`);
                return null; // Event itself not found
            }

            let participation: EventParticipation | null = null;
            if (userId) {
                // Attempt to find participation only if userId is provided
                participation = await this.participationRepository.findOne({
                    where: { userId: userId, eventId: eventId },
                    // No need to load event relation again here
                });
                 this.logger.log(`Participation for user ${userId} in event ${eventId}: ${participation ? 'Found' : 'Not Found'}`);
            }
            
            return { event, participation };

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find event ${eventId} with participation for user ${userId || 'N/A'}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not retrieve event details.');
        }
    }
} 