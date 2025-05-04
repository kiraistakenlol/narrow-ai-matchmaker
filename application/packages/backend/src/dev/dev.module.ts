import { Module } from '@nestjs/common';
import { DevController } from './dev.controller';
import { DevService } from './dev.service';
import { TypeOrmModule } from '@nestjs/typeorm'; // Although service uses InjectDataSource, module might need context

@Module({
    // Importing TypeOrmModule here might not be strictly necessary if DataSource is globally available,
    // but it makes the dependency clearer.
    imports: [TypeOrmModule.forFeature([])], // Add entities here if service interacts with them directly
    controllers: [DevController],
    providers: [DevService],
})
export class DevModule {} 