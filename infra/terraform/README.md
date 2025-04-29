# Infrastructure (Terraform)

This directory contains the Terraform configuration for the Narrow AI Matchmaker infrastructure.

## AWS Cognito Configuration Outputs (after `terraform apply`)

These values are needed for the frontend and backend application configuration:

*   **AWS Region:** `us-east-1`
*   **Cognito User Pool ID:** `us-east-1_tVogU0bWH`
*   **Cognito User Pool Client ID (Web Frontend):** `2q87i5og3ot6q69ea28at0hrso`
*   **Cognito Domain Prefix:** `narrow-ai-matchmaker-dev-summary-gannet`
*   **Cognito Domain Endpoint:** `https://narrow-ai-matchmaker-dev-summary-gannet.auth.us-east-1.amazoncognito.com`

**Note:** Store sensitive variables like `google_client_id` and `google_client_secret` securely (e.g., in a `.gitignore'd `terraform.tfvars` file or environment variables), not in this README. 