import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class AuthenticatedGuard implements CanActivate {
    canActivate(
        context: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();

        // Check if the AuthMiddleware successfully attached a user
        if (request.user) {
            return true; // User is authenticated, allow access
        }

        // No user attached, throw Unauthorized
        throw new UnauthorizedException('Authentication required for this route');
    }
} 