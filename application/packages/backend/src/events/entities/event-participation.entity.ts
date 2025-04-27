import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('event_participations')
export class EventParticipation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    eventId: string;

    @Column()
    onboardingId: string;

    @Column({ default: {} })
    contextData: any;

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