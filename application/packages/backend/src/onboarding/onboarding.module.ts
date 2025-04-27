import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { UsersModule } from '@backend/users/users.module';
import { ProfilesModule } from '@backend/profiles/profiles.module';
import { EventsModule } from '@backend/events/events.module';
import { ContentExtractionModule } from '@backend/content-extraction/content-extraction.module';
import { Profile } from '@backend/profiles/entities/profile.entity';
import { EventParticipation } from '@backend/events/entities/event-participation.entity';
import { AudioStorageModule } from '@backend/audio-storage/audio-storage.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            OnboardingSession,
            Profile,
            EventParticipation,
        ]),
        UsersModule,
        ProfilesModule,
        EventsModule,
        ContentExtractionModule,
        AudioStorageModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule {} 