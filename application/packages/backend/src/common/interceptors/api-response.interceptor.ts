import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, NotFoundException, HttpStatus } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse } from '@narrow-ai-matchmaker/common';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
    intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
        const httpContext = context.switchToHttp();
        const response = httpContext.getResponse();

        return next
            .handle()
            .pipe(
                map(data => {
                    console.log('ApiResponseInterceptor: data', data);
                    // Prevent double wrapping if already an ApiResponse
                    if (data instanceof ApiResponse) {
                        // If controller explicitly returned ApiResponse, respect it
                        // Set status code based on whether data exists, if needed, although controller should set it.
                        // Or simply ensure 200 is set here.
                        response.status(HttpStatus.OK); 
                        return data as ApiResponse<T>; 
                    }
                    // Otherwise, wrap the successful data
                    response.status(HttpStatus.OK); // Ensure 200 for successful wraps
                    return new ApiResponse(data);
                }),
                catchError(error => {
                    if (error instanceof NotFoundException) {
                        // Transform NotFoundException to a 200 OK with null data
                        response.status(HttpStatus.OK);
                        return of(new ApiResponse<T>(null));
                    }
                    // Re-throw other errors to be handled by GlobalHttpExceptionFilter
                    // It will set appropriate status codes (400, 500, etc.)
                    throw error;
                })
            );
    }
} 