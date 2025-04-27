import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { UsersModule } from '@backend/users/users.module';
import { ProfilesModule } from '@backend/profiles/profiles.module';
import { EventsModule } from '@backend/events/events.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([OnboardingSession]),
        UsersModule,
        ProfilesModule,
        EventsModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule {} 