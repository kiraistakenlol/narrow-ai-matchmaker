# --- S3 Bucket for Audio Uploads ---

resource "aws_s3_bucket" "audio_bucket" {
  bucket = var.s3_audio_bucket_name
  tags = var.common_tags
}

resource "aws_s3_bucket_cors_configuration" "audio_bucket_cors" {
  bucket = aws_s3_bucket.audio_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    # IMPORTANT: Update origins for production
    allowed_origins = ["http://localhost:*", "http://127.0.0.1:*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# --- S3 Bucket for AWS Transcribe Output ---

resource "aws_s3_bucket" "transcribe_bucket" {
  bucket = var.s3_transcribe_bucket_name
  tags = var.common_tags
}

output "transcribe_bucket_arn" {
  value = aws_s3_bucket.transcribe_bucket.arn
}

output "transcribe_bucket_name" {
  value = aws_s3_bucket.transcribe_bucket.id
} 