import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
// import * as bodyParser from 'body-parser'; // Remove import if no longer needed

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        // rawBody: true, // Consider if this NestFactory option is still needed without the explicit parser
    });
    const configService = app.get(ConfigService);
    const port = configService.get<number>('app.port'); // Ensure config key matches configuration.ts
    const host = configService.get<string>('app.host'); // Ensure config key matches configuration.ts

    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
    });

    app.setGlobalPrefix('api/v1'); // Set global API prefix
    app.useGlobalFilters(new GlobalHttpExceptionFilter()); // Apply the filter globally

    // app.use(bodyParser.raw({ type: '*/*', limit: '50mb' })); // REMOVE THIS LINE

    await app.listen(port, host); // Listen on specified host
    Logger.log(`🚀 Application is running on: http://${host}:${port}/api/v1`);
}
bootstrap(); 