import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CognitoIdTokenPayload } from '../types/auth.types';

/**
 * Custom decorator to extract the user object (CognitoIdTokenPayload) 
 * attached to the request by AuthMiddleware, if present.
 * Returns undefined if no user is attached (user is not authenticated).
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): CognitoIdTokenPayload | undefined => {
        const request = ctx.switchToHttp().getRequest();
        // Return the user if it exists, otherwise return undefined
        return request.user;
    },
); 