import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch() // Catch all exceptions if not caught by more specific filters
export class GlobalHttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.message
                : 'Internal server error';

        // Log the error
        if (status >= 500) {
            this.logger.error(`HTTP Status: ${status} Error Message: ${message}`, (exception as Error).stack);
        } else {
            this.logger.warn(`HTTP Status: ${status} Error Message: ${message}`);
        }

        const errorResponse = {
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            // Consistent with OpenAPI Error schema (code/message)
            error: {
                code: exception instanceof HttpException ? exception.constructor.name : 'InternalServerError',
                message: message,
                // Include validation errors if available (e.g., from class-validator)
                details: (exception instanceof HttpException && typeof exception.getResponse() === 'object') ? (exception.getResponse() as any).message : undefined,
            },
        };

        response.status(status).json(errorResponse);
    }
} 