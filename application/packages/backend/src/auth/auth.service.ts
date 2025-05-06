import { Injectable, Logger, UnauthorizedException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity'; // Assuming User entity location
import { LoginRequestDto } from '@narrow-ai-matchmaker/common';
import { UserDto } from '@narrow-ai-matchmaker/common'; // Corrected import path
import * as jose from 'jose'; // Import jose
import { OnboardingService } from '../onboarding/onboarding.service';
import { UserService } from '../users/users.service';

// Define a type for the expected payload structure (optional but good practice)
interface CognitoIdTokenPayload extends jose.JWTPayload {
    sub: string;
    email: string;
    token_use: 'id';
    // Add other claims you might need like name, preferred_username etc.
}

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private cognitoIssuer: string;
    private cognitoAudience: string; // This is the Cognito App Client ID
    private JWKS: jose.JWTVerifyGetKey; // Store the remote JWKS key set function

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly onboardingService: OnboardingService,
        private readonly userService: UserService,
    ) {
        const region = this.configService.get<string>('cognito.region');
        const userPoolId = this.configService.get<string>('cognito.userPoolId');
        this.cognitoAudience = this.configService.get<string>('cognito.clientId');
        this.cognitoIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

        // Create a remote JWKS set instance for fetching/caching Cognito keys
        this.JWKS = jose.createRemoteJWKSet(
            new URL(`${this.cognitoIssuer}/.well-known/jwks.json`),
        );
        this.logger.log(`AuthService initialized. Issuer: ${this.cognitoIssuer}, Audience: ${this.cognitoAudience}`);
    }

    private async verifyIdToken(idToken: string): Promise<CognitoIdTokenPayload> {
        this.logger.debug(`Attempting to verify token with issuer: ${this.cognitoIssuer}, audience: ${this.cognitoAudience}`);

        try {
            const { payload } = await jose.jwtVerify(
                idToken,
                this.JWKS,
                {
                    issuer: this.cognitoIssuer,
                    audience: this.cognitoAudience,
                    algorithms: ['RS256'],
                },
            );

            this.logger.debug('Token signature and claims verified successfully.');

            if (payload.token_use !== 'id') {
                this.logger.error(`Invalid token_use claim: ${payload.token_use}`);
                throw new UnauthorizedException('Token is not an ID token');
            }

            const verifiedPayload = payload as CognitoIdTokenPayload;
            if (!verifiedPayload.sub || !verifiedPayload.email) {
                this.logger.error('Verified token payload missing required fields (sub or email).');
                throw new UnauthorizedException('Invalid token payload structure');
            }

            return verifiedPayload;
        } catch (error) {
            this.logger.error(`Token verification failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            if (error instanceof UnauthorizedException || error instanceof jose.errors.JWTExpired || error instanceof jose.errors.JWTClaimValidationFailed || error instanceof jose.errors.JWSSignatureVerificationFailed) {
                throw new UnauthorizedException('Invalid or expired ID token');
            }
            throw new InternalServerErrorException('Token verification process failed');
        }
    }

    private async findOrCreateUser(externalId: string, email: string, onboardingId?: string): Promise<User> {
        if (onboardingId) {
            this.logger.log(`Onboarding ID provided: ${onboardingId}, attempting to link with user`);
            const onboarding = await this.onboardingService.getById(onboardingId);
            const user = await this.userService.getById(onboarding.userId);

            if (!user.externalId) {
                this.logger.log(`Found anonymous user ${user.id} from onboarding session, updating external ID and email`);
                user.externalId = externalId;
                user.email = email;
                return this.userRepository.save(user);
            } else {
                this.logger.log(`User ${user.id} already has external ID set, skipping update.`);
                return user;
            }
        }

        const existingUser = await this.userRepository.findOne({ where: { externalId } });
        if (existingUser) {
            return existingUser;
        }

        this.logger.log(`User not found by externalId ${externalId}, creating new user.`);
        const newUser = this.userRepository.create({ externalId, email });
        await this.userRepository.save(newUser);
        this.logger.log(`Created new user with id: ${newUser.id}`);
        return newUser;
    }

    async login(dto: LoginRequestDto): Promise<UserDto> {
        this.logger.log(`Login request for token starting with: ${dto.id_token.substring(0, 10)}...`);

        const verifiedPayload = await this.verifyIdToken(dto.id_token);
        const externalId = verifiedPayload.sub;
        const email = verifiedPayload.email;

        const user = await this.findOrCreateUser(externalId, email, dto.onboarding_id);

        this.logger.log(`Login successful for user ${user.id}.`);
        return {
            id: user.id,
            email: user.email!,
            onboardingComplete: user.onboardingComplete,
        } as UserDto;
    }
} 