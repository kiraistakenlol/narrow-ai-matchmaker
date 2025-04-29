import { EventDto } from './event.dto';

/**
 * Data Transfer Object representing an Event, potentially including
 * the current authenticated user's participation context if they have joined.
 */
export class JoinedEventDto extends EventDto { // Inherit base event fields
    participationId?: string | null; // ID of the EventParticipation record (null if not joined)
    contextData?: any | null; // User's specific context for this event (null if not joined)
} 