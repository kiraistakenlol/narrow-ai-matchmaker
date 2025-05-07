import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Event } from './entities/event.entity';
import { EventParticipation } from './entities/event-participation.entity';
import { ContentSynthesisService } from '@backend/content-synthesis/content-synthesis.service';

@Injectable()
export class EventService {
    private readonly logger = new Logger(EventService.name);

    constructor(
        @InjectRepository(Event)
        private eventRepository: Repository<Event>,
        @InjectRepository(EventParticipation)
        private eventParticipationRepository: Repository<EventParticipation>,
        private readonly contentExtractionService: ContentSynthesisService,
    ) {}

    async findEventById(id: string): Promise<Event | null> {
        this.logger.log(`Finding event by ID: ${id}`);
        return this.eventRepository.findOneBy({ id });
    }

    // New method to find events joined by a user
    async findJoinedEventsByUserId(userId: string): Promise<{ event: Event, participation: EventParticipation }[]> {
        this.logger.log(`Finding events joined by user ID: ${userId}`);
        try {
            const participations = await this.eventParticipationRepository.find({
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

    // New method to find the first event
    async findFirstAvailableEvent(): Promise<Event | null> {
        this.logger.log('Finding first available event...');
        try {
            // Use find with order and take: 1 to get the first event
            const events = await this.eventRepository.find({
                order: { createdAt: 'ASC' }, // Ensure Event entity has createdAt
                take: 1,
            });
            
            if (events.length > 0) {
                this.logger.log(`Found first event with ID: ${events[0].id}`);
                return events[0]; // Return the first event found
            } else {
                this.logger.warn('No events found in the database.');
                return null; // No events exist
            }
        } catch (error) {
             const message = error instanceof Error ? error.message : 'Unknown database error';
             this.logger.error(`Failed to find first available event: ${message}`, error instanceof Error ? error.stack : undefined);
             // Depending on requirements, you might want to throw an exception or return null
             // Throwing InternalServerErrorException for unexpected DB errors
             throw new InternalServerErrorException('Could not retrieve the first event.');
        }
    }

    async createInitialParticipation(
        userId: string,
        eventId: string,
        userContext: string,
    ): Promise<EventParticipation> {
        this.logger.log(`Creating initial participation for user ${userId} in event ${eventId}`);
        // Use direct IDs assuming columns userId and eventId exist on EventParticipation
        const newParticipation = this.eventParticipationRepository.create({
            userId: userId,
            eventId: eventId,
            contextData: { initialContext: userContext },
            // status: EventParticipationStatus.INITIALIZED // Set initial status
        });
        return this.eventParticipationRepository.save(newParticipation);
    }

    async processParticipationUpdate(
        userId: string,
        eventId: string,
        transcript: string,
    ): Promise<EventParticipation> {
        this.logger.log(`Processing participation update for user ${userId}, event ${eventId}`);
        let participation = await this.eventParticipationRepository.findOne({
            // Correct: Use direct IDs in where clause
            where: { userId: userId, eventId: eventId },
        });

        if (!participation) {
            this.logger.warn(`No existing participation found for user ${userId}, event ${eventId}. Creating new.`);
            participation = await this.createInitialParticipation(userId, eventId, 'Created during transcript update.');
        }

        this.logger.log(`Updating context data for participation ${participation.id}`);
        // TODO: Implement actual LLM/data processing
        const updatedData = {
            ...(participation.contextData as object || {}),
            transcript: transcript,
            processedGoals: ["Example Goal 1", "Example Goal 2"],
            processedAvailability: "Example Availability"
        };

        participation.contextData = updatedData;
        // participation.status = EventParticipationStatus.COMPLETED; // Update status

        return this.eventParticipationRepository.save(participation);
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
                participation = await this.eventParticipationRepository.findOne({
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