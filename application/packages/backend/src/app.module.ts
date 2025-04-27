import { Module } from '@nestjs/common';
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
import { ContentExtractionModule } from './content-extraction/content-extraction.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
            load: [configuration],
            validationSchema: configValidationSchema,
            validationOptions: {
                allowUnknown: true,
                abortEarly: false,
            },
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('database.host'),
                port: configService.get<number>('database.port'),
                username: configService.get<string>('database.username'),
                password: configService.get<string>('database.password'),
                database: configService.get<string>('database.database'),
                entities: [],
                synchronize: false,
                autoLoadEntities: true,
            }),
        }),
        AudioStorageModule,
        TranscriptionModule,
        LlmModule,
        UsersModule,
        ProfilesModule,
        EventsModule,
        OnboardingModule,
        ContentExtractionModule,
    ],
    controllers: [HealthController],
    providers: [],
})
export class AppModule {} 