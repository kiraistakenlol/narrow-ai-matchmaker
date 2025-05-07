import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserService } from './users.service';
import { UsersController } from './users.controller';
import { EventsModule } from '../events/events.module';
import { MatchesModule } from '../matches/matches.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    EventsModule,
    forwardRef(() => MatchesModule),
  ],
  providers: [UserService],
  exports: [UserService],
  controllers: [UsersController],
})
export class UsersModule {} 