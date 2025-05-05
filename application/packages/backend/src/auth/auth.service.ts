import { Injectable, Logger, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity'; // Assuming User entity location
import { LoginRequestDto } from './dto/login.request.dto';
import { UserDto } from '@narrow-ai-matchmaker/common'; // Corrected import path
import * as jose from 'jose'; // Import jose

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
        // @InjectRepository(OnboardingSession)
        // private readonly onboardingSessionRepository: Repository<OnboardingSession>,
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

    async login(dto: LoginRequestDto): Promise<UserDto> {
        this.logger.log(`Login request for token starting with: ${dto.id_token.substring(0, 10)}...`);

        // --- 1. Verify ID Token --- 
        let verifiedPayload: CognitoIdTokenPayload;
        try {
            this.logger.debug(`Attempting to verify token with issuer: ${this.cognitoIssuer}, audience: ${this.cognitoAudience}`);
            const { payload } = await jose.jwtVerify(
                dto.id_token,
                this.JWKS, // Provide the function to fetch the keys
                {
                    issuer: this.cognitoIssuer,
                    audience: this.cognitoAudience,
                    algorithms: ['RS256'], // Cognito uses RS256
                },
            );

            this.logger.debug('Token signature and claims verified successfully.');

            // Check token_use claim
            if (payload.token_use !== 'id') {
                this.logger.error(`Invalid token_use claim: ${payload.token_use}`);
                throw new UnauthorizedException('Token is not an ID token');
            }

            // Perform type assertion after checks
            verifiedPayload = payload as CognitoIdTokenPayload;
             if (!verifiedPayload.sub || !verifiedPayload.email) {
                 // This check might be redundant if jose.jwtVerify already ensures payload structure,
                 // but kept for explicit clarity.
                 this.logger.error('Verified token payload missing required fields (sub or email).');
                throw new UnauthorizedException('Invalid token payload structure');
            }

        } catch (error) {
            this.logger.error(`Token verification failed: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            if (error instanceof UnauthorizedException || error instanceof jose.errors.JWTExpired || error instanceof jose.errors.JWTClaimValidationFailed || error instanceof jose.errors.JWSSignatureVerificationFailed) {
                throw new UnauthorizedException('Invalid or expired ID token');
            }
            // Log other jose errors specifically if needed
            // else if (error instanceof jose.errors.JOSEError) { ... }
            throw new InternalServerErrorException('Token verification process failed');
        }

        const externalId = verifiedPayload.sub;
        const email = verifiedPayload.email;

        // --- 2. Find or Create User --- 
        let user: User;

        try {
            user = await this.userRepository.findOne({ where: { externalId } });

            if (user) {
                this.logger.log(`Found existing user by externalId: ${user.id}`);
                // Optionally update email if it was missing and provided in token
                if (!user.email && email) {
                    user.email = email;
                    await this.userRepository.save(user);
                    this.logger.log(`Updated email for existing user ${user.id}`);
                }
            } else {
                this.logger.log(`User not found by externalId ${externalId}, creating new user.`);
                user = this.userRepository.create({ externalId, email });
                await this.userRepository.save(user);
                this.logger.log(`Created new user with id: ${user.id}`);
            }
        } catch (error) {
            this.logger.error(`Error during user lookup/creation: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
            throw new InternalServerErrorException('Failed to process user information');
        }

        // --- 3. Return User DTO --- 
        this.logger.log(`Login successful for user ${user.id}.`);
        // Explicitly map to UserDto 
        const userDto: UserDto = {
            id: user.id,
            email: user.email!, // Non-null assertion okay due to logic above
            onboardingComplete: user.onboardingComplete,
        };
        return userDto;
    }

    // --- Helper for JWT Verification (Implement using jose or similar) ---
    // private async verifyCognitoToken(token: string): Promise<any> {
    //     // 1. Decode header to get kid
    //     // 2. Get signing key from JWKS client using kid
    //     // 3. Verify token signature, issuer, audience, expiration using jose.jwtVerify
    //     // Example:
    //     // const { payload } = await jose.jwtVerify(token, /* JWKS key function */, {
    //     //     issuer: this.cognitoIssuer,
    //     //     audience: this.cognitoAudience
    //     // });
    //     // return payload;
    //     throw new Error('Verification not implemented');
    // }
} 