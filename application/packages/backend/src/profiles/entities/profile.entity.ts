import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProfileData } from '@narrow-ai-matchmaker/common';

@Entity('profiles')
export class Profile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @Column()
    onboardingId: string;

    @Column({ type: 'jsonb', default: {} })
    data: ProfileData;

    @Column({ type: 'float', default: 0.0 })
    completenessScore: number;

    @Column({ nullable: true })
    embeddingUpdatedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

} 