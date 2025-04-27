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
     * Deletes an audio file from storage.
     * @param key - The storage key/path of the file to delete.
     */
    deleteAudio(key: string): Promise<void>;

}

export const IAudioStorageService = Symbol('IAudioStorageService'); 