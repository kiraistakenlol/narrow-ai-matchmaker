import { OnboardingStatus } from '@narrow-ai-matchmaker/common';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('onboarding_sessions')
export class OnboardingSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    eventId: string | null;

    @Column()
    userId: string;

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