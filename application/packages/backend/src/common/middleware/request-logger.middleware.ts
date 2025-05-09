import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('RequestLogger');

    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl } = req;
        this.logger.log(`Incoming Request: ${method} ${originalUrl}`);
        next();
    }
} 