import { Module, Logger, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingModule } from './onboarding/onboarding.module';
import { HealthController } from './health/health.controller';
import { AudioStorageModule } from './audio-storage/audio-storage.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { EventsModule } from './events/events.module';
import { configuration, configValidationSchema } from './config';
import { TranscriptionModule } from './transcription/transcription.module';
import { LlmModule } from './llm/llm.module';
import { ContentSynthesisModule } from '@backend/content-synthesis/content-synthesis.module';
import { AuthModule } from './auth/auth.module';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { JwtModule } from '@nestjs/jwt';
import { DevModule } from './dev/dev.module';
import { ProfileValidationModule } from './profile-validation/profile-validation.module';
import { MatchesModule } from './matches/matches.module';
import { EmbeddingModule } from './embedding/embedding.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: [
                `.env.${process.env.NODE_ENV || 'development'}`,
                '.env' 
            ],
            load: [configuration],
            validationSchema: configValidationSchema,
            validationOptions: {
                allowUnknown: true,
                abortEarly: false,
            },
        }),
        JwtModule.register({}),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const logger = new Logger('AppModule');
                logger.debug('Loaded configuration:', JSON.stringify(configService.get('')));

                return {
                    type: 'postgres',
                    host: configService.get<string>('database.host'),
                    port: configService.get<number>('database.port'),
                    username: configService.get<string>('database.username'),
                    password: configService.get<string>('database.password'),
                    database: configService.get<string>('database.database'),
                    entities: [],
                    synchronize: false,
                    autoLoadEntities: true,
                    ssl: configService.get<string>('database.ssl') === 'true' ? {
                        rejectUnauthorized: false
                    } : false
                };
            },
        }),
        AudioStorageModule,
        TranscriptionModule,
        LlmModule,
        UsersModule,
        ProfilesModule,
        EventsModule,
        OnboardingModule,
        ContentSynthesisModule,
        AuthModule,
        DevModule,
        ProfileValidationModule,
        MatchesModule,
        EmbeddingModule,
    ],
    controllers: [HealthController],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(RequestLoggerMiddleware).forRoutes('*');

        consumer
            .apply(AuthMiddleware)
            .forRoutes('*');
    }
} 