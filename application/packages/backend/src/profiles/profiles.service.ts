import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileData, EventContext } from '@narrow-ai-matchmaker/common';

// Helper function to create a default empty ProfileData
const createDefaultEmptyProfileData = (): ProfileData => ({
    raw_input: null,
    personal: {
        name: null,
        headline: null,
        visiting_status: null,
    },
    skills: {
        hard: [],
        soft: [],
    },
    industries: [],
    hobbies: [],
    roles: [],
    // Need a default EventContext, assuming a placeholder ID initially
    event_context: {
        event_id: 'initial_placeholder', // Or consider making EventContext nullable if appropriate
        goals: {
            looking_for: [],
            offering: [],
        },
    },
    extra_notes: null,
});

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
    ) {}

    async createInitialProfile(userId: string): Promise<Profile> {
        this.logger.log(`Creating initial profile for user: ${userId}`);
        try {
            const newProfile = this.profileRepository.create({
                userId: userId,
                data: createDefaultEmptyProfileData(),
                completenessScore: 0,
            });
            const savedProfile = await this.profileRepository.save(newProfile);
            this.logger.log(`Successfully created initial profile ${savedProfile.id} for user ${userId}`);
            return savedProfile;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to create initial profile for user ${userId}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not create initial profile.');
        }
    }

    async save(profile: Profile): Promise<Profile> {
        this.logger.log(`Saving profile ${profile.id} for user ${profile.userId}`);
        try {
            const savedProfile = await this.profileRepository.save(profile);
            this.logger.log(`Successfully saved profile ${savedProfile.id}`);
            return savedProfile;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to save profile ${profile.id}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException(`Could not save profile ${profile.id}.`);
        }
    }

    // Add other profile-related methods here (e.g., findById, updateProfileData, etc.)
} 