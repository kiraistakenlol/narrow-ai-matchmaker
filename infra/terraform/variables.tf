variable "aws_region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1"
}

variable "s3_audio_bucket_name" {
  description = "Name for the audio S3 bucket"
  type        = string
  default     = "narrow-ai-matchmaker-audio"
}

variable "s3_transcribe_bucket_name" {
  description = "Name for the AWS Transcribe output bucket"
  type        = string
  default     = "narrow-ai-matchmaker-audio-transcribe-result"
}

variable "common_tags" {
  description = "Common tags to apply to all resources."
  type        = map(string)
  default = {
    Project     = "Narrow AI Matchmaker"
    Environment = "Dev"
    ManagedBy   = "Terraform"
  }
} 