import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { IAudioStorageService, PresignedUrlResult } from '../audio-storage.interface'; // Removed
import { Readable } from 'stream';
// import { randomUUID } from 'crypto'; // Remove this import

// Define PresignedUrlResult locally or move to a shared types file
// Revert interface back
export interface PresignedUrlResult {
    uploadUrl: string;
    storagePath: string;
    // generatedId: string; // Remove this
}

@Injectable()
// export class S3AudioStorageService implements IAudioStorageService { // Removed implements
export class S3AudioStorageService {
    private readonly logger = new Logger(S3AudioStorageService.name);
    private readonly s3Client: S3Client;
    private readonly bucketName: string;
    private readonly region: string;
    private readonly presignedUrlExpiresIn = 3600; // Default: 1 hour

    constructor(private configService: ConfigService) {
        this.logger.log('Initializing S3AudioStorageService...');
        this.region = this.configService.get<string>('transcription.aws.region');
        this.bucketName = this.configService.get<string>('audioStorage.s3Bucket');
        this.logger.log(`Read AWS_REGION from config: ${this.region}`);
        this.logger.log(`Read AWS_S3_BUCKET_AUDIO from config: ${this.bucketName}`);

        const accessKeyId = this.configService.get<string>('transcription.aws.accessKeyId');
        const secretAccessKey = this.configService.get<string>('transcription.aws.secretAccessKey');

        if (!this.region || !this.bucketName) {
             this.logger.error(`Configuration missing! Region: ${this.region}, Bucket: ${this.bucketName}`);
            throw new Error('AWS region and S3 audio bucket name must be configured.');
        }

        const credentials = accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;

        this.s3Client = new S3Client({ region: this.region, credentials });
        this.logger.log(`S3AudioStorageService initialized for region ${this.region} and bucket ${this.bucketName}`);
    }

    async generatePresignedUploadUrl(
        key: string, // Add key parameter back
        contentType: string
    ): Promise<PresignedUrlResult> { // Update return type
        this.logger.log(`Generating presigned URL for key: ${key}, contentType: ${contentType}`);
        try {
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                ContentType: contentType,
            });
            const uploadUrl = await getSignedUrl(this.s3Client, command, {
                expiresIn: this.presignedUrlExpiresIn,
            });

            this.logger.log(`Generated presigned URL successfully for key: ${key}`);
            return {
                uploadUrl,
                storagePath: key, // The final path in S3 is the key itself
                // generatedId: generatedId, // Remove generatedId from return
            };
        } catch (error) {
            this.logger.error(`Failed to generate presigned URL for key ${key}`, error);
            throw new InternalServerErrorException(`Could not generate presigned URL for ${key}`);
        }
    }

    async getAudioStream(key: string): Promise<Readable> {
        this.logger.log(`Getting audio stream for key: ${key}`);
        const command = new GetObjectCommand({ Bucket: this.bucketName, Key: key });
        try {
            const { Body } = await this.s3Client.send(command);
            if (!Body || !(Body instanceof Readable)) {
                throw new Error('S3 GetObject response body is not a readable stream.');
            }
            this.logger.log(`Successfully retrieved stream for key: ${key}`);
            return Body;
        } catch (error: any) {
            if (error.name === 'NoSuchKey') {
                this.logger.error(`Audio file not found in S3: ${key}`);
                throw new NotFoundException(`Audio file not found: ${key}`);
            } else {
                this.logger.error(`Failed to get audio file from S3: ${key}`, error);
                throw new InternalServerErrorException(`Could not retrieve audio file: ${key}`);
            }
        }
    }

    async deleteAudio(key: string): Promise<void> {
        this.logger.log(`Deleting audio file from S3: ${key}`);
        const command = new DeleteObjectCommand({ Bucket: this.bucketName, Key: key });
        try {
            await this.s3Client.send(command);
            this.logger.log(`Successfully deleted audio file from S3: ${key}`);
        } catch (error: any) {
            // According to AWS SDK docs, deleteObject doesn't typically error if key doesn't exist
            // But we log other potential errors
            this.logger.error(`Failed to delete audio file from S3: ${key}`, error);
            // Don't throw NotFound, as the goal (file doesn't exist) is achieved
            // Throw for other errors (e.g., permissions)
            if (error.name !== 'NoSuchKey') { 
                throw new InternalServerErrorException(`Could not delete audio file: ${key}`);
            }
        }
    }

    /**
     * Constructs the S3 URI for a given key.
     * @param key The object key.
     * @returns The S3 URI string (e.g., s3://bucket-name/key).
     */
    getS3Uri(key: string): string {
        return `s3://${this.bucketName}/${key}`;
    }

    // saveAudioStream is removed as per interface change

} 