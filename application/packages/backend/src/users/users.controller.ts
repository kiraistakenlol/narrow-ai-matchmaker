import { Controller, Get, UseGuards, Req, NotFoundException, Logger, Param, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { UserService } from './users.service';
import { UserDto, JoinedEventDto, MatchDto } from '@narrow-ai-matchmaker/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CognitoIdTokenPayload } from '../common/types/auth.types';
import { EventService } from '../events/events.service';
import { MatchesService } from '../matches/matches.service';

@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(
        private readonly usersService: UserService,
        private readonly eventService: EventService,
        private readonly matchesService: MatchesService,
    ) { }

    @Get('me')
    @UseGuards(AuthenticatedGuard)
    async getMyProfile(@CurrentUser() currentUser: CognitoIdTokenPayload): Promise<UserDto> {

        const userId = currentUser.sub;
        if (!userId) {
            this.logger.error('AuthenticatedGuard passed but no user identifier (sub) found in payload.');
            throw new NotFoundException('User identifier not found after authentication.');
        }

        const userWithProfile = await this.usersService.findUserWithProfileByExternalId(userId);

        if (!userWithProfile) {
            this.logger.error('User data not found.');
            throw new UnauthorizedException('User data not found.');
        }

        const userDto: UserDto = {
            id: userWithProfile.id,
            email: userWithProfile.email ?? '',
            onboardingComplete: userWithProfile.onboardingComplete,
            profile: userWithProfile.profile ? userWithProfile.profile.data : null,
        };

        return userDto;
    }

    @Get('me/events')
    @UseGuards(AuthenticatedGuard)
    async listMyJoinedEvents(@CurrentUser() currentUser: CognitoIdTokenPayload): Promise<JoinedEventDto[]> {
        const userId = currentUser.sub;

        const joinedEventsData = await this.eventService.findJoinedEventsByUserId(userId);

        // Map the combined data to JoinedEventDto
        const joinedEventsDto: JoinedEventDto[] = joinedEventsData.map(({ event, participation }) => ({
            // Event fields
            id: event.id,
            name: event.name,
            description: event.description,
            startTime: event.startTime.toISOString(),
            endTime: event.endTime?.toISOString() ?? null,
            // Participation fields
            participationId: participation.id,
            contextData: participation.contextData,
        }));

        return joinedEventsDto;
    }

    @Get('me/matches')
    @UseGuards(AuthenticatedGuard)
    async getMyMatches(@CurrentUser() currentUser: CognitoIdTokenPayload): Promise<MatchDto[]> {
        this.logger.log(`User ${currentUser.sub} requested their top matches.`);
        const userId = currentUser.sub;
        if (!userId) {
            this.logger.error('AuthenticatedGuard passed but no user identifier (sub) found in payload.');
            throw new NotFoundException('User identifier not found after authentication.');
        }

        const user = await this.usersService.findUserWithProfileByExternalId(userId);
        if (!user) {
            this.logger.error(`User with external ID ${userId} not found.`);
            throw new NotFoundException('User not found.');
        }
        const matches = await this.matchesService.findTopMatches(user.id);
        return matches;
    }

    @Get(':id')
    async getUserProfile(
        @Param('id') id: string): Promise<UserDto> {
        this.logger.log(`Getting profile for user ID: ${id}`);

        const user = await this.usersService.findUserWithProfileById(id);

        if (!user) {
            this.logger.error(`User with ID ${id} not found.`);
            throw new NotFoundException(`User not found.`);
        }

        // Return the user data in DTO format
        const userDto: UserDto = {
            id: user.id,
            email: user.email ?? '',
            onboardingComplete: user.onboardingComplete,
            profile: user.profile ? user.profile.data : null,
        };

        return userDto;
    }
} 