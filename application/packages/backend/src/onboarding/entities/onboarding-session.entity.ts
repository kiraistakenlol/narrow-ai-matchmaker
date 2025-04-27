import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
import { Profile } from '@backend/profiles/entities/profile.entity';
import { EventParticipation } from '@backend/events/entities/event-participation.entity';
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

    @Column()
    eventId: string;

    @ManyToOne(() => Event, { nullable: false })
    @JoinColumn({ name: 'eventId' })
    event: Event;

    @Column()
    userId: string;

    @ManyToOne(() => User, { nullable: false })
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column()
    profileId: string;

    @OneToOne(() => Profile, { nullable: false })
    @JoinColumn({ name: 'profileId' })
    profile: Profile;

    @Column()
    participationId: string;

    @OneToOne(() => EventParticipation, { nullable: false })
    @JoinColumn({ name: 'participationId' })
    eventParticipation: EventParticipation;

    @Column()
    status: OnboardingStatus;

    @Column({ nullable: true })
    audioStoragePath?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    expiresAt?: Date;
} 