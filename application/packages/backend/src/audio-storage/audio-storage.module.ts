import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { IAudioStorageService } from './audio-storage.interface'; // Removed
import { S3AudioStorageService } from './s3-audio-storage.service';

@Module({
    imports: [ConfigModule],
    providers: [
        // Directly provide and export S3AudioStorageService
        S3AudioStorageService,
    ],
    exports: [S3AudioStorageService], // Export the concrete service
})
export class AudioStorageModule {} 