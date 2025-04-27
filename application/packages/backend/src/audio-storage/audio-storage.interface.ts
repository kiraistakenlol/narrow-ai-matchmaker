export interface UploadResult {
    storagePath: string;
    url?: string;
}

export interface PresignedUrlResult {
    uploadUrl: string;
    storagePath: string;
}

export interface IAudioStorageService {
    /**
     * Generates a presigned URL for uploading a file directly to storage.
     * @param key - The intended storage key/path for the file.
     * @param contentType - The MIME type of the file to be uploaded.
     * @param expiresInSeconds - Duration for which the URL should be valid.
     */
    generatePresignedUploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<PresignedUrlResult>;

    /**
     * Saves an audio buffer to the configured storage.
     * @param buffer - The audio data buffer.
     * @param key - The desired storage key/path.
     * @param contentType - The MIME type of the audio.
     */
    saveAudio(buffer: Buffer, key: string, contentType: string): Promise<UploadResult>;

    /**
     * Deletes an audio file from storage.
     * @param key - The storage key/path of the file to delete.
     */
    deleteAudio(key: string): Promise<void>;

}

export const IAudioStorageService = Symbol('IAudioStorageService'); 