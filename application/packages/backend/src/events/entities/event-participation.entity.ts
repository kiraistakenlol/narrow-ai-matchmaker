import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Event } from './event.entity'; // Import Event

@Entity('event_participations')
export class EventParticipation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    eventId: string;

    @ManyToOne(() => Event) // Assuming many participations can belong to one event
    @JoinColumn({ name: 'eventId' }) // Link it using the eventId column
    event: Event; // Add the relation property

    @Column({ type: 'jsonb', default: {} }) // Explicitly set jsonb if needed
    contextData: any; // Consider using a specific type like ProfileData if applicable

    @Column({ type: 'float', default: 0.0 })
    completenessScore: number;

    @Column({ nullable: true })
    embeddingUpdatedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

} 