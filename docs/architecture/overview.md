# System Architecture Overview

## High-Level Architecture

```
┌───────────────────────┐           ┌───────────────────────────────────────┐
│                       │           │             AWS Services              │
│                       │           │                                       │
│    Frontend (Vercel)  │◄─────────►│  Cognito        S3        Transcribe  │
│                       │           │                                       │
└───────────┬───────────┘           └───────────────────┬───────────────────┘
            │                                           │
            │                                           │
            │                                           │
            │           ┌───────────────────────────────▼───────────────────┐
            │           │            Backend (Fly.io)                       │
            │           │  ┌─────────────────────────────────────────────┐  │
            └──────────►│  │             Docker Container                │  │
                        │  │                                             │  │
                        │  │    NestJS App    Qdrant DB    Nginx Proxy   │  │
                        │  │                                             │  │
                        │  └─────────────────────────────────────────────┘  │
                        │                      │                             │
                        └──────────────────────┼─────────────────────────────┘
                                               │
                                               │
                                      ┌────────▼─────────┐
                                      │                  │
                                      │  LLM Provider    │
                                      │  (OpenAI)        │
                                      │                  │
                                      └──────────────────┘
```

## Component Details

### Frontend (Vercel)
- React + TypeScript application
- Vite build system
- SPA routing
- Directly communicates with:
  - AWS Cognito for authentication
  - Backend API for all other operations

### Backend (Fly.io)
- Single Docker container with:
  - NestJS application
  - Qdrant vector database
  - Nginx reverse proxy
- Persistent volume for Qdrant data
- Environment variable configuration

### AWS Services
- **Cognito**: User authentication and OAuth
- **S3**: Audio file storage and uploads
- **RDS**: PostgreSQL database
- **Transcribe**: Audio transcription

### External Services
- **LLM Provider** (OpenAI): AI processing for audio analysis and matching

## Data Flow

1. **Authentication Flow**
   - User authenticates directly with Cognito from frontend
   - Frontend receives tokens from Cognito
   - Tokens are sent to backend for validation

2. **Audio Processing**
   - Frontend uploads audio files directly to S3
   - Backend initiates Transcribe jobs
   - Backend receives transcription results
   - Backend sends text to LLM for analysis
   - Results stored in Qdrant and RDS

3. **Profile Management**
   - Structured data stored in RDS
   - Vector embeddings stored in Qdrant
   - Files stored in S3

## Security

1. **Authentication**
   - Cognito user pools
   - OAuth providers
   - JWT validation

2. **Authorization**
   - IAM roles
   - Service permissions
   - API access control

3. **Data Protection**
   - S3 encryption
   - RDS encryption
   - Secure communication

## Deployment Architecture

1. **Frontend**
   - Vercel edge network
   - Automatic deployments
   - Preview environments

2. **Backend**
   - Fly.io deployment
   - Single Docker container
   - Persistent volume for Qdrant data

3. **Database**
   - RDS PostgreSQL instance
   - Qdrant for vector storage (in Docker)
   - S3 for file storage

## Monitoring & Logging

1. **Application Monitoring**
   - Vercel analytics
   - Fly.io logs
   - AWS CloudWatch

2. **Performance Metrics**
   - API response times
   - Database performance
   - Vector search latency

## Scaling Strategy

1. **Horizontal Scaling**
   - Multiple backend instances
   - Load balancing
   - Database read replicas

2. **Vertical Scaling**
   - RDS instance upgrades
   - Fly.io VM resources
   - Docker container resources 