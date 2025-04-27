import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const port = configService.get<number>('APP_PORT'); // Use the port from .env
    const host = configService.get<string>('APP_HOST'); // Get APP_HOST

    app.setGlobalPrefix('api/v1'); // Set global API prefix
    app.useGlobalFilters(new GlobalHttpExceptionFilter()); // Apply the filter globally

    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://${host}:${port}/api/v1`);
}
bootstrap(); 