# Infrastructure Overview

## AWS Services

### Core Services

1. **Amazon S3**
   - Audio file storage
   - Transcribe output storage
   - CORS configuration for frontend access

2. **AWS Cognito**
   - User authentication
   - Google OAuth integration
   - User pool configuration
   - Client app settings

3. **AWS Transcribe**
   - Audio transcription
   - Output to S3 bucket
   - Job management

4. **Amazon RDS (PostgreSQL)**
   - Main application database
   - User data storage
   - Profile information

### Infrastructure as Code

1. **Terraform Configuration**
   - Located in `infra/terraform/`
   - Manages:
     - S3 buckets
     - Cognito resources
     - IAM roles
     - Security groups

2. **Key Outputs**
   - Cognito User Pool ID
   - Cognito Client ID
   - S3 bucket names
   - API endpoints

## External Services

1. **Qdrant Cloud**
   - Vector database
   - Integrated with backend Docker image
   - Persistent storage via Fly.io volumes

2. **LLM Service Provider**
   - OpenAI integration
   - API key management
   - Model configuration

## Security

1. **IAM Roles**
   - Least privilege principle
   - Service-specific roles
   - Cross-service access

2. **Secrets Management**
   - Environment variables
   - AWS Secrets Manager
   - Fly.io secrets

## Monitoring

1. **AWS CloudWatch**
   - Service metrics
   - Log aggregation
   - Alarms

2. **Cost Management**
   - Budget alerts
   - Usage monitoring
   - Resource optimization

## Backup & Recovery

1. **Database Backups**
   - Automated RDS snapshots
   - Point-in-time recovery

2. **Data Retention**
   - S3 lifecycle policies
   - Archive strategies

## Scaling

1. **Auto Scaling**
   - RDS instance scaling
   - S3 performance optimization

2. **Load Balancing**
   - API Gateway
   - CloudFront distribution 