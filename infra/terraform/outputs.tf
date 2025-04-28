output "audio_bucket_name" {
  description = "The name of the S3 bucket created for audio files."
  value       = aws_s3_bucket.audio_bucket.bucket
}

output "audio_bucket_arn" {
  description = "The ARN of the S3 bucket created for audio files."
  value       = aws_s3_bucket.audio_bucket.arn
} 