import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    ConfigModule, // To allow AuthService to access config
    TypeOrmModule.forFeature([User]), // To allow AuthService to inject UserRepository
  ],
  controllers: [AuthController],
  providers: [AuthService],
  // exports: [AuthService] // Uncomment if other modules need AuthService
})
export class AuthModule {} 