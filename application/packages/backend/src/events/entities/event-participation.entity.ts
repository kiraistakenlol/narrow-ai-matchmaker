import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('event_participations')
export class EventParticipation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    eventId: string;

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