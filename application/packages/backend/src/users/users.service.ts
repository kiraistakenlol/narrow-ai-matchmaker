import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}

    async createUnauthenticatedUser(): Promise<User> {
        this.logger.log('Creating new unauthenticated user record');
        const newUser = this.userRepository.create();
        try {
            const savedUser = await this.userRepository.save(newUser);
            this.logger.log(`Created user with internal ID: ${savedUser.id}`);
            return savedUser;
        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create user: ${message}`, stack);
            throw new InternalServerErrorException('Failed to create user record.');
        }
    }

    async findUserWithProfileById(externalId: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: { externalId: externalId },
            relations: ['profile'],
        });
        return user;
    }
} 