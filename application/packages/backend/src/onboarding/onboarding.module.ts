import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([OnboardingSession]),
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule {} 