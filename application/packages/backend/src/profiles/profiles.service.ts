import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';
import { ProfileData } from '@narrow-ai-matchmaker/common';
import { ContentSynthesisService } from '@backend/content-synthesis/content-synthesis.service';
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
    extra_notes: null,
});

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);
    private readonly profileSchema: object;

    constructor(
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
        private readonly contentSynthesisService: ContentSynthesisService,
    ) {
        // Load the profile schema from the JSON file
        try {
            const schemaPath = path.join(__dirname, '..', '..', 'resources', 'profile_schema.json');
            const schemaContent = fs.readFileSync(schemaPath, 'utf8');
            this.profileSchema = JSON.parse(schemaContent);
            this.logger.log('Profile schema loaded successfully');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to load profile schema: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to load profile schema');
        }
    }

    async findProfileById(profileId: string): Promise<Profile | null> {
        this.logger.log(`Finding profile by ID: ${profileId}`);
        try {
            const profile = await this.profileRepository.findOneBy({ id: profileId });
            if (profile) {
                this.logger.log(`Found profile with ID ${profileId}`);
            } else {
                this.logger.log(`No profile found with ID ${profileId}`);
            }
            return profile;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find profile with ID ${profileId}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not retrieve profile by ID.');
        }
    }
    
    async findProfileByUserId(userId: string): Promise<Profile | null> {
        this.logger.log(`Finding profile for user: ${userId}`);
        try {
            const profile = await this.profileRepository.findOneBy({ userId: userId });
            if (profile) {
                this.logger.log(`Found profile ${profile.id} for user ${userId}`);
            } else {
                this.logger.log(`No profile found for user ${userId}`);
            }
            return profile;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find profile for user ${userId}: ${message}`, error instanceof Error ? error.stack : undefined);
            // Depending on the use case, you might just return null or throw
            throw new InternalServerErrorException('Could not retrieve profile by user ID.');
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
        const { extractedData } = await this.contentSynthesisService.extractStructuredDataFromText<ProfileData>(
            profile.data?.raw_input ? `${profile.data.raw_input}; ${transcriptText}` : transcriptText,
            this.profileSchema
        );
        
        // Update profile with extracted data
        const mergedProfile = await this.contentSynthesisService.mergeProfileData(profile.data, extractedData);
        profile.data = mergedProfile;
  
        return this.save(profile);
    }

    async findAllWithData(): Promise<Profile[]> {
        this.logger.log(`Finding all profiles with their data.`);
        try {
            const profiles = await this.profileRepository.find();
            this.logger.log(`Found ${profiles.length} profiles.`);
            return profiles;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to find all profiles: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Could not retrieve all profiles.');
        }
    }
}