variable "project_name" {
  description = "A name for the project to prefix resources."
  type        = string
  default     = "narrow-ai-matchmaker"
}

variable "aws_region" {
  description = "AWS region for deployment."
  type        = string
  default     = "us-east-1" # Or your preferred region
}

variable "environment" {
  description = "Deployment environment (e.g., dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "frontend_url" {
  description = "The base URL of the deployed frontend application (used for Cognito callbacks)."
  type        = string
  default     = "http://localhost:5173" # Default for local dev, update for deployment
}

variable "google_client_id" {
  description = "Google OAuth Client ID for Cognito Identity Provider."
  type        = string
  sensitive   = true
  # No default - must be provided
}

variable "google_client_secret" {
  description = "Google OAuth Client Secret for Cognito Identity Provider."
  type        = string
  sensitive   = true
  # No default - must be provided
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