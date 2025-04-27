import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum OnboardingStatus {
    STARTED = 'STARTED',
    AWAITING_INITIAL_AUDIO = 'AWAITING_INITIAL_AUDIO',
    INITIAL_AUDIO_UPLOADED = 'INITIAL_AUDIO_UPLOADED',
    PROCESSING = 'PROCESSING',
    NEEDS_CLARIFICATION = 'NEEDS_CLARIFICATION',
    READY_FOR_REVIEW = 'READY_FOR_REVIEW',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    EXPIRED = 'EXPIRED',
}

@Entity('onboarding_sessions')
export class OnboardingSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    eventId: string;

    @Column('uuid', { nullable: true })
    @Index()
    userId?: string;

    @Column('uuid', { nullable: true })
    @Index()
    profileId?: string;

    @Column('uuid', { nullable: true })
    @Index()
    participationId?: string;

    @Column({
        type: 'enum',
        enum: OnboardingStatus,
        default: OnboardingStatus.STARTED,
    })
    status: OnboardingStatus;

    @Column('jsonb', { nullable: true })
    audioContexts?: Record<string, { uploaded: boolean; storagePath?: string }>;

    @Column('jsonb', { nullable: true })
    extractedData?: any;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt?: Date;
} 