import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { ProfileData } from '@narrow-ai-matchmaker/common';
import { User } from '../../users/entities/user.entity';

@Entity('profiles')
export class Profile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @OneToOne(() => User, user => user.profile) 
    @JoinColumn({ name: 'userId' })
    user: User;

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