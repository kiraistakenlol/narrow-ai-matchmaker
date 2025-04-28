import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileData } from '@narrow-ai-matchmaker/common';
import { ContentExtractionService } from '@backend/content-extraction/content-extraction.service';

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
        private readonly contentExtractionService: ContentExtractionService,
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

    async processProfileUpdate(userId: string, transcriptText: string): Promise<Profile> {
        this.logger.log(`Processing profile update for user: ${userId} using transcript`);
        
        const profile = await this.profileRepository.findOne({ where: { userId } });
        if (!profile) {
            throw new NotFoundException(`Profile for user ${userId} not found`);
        }
        
        const profileSchema = { 
            type: 'object', 
            properties: { 
                name: { type: 'string' }, 
                interests: { type: 'array', items: { type: 'string' } } 
            }, 
            required: ['name'] 
        };
        
        const profileInstructions = "Extract the user's name and key interests mentioned in the provided text transcript.";
        
        // Extract profile data from text transcript
        const extractedProfileData = await this.contentExtractionService.extractStructuredDataFromText(
            transcriptText,
            profileSchema,
            profileInstructions
        );
        
        // Update profile with extracted data
        profile.data = extractedProfileData;
        return this.save(profile);
    }
}