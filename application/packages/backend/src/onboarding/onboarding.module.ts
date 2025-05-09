import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { UsersModule } from '@backend/users/users.module';
import { ProfilesModule } from '@backend/profiles/profiles.module';
import { EventsModule } from '@backend/events/events.module';
import { ContentSynthesisModule } from '@backend/content-synthesis/content-synthesis.module';
import { Profile } from '@backend/profiles/entities/profile.entity';
import { EventParticipation } from '@backend/events/entities/event-participation.entity';
import { AudioStorageModule } from '@backend/audio-storage/audio-storage.module';
import { TranscriptionModule } from '@backend/transcription/transcription.module';
import { ProfileValidationModule } from '../profile-validation/profile-validation.module';
import { AuthModule } from '../auth/auth.module';
import { MatchesModule } from '../matches/matches.module';

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
        ContentSynthesisModule,
        AudioStorageModule,
        TranscriptionModule,
        ProfileValidationModule,
        forwardRef(() => AuthModule),
        MatchesModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
    exports: [OnboardingService]
})
export class OnboardingModule {} 