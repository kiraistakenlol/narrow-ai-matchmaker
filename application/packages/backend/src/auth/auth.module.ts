import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule, // To allow AuthService to access config
    TypeOrmModule.forFeature([User]), // To allow AuthService to inject UserRepository
    forwardRef(() => OnboardingModule), // Use forwardRef
    UsersModule
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule {} 