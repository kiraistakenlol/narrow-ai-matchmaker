import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserDto } from '@narrow-ai-matchmaker/common';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async createUnauthenticatedUser(): Promise<User> {
        this.logger.log('Creating new unauthenticated user...');
        try {
            const newUser = this.userRepository.create({}); // No externalId initially
            const savedUser = await this.userRepository.save(newUser);
            this.logger.log(`Created unauthenticated user with internal ID: ${savedUser.id}`);
            return savedUser;
        } catch (error) {
             const message = error instanceof Error ? error.message : 'Unknown database error';
             this.logger.error(`Failed to create unauthenticated user: ${message}`, error instanceof Error ? error.stack : undefined);
             throw new InternalServerErrorException('Could not create user.');
        }
    }

    async findById(id: string): Promise<User | null> {
        this.logger.log(`Finding user by internal ID: ${id}`);
        return this.userRepository.findOneBy({ id });
    }

    // New method to find user by external ID (e.g., Cognito sub)
    async findByExternalId(externalId: string): Promise<User | null> {
        this.logger.log(`Finding user by external ID: ${externalId}`);
        try {
            const user = await this.userRepository.findOneBy({ externalId: externalId });
            if (user) {
                this.logger.log(`Found user ${user.id} for external ID ${externalId}`);
            } else {
                this.logger.warn(`User with external ID ${externalId} not found.`);
            }
            return user;
        } catch (error) {
             const message = error instanceof Error ? error.message : 'Unknown database error';
             this.logger.error(`Failed to find user by external ID ${externalId}: ${message}`, error instanceof Error ? error.stack : undefined);
             throw new InternalServerErrorException('Could not retrieve user by external ID.');
        }
    }

    // New method to GET user by external ID, throwing if not found
    async getByExternalId(externalId: string): Promise<User> {
        this.logger.log(`Getting user by external ID: ${externalId}`);
        const user = await this.findByExternalId(externalId);
        if (!user) {
            this.logger.error(`User with external ID ${externalId} not found.`);
            throw new NotFoundException(`User with external ID ${externalId} not found`);
        }
        this.logger.log(`Successfully retrieved user ${user.id} for external ID ${externalId}`);
        return user;
    }

    async getUserDtoById(userId: string): Promise<UserDto | null> {
        this.logger.log(`Getting UserDto for internal ID: ${userId}`);
        const user = await this.findById(userId);
        if (!user) {
            return null;
        }
        // Map User entity to UserDto
        return {
            id: user.id,
            email: user.email ?? null, // Handle potential null email
            onboardingComplete: user.onboardingComplete,
            // Add other fields as needed, potentially loading relations like profile
        };
    }

    async findUserWithProfileById(externalId: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { externalId: externalId },
            relations: ['profile'],
        });
        return user;
    }

    /**
     * Saves a User entity to the database.
     */
    async save(user: User): Promise<User> {
        this.logger.log(`Saving user with ID: ${user.id}`);
        try {
            return await this.userRepository.save(user);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown database error';
            this.logger.error(`Failed to save user ${user.id}: ${message}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException(`Could not save user ${user.id}.`);
        }
    }

    async getById(id: string): Promise<User> {
        this.logger.log(`Getting user by ID: ${id}`);
        const user = await this.findById(id);
        if (!user) {
            this.logger.error(`User with ID ${id} not found.`);
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        this.logger.log(`Successfully retrieved user ${user.id}`);
        return user;
    }
} 