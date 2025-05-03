// Using interface as it's just a data shape
export interface PresignedUrlResponseDto {
    upload_url: string; // Matches OpenAPI schema field name
    s3_key: string;     // Matches OpenAPI schema field name
} 