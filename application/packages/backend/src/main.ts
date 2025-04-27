import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import * as bodyParser from 'body-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        rawBody: true,
    });
    const configService = app.get(ConfigService);
    const port = configService.get<number>('APP_PORT'); // Use the port from .env
    const host = configService.get<string>('APP_HOST'); // Get APP_HOST

    app.setGlobalPrefix('api/v1'); // Set global API prefix
    app.useGlobalFilters(new GlobalHttpExceptionFilter()); // Apply the filter globally

    app.use(bodyParser.raw({ type: '*/*', limit: '50mb' }));

    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://${host}:${port}/api/v1`);
}
bootstrap(); 