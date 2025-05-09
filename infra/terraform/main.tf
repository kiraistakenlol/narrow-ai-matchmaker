# --- S3 Bucket for Audio Uploads ---

resource "aws_s3_bucket" "audio_bucket" {
  bucket = var.s3_audio_bucket_name
  tags   = var.common_tags
}

resource "aws_s3_bucket_cors_configuration" "audio_bucket_cors" {
  bucket = aws_s3_bucket.audio_bucket.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["PUT", "POST", "GET", "HEAD"]
    allowed_origins = ["http://localhost:5173", "https://narrow-ai-matchmaker-web-app.vercel.app"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# --- S3 Bucket for AWS Transcribe Output ---

resource "aws_s3_bucket" "transcribe_bucket" {
  bucket = var.s3_transcribe_bucket_name
  tags   = var.common_tags
}

output "transcribe_bucket_arn" {
  value = aws_s3_bucket.transcribe_bucket.arn
}

output "transcribe_bucket_name" {
  value = aws_s3_bucket.transcribe_bucket.id
}

# Create a random element for unique naming 
resource "random_pet" "unique_suffix" {
  length = 2
}

# --- AWS Cognito Resources --- 

resource "aws_cognito_user_pool" "main" {
  name = "${var.project_name}-user-pool-${var.environment}"

  # Configure required attributes, email is common
  schema {
    name                = "email"
    attribute_data_type = "String"
    mutable             = true
    required            = true
  }

  auto_verified_attributes = ["email"]

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = "${var.project_name}-${var.environment}-${random_pet.unique_suffix.id}" # Use the renamed random_pet resource
  user_pool_id = aws_cognito_user_pool.main.id
}

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "email profile openid"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub" # Map Google's sub to Cognito username
  }

  lifecycle {
    ignore_changes = [
      provider_details,
    ]
  }
}

resource "aws_cognito_user_pool_client" "web_frontend" {
  name         = "${var.project_name}-web-client-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  # Enable Google provider for this client
  supported_identity_providers = ["COGNITO", "Google"] # Allow both Cognito native and Google login

  # OAuth settings
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"] # Authorization Code Grant flow
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  # URLs where Cognito can redirect after login/logout
  callback_urls = [
    "http://localhost:5173/auth/callback",
    "https://narrow-ai-matchmaker-web-app.vercel.app/auth/callback"
  ]
  logout_urls   = [
    "http://localhost:5173/",
    "https://narrow-ai-matchmaker-web-app.vercel.app/"
  ]

  # Prevent client secret generation for public clients like web apps
  generate_secret = false
} 