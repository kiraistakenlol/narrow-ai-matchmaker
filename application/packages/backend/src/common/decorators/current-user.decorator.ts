import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CognitoIdTokenPayload } from '../types/auth.types';

/**
 * Custom decorator to extract the user object (CognitoIdTokenPayload) 
 * attached to the request by AuthMiddleware.
 */
export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): CognitoIdTokenPayload | undefined => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
); 