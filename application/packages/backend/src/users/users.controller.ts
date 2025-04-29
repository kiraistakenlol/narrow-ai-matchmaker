import { Controller, Get, UseGuards, Req, NotFoundException, Logger, Param, ExecutionContext, createParamDecorator } from '@nestjs/common';
import { UserService } from './users.service';
import { UserDto } from '@narrow-ai-matchmaker/common';
import { AuthenticatedGuard } from '../auth/guards/authenticated.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CognitoIdTokenPayload } from '../common/types/auth.types';

@Controller('users')
export class UsersController {
    private readonly logger = new Logger(UsersController.name);

    constructor(private readonly usersService: UserService) {}

    @Get('me')
    @UseGuards(AuthenticatedGuard)
    async getMyProfile(@CurrentUser() currentUser: CognitoIdTokenPayload): Promise<UserDto> {
        this.logger.log(`Fetching profile for current user: ${currentUser.sub}`);
        
        const userId = currentUser.sub;
        if (!userId) {
            this.logger.error('AuthenticatedGuard passed but no user identifier (sub) found in payload.');
            throw new NotFoundException('User identifier not found after authentication.');
        }

        const userWithProfile = await this.usersService.findUserWithProfileById(userId);

        this.logger.log(`User with profile: ${JSON.stringify(userWithProfile)}`);
        // Map the User entity to UserDto
        const userDto: UserDto = {
            id: userWithProfile.id,
            email: userWithProfile.email ?? '', // Provide default or handle potential null
            profile: userWithProfile.profile ? userWithProfile.profile.data : null,
        };

        return userDto;
    }
} 