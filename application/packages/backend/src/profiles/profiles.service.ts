import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileData } from '@narrow-ai-matchmaker/common';

// Helper function to create a default empty ProfileData
const createDefaultProfileData = (): ProfileData => ({
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
    event_context: {
        event_id: 'initial_placeholder', // Needs actual event ID later
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
        this.logger.log(`Creating initial profile for user ${userId}`);
        const newProfile = this.profileRepository.create({
            userId: userId,
            data: createDefaultProfileData(),
            completenessScore: 0,
        });
        try {
            const savedProfile: Profile = await this.profileRepository.save(newProfile);
            this.logger.log(`Created profile with ID: ${savedProfile.id}`);
            return savedProfile;
        } catch (error) {
            this.logger.error(`Failed to save initial profile for user ${userId}`, error);
            throw new InternalServerErrorException('Could not create profile record.');
        }
    }

} 