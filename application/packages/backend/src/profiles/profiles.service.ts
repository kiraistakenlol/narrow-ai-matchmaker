import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from './entities/profile.entity';

@Injectable()
export class ProfileService {
    private readonly logger = new Logger(ProfileService.name);

    constructor(
        @InjectRepository(Profile)
        private profileRepository: Repository<Profile>,
    ) {}

    async createInitialProfile(userId: string, onboardingId: string): Promise<Profile> {
        this.logger.log(`Creating initial profile for user: ${userId}, onboarding: ${onboardingId}`);
        const newProfile = this.profileRepository.create({
            userId: userId,
            onboardingId: onboardingId,
            data: {},
            completenessScore: 0,
        });
        try {
            const savedProfile = await this.profileRepository.save(newProfile);
            this.logger.log(`Created profile with ID: ${savedProfile.id}`);
            return savedProfile;
        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create profile for user ${userId}: ${message}`, stack);
            throw new InternalServerErrorException('Failed to create profile record.');
        }
    }

} 