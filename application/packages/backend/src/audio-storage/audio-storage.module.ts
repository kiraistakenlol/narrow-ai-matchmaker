import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAudioStorageService } from './audio-storage.interface';
import { LocalAudioStorageService } from './impl/local-audio-storage.service';
// Import S3AudioStorageService later when implemented
// import { S3AudioStorageService } from './impl/s3-audio-storage.service';

@Global()
@Module({
    providers: [
        {
            provide: IAudioStorageService,
            useFactory: (configService: ConfigService) => {
                const provider = configService.get<string>('AUDIO_STORAGE_PROVIDER');

                switch (provider?.toLowerCase()) {
                    case 'local':
                        return new LocalAudioStorageService(configService);
                    // case 's3':
                        // return new S3AudioStorageService(configService /*, other deps like S3 client */);
                    default:
                        throw new Error(`Unsupported audio storage provider: ${provider}`);
                }
            },
            inject: [ConfigService],
        },
    ],
    exports: [IAudioStorageService],
})
export class AudioStorageModule {} 