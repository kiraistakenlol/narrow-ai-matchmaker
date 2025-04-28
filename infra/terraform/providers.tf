terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0" # Specify a suitable version constraint
    }
  }

  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region

  # Explicitly use the 'personal' AWS profile
  profile = "personal"

  # Alternatively, could use environment variables or other auth methods
} 