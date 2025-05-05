import { Module } from '@nestjs/common';
import { ProfileValidationService } from './profile-validation.service';

@Module({
    providers: [ProfileValidationService],
    exports: [ProfileValidationService], // Export if other modules need it
})
export class ProfileValidationModule {} 