import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAudioStorageService } from './audio-storage.interface';
import { LocalAudioStorageService } from './impl/local-audio-storage.service';
import { LocalUploadController } from './local-upload.controller';
// Import S3AudioStorageService later when implemented
// import { S3AudioStorageService } from './impl/s3-audio-storage.service';

@Global()
@Module({
    imports: [],
    controllers: [LocalUploadController],
    providers: [
        LocalAudioStorageService,
        // S3AudioStorageService,
        {
            provide: IAudioStorageService,
            useFactory: (
                configService: ConfigService,
                localService: LocalAudioStorageService,
                // s3Service: S3AudioStorageService,
            ) => {
                const provider = configService.get<string>('AUDIO_STORAGE_PROVIDER');
                switch (provider?.toLowerCase()) {
                    case 'local':
                        return localService;
                    // case 's3':
                        // return s3Service;
                    default:
                        throw new Error(`Unsupported audio storage provider: ${provider}`);
                }
            },
            inject: [ConfigService, LocalAudioStorageService /*, S3AudioStorageService */],
        },
    ],
    exports: [IAudioStorageService, LocalAudioStorageService],
})
export class AudioStorageModule {} 