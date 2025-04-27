import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum OnboardingStatus {
    STARTED = 'STARTED',
    AWAITING_AUDIO = 'AWAITING_AUDIO',
    AUDIO_UPLOADED = 'AUDIO_UPLOADED',
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

    @Column()
    eventId: string;

    @Column()
    userId: string;

    @Column()
    profileId: string;

    @Column()
    participationId: string;

    @Column()
    status: OnboardingStatus;

    @Column()
    audioStoragePath?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column()
    expiresAt?: Date;
} 