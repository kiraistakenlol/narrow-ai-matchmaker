output "audio_bucket_name" {
  description = "The name of the S3 bucket created for audio files."
  value       = aws_s3_bucket.audio_bucket.bucket
}

output "audio_bucket_arn" {
  description = "The ARN of the S3 bucket created for audio files."
  value       = aws_s3_bucket.audio_bucket.arn
}

# Cognito Outputs
output "cognito_user_pool_id" {
  description = "The ID of the Cognito User Pool."
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_client_id" {
  description = "The ID of the Cognito User Pool Client for the web frontend."
  value       = aws_cognito_user_pool_client.web_frontend.id
}

output "cognito_domain" {
  description = "The domain prefix for the Cognito User Pool hosted UI."
  value       = aws_cognito_user_pool_domain.main.domain
}

output "cognito_endpoint" {
  description = "The full endpoint URL for the Cognito User Pool hosted UI."
  value       = "https://${aws_cognito_user_pool_domain.main.domain}.auth.${var.aws_region}.amazoncognito.com"
} 