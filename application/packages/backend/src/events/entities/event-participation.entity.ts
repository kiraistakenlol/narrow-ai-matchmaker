import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// import { OnboardingSession } from '@backend/onboarding/entities/onboarding-session.entity'; // No longer needed

@Entity('event_participations')
export class EventParticipation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    eventId: string;

    // // Foreign key column // Removed
    // @Column() // Removed
    // onboardingId: string; // Removed

    // // Relationship (inverse side) // Removed
    // @OneToOne(() => OnboardingSession, session => session.eventParticipation) // Removed
    // @JoinColumn({ name: 'onboardingId' }) // Removed
    // onboardingSession: OnboardingSession; // Removed

    @Column({ type: 'jsonb', default: {} }) // Explicitly set jsonb if needed
    contextData: any; // Consider using a specific type like ProfileData if applicable

    @Column({ type: 'float', default: 0.0 })
    completenessScore: number;

    @Column()
    joinedAt: Date;

    @Column({ nullable: true })
    embeddingUpdatedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

} 