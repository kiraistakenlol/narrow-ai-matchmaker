export interface ITranscriptionService {
    transcribeAudio(s3Key: string, languageCode?: string): Promise<string>;
} 