/**
 * Data Transfer Object for public Event information.
 */
export class EventDto {
    id!: string;
    name!: string;
    description?: string | null;
    startTime!: string; // Use ISO string format for dates in DTOs
    endTime?: string | null;
} 