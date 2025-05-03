import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Profile } from '@backend/profiles/entities/profile.entity';
import { User } from '@backend/users/entities/user.entity';
import { Event } from '@backend/events/entities/event.entity';

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

    @Column({ nullable: true })
    eventId: string | null;

    @ManyToOne(() => Event, { nullable: true })
    @JoinColumn({ name: 'eventId' })
    event: Event | null;

    @Column()
    userId: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    profileId: string;

    @Column()
    status: OnboardingStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    expiresAt?: Date;
} 