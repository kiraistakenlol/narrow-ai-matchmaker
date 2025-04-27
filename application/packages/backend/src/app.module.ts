import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingModule } from './onboarding/onboarding.module';
import { HealthController } from './health/health.controller';
import { AudioStorageModule } from './audio-storage/audio-storage.module';
import { UsersModule } from './users/users.module';
import { ProfilesModule } from './profiles/profiles.module';
import { EventsModule } from './events/events.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DB_HOST'),
                port: configService.get<number>('DB_PORT'),
                username: configService.get<string>('DB_USERNAME'),
                password: configService.get<string>('DB_PASSWORD'),
                database: configService.get<string>('DB_DATABASE'),
                entities: [],
                synchronize: false,
                autoLoadEntities: true,
            }),
        }),
        AudioStorageModule,
        UsersModule,
        ProfilesModule,
        EventsModule,
        OnboardingModule,
    ],
    controllers: [HealthController],
    providers: [],
})
export class AppModule {} 