import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { TypeOrmModule } from '@nestjs/typeorm'; // Although service uses InjectDataSource, module might need context
import { EmbeddingModule } from '../embedding/embedding.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { MatchesModule } from '../matches/matches.module';
import { UsersModule } from '../users/users.module';
import { ProfileValidationModule } from '../profile-validation/profile-validation.module';

@Module({
    // Importing TypeOrmModule here might not be strictly necessary if DataSource is globally available,
    // but it makes the dependency clearer.
    imports: [
        TypeOrmModule.forFeature([]),
        EmbeddingModule,
        ProfilesModule,
        MatchesModule,
        UsersModule,
        ProfileValidationModule,
    ],
    controllers: [DevController],
    providers: [DevService],
})
export class DevModule {} 