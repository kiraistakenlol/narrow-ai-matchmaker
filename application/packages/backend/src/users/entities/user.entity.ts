import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { Profile } from '../../profiles/entities/profile.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    externalId?: string;

    @Column()
    email?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Define the relationship to Profile
    @OneToOne(() => Profile, profile => profile.user) // Assuming Profile has a 'user' property pointing back
    profile?: Profile;
} 