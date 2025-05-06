import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { CognitoIdTokenPayload } from '../types/auth.types';

// Extend Express Request interface specifically for this payload type
// This provides better type safety than relying on (req as any)
declare global {
    namespace Express {
        interface Request {
            user?: CognitoIdTokenPayload;
        }
    }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    private readonly logger = new Logger(AuthMiddleware.name);

    constructor(
        private readonly jwtService: JwtService,
    ) {}

    async use(req: Request, res: Response, next: NextFunction) {
        const token = this.extractTokenFromHeader(req);

        // --- DEVELOPMENT ONLY: Skipping JWT validation --- 
        if (token) {
            try {
                // Decode and assert the expected type
                const payload = this.jwtService.decode(token) as CognitoIdTokenPayload;

                if (payload && typeof payload === 'object' && payload.sub) {
                // Attach the strongly-typed payload
                    req.user = payload;
                } else {
                     this.logger.warn('Failed to decode token or decoded payload is invalid/missing sub.');
                }
            } catch (error) {
                let message = 'Unknown token decoding error';
                if (error instanceof Error) {
                    message = error.message;
                }
                this.logger.warn(`Token decoding failed: ${message}`);
            }
        }
        // --- END DEVELOPMENT ONLY SECTION --- 

        // // --- PRODUCTION CODE (Example using verifyAsync with secret) ---
        // // const secret = this.configService.get<string>('jwt.secret');
        // // if (token && secret) {
        // //     try {
        // //         const payload = await this.jwtService.verifyAsync(token, { secret });
        // //         (req as any).user = payload;
        // //         this.logger.verbose(`User ${payload.sub || '?'} authenticated via token.`);
        // //     } catch (error) {
        // //         let message = 'Unknown token validation error';
        // //         if (error instanceof Error) { message = error.message; }
        // //         this.logger.warn(`Token validation failed: ${message}`);
        // //     }
        // // } else if (token && !secret) {
        // //     this.logger.error('JWT secret is missing, cannot validate token.');
        // // }
        // // --- END PRODUCTION CODE --- 

        next();
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
} 