import { Controller, Put, Param, Req, Body, RawBodyRequest, Logger, HttpException, HttpStatus, InternalServerErrorException, UnsupportedMediaTypeException } from '@nestjs/common';
import { Request } from 'express';
import { LocalAudioStorageService } from './impl/local-audio-storage.service';

@Controller('_local-upload')
export class LocalUploadController {
    private readonly logger = new Logger(LocalUploadController.name);

    constructor(
        private readonly localAudioStorageService: LocalAudioStorageService,
    ) {}

    @Put(':key(*)')
    async uploadLocalAudio(
        @Param('key') encodedKey: string,
        @Req() req: RawBodyRequest<Request>,
        @Body() rawBody: Buffer,
    ) {
        if (!req.readable) {
            this.logger.error('Request stream is not readable for local upload');
            throw new InternalServerErrorException('Request stream error');
        }
        if (!rawBody || rawBody.length === 0) {
             this.logger.error('Request body is empty for local upload');
             throw new HttpException('Request body is empty', HttpStatus.BAD_REQUEST);
        }

        const key = decodeURIComponent(encodedKey);
        const contentType = req.headers['content-type'];

        if (!contentType) {
             this.logger.error('Missing Content-Type header for local upload');
             throw new UnsupportedMediaTypeException('Content-Type header is required');
        }

        this.logger.log(`Received local upload for key: ${key}, size: ${rawBody.length}, type: ${contentType}`);

        try {
            await this.localAudioStorageService.saveAudio(rawBody, key, contentType);
            return;
        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to save local upload for key ${key}`, stack);
            throw new InternalServerErrorException('Failed to store uploaded file.');
        }
    }
} 