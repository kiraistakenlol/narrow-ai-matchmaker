import { Injectable, Logger, OnModuleInit, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { UploadResult, IAudioStorageService, PresignedUrlResult } from '../audio-storage.interface';

@Injectable()
export class LocalAudioStorageService implements IAudioStorageService, OnModuleInit {
    private readonly logger = new Logger(LocalAudioStorageService.name);
    private storagePath: string;

    constructor(private configService: ConfigService) {}

    async onModuleInit() {
        this.storagePath = this.configService.get<string>('AUDIO_LOCAL_STORAGE_PATH');
        if (!this.storagePath) {
            throw new InternalServerErrorException('AUDIO_LOCAL_STORAGE_PATH environment variable is not set.');
        }
        this.storagePath = path.resolve(this.storagePath); // Ensure absolute path
        try {
            await fs.mkdir(this.storagePath, { recursive: true });
            this.logger.log(`Local storage directory ensured at: ${this.storagePath}`);
        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to create storage directory: ${this.storagePath}`, stack);
            throw new InternalServerErrorException('Failed to initialize local audio storage directory.');
        }
    }

    async generatePresignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<PresignedUrlResult> {
        this.logger.warn('Presigned URL generation is not applicable for local storage.');
        // In a real scenario for local dev, you might return a placeholder URL
        // that the frontend could use to POST directly to a specific backend endpoint.
        // For now, we throw an error or return an unusable structure.
        throw new Error('Local storage does not support presigned upload URLs.');
    }

    async saveAudio(buffer: Buffer, key: string, contentType: string): Promise<UploadResult> {
        const filePath = path.join(this.storagePath, key);
        const dirPath = path.dirname(filePath);

        try {
            await fs.mkdir(dirPath, { recursive: true });
            await fs.writeFile(filePath, buffer);
            this.logger.log(`Saved audio file locally to: ${filePath}`);
            return { storagePath: key }; // Return the relative key
        } catch (error) {
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to save audio file to ${filePath}`, stack);
            throw new InternalServerErrorException('Failed to save audio file locally.');
        }
    }

    async deleteAudio(key: string): Promise<void> {
        const filePath = path.join(this.storagePath, key);
        try {
            await fs.unlink(filePath);
            this.logger.log(`Deleted audio file locally: ${filePath}`);
            // Optionally, attempt to remove empty directories recursively upwards
            // Be cautious with recursive deletion in production scenarios
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                // File not found is acceptable for deletion
                this.logger.warn(`Attempted to delete non-existent file: ${filePath}`);
                return;
            }
            const stack = error instanceof Error ? error.stack : undefined;
            this.logger.error(`Failed to delete audio file ${filePath}`, stack);
            throw new InternalServerErrorException('Failed to delete audio file locally.');
        }
    }
} 