import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileData } from '@narrow-ai-matchmaker/common';
import { ContentExtractionService } from '@backend/content-extraction/content-extraction.service';
import * as fs from 'fs';
import * as path from 'path';

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
    private readonly profileSchema: object;

    constructor(
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        private readonly contentExtractionService: ContentExtractionService,
    ) {
        // Load the profile schema from the JSON file
        try {
            // Use process.cwd() to get the workspace root directory
            const workspaceRoot = process.cwd();
            const schemaPath = path.join(workspaceRoot,'..', '..','..', 'profile', 'profile_schema.json')
            const schemaContent = fs.readFileSync(schemaPath, 'utf8');
            this.profileSchema = JSON.parse(schemaContent);
            this.logger.log('Profile schema loaded successfully');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to load profile schema: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to load profile schema');
        }
    }

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
        
        // Extract profile data from text transcript using the profile schema
        const { extractedData, suggestedNewEnumValues } = await this.contentExtractionService.extractStructuredDataFromText<ProfileData>(
            transcriptText,
            this.profileSchema
        );
        
        // Update profile with extracted data
        profile.data = extractedData;
        
        // Log any suggested new enum values for potential schema updates
        if (Object.keys(suggestedNewEnumValues).length > 0) {
            this.logger.log(`Suggested new enum values: ${JSON.stringify(suggestedNewEnumValues)}`);
        }
        
        return this.save(profile);
    }
}