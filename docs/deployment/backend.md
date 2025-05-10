# Backend Deployment

## Overview

The backend is deployed as a single Docker image containing:
- NestJS application
- Qdrant vector database
- Nginx reverse proxy

## Deployment Process

### Prerequisites

1. Install Fly.io CLI:
```bash
curl -L https://fly.io/install.sh | sh
```

2. Login to Fly.io:
```bash
fly auth login
```

### Deployment Steps

1. **Set Environment Variables**
   - Use the `set-fly-secrets.sh` script to deploy secrets:
   ```bash
   # From application/packages/backend directory
   ./set-fly-secrets.sh .env.fly
   ```

2. **Deploy Application**
   ```bash
   # From application directory
   flyctl deploy --config packages/backend/fly.toml
   ```

3. **Deploy Without Rebuilding**
   - This is useful when only updating secrets or configuration:
   ```bash
   # Replace with your current image tag
   fly deploy -a narrow-ai-titanic-backend --image registry.fly.io/narrow-ai-titanic-backend:deployment-01JTVCN0JNQD3J3E744PJCJXZE
   ```

### Configuration Files

1. **fly.toml**
   - Located in `application/packages/backend/fly.toml`
   - Configures:
     - Application name
     - Build settings
     - Environment variables
     - HTTP service settings
     - VM resources

2. **Dockerfile**
   - Located in `application/packages/backend/Dockerfile`
   - Multi-stage build process:
     1. Builds TypeScript code
     2. Prepares backend runtime
     3. Includes Qdrant
     4. Final image with Nginx

3. **Nginx Configuration**
   - Located in `application/packages/backend/nginx.conf`
   - Routes:
     - `/api/*` → Backend service
     - `/qdrant/*` → Qdrant dashboard
     - `/` → Qdrant root

### Monitoring

1. **View Logs**
   ```bash
   # Basic logs
   fly logs
   
   # Logs with specific config path
   flyctl logs --config packages/backend/fly.toml
   ```

2. **Check Status**
   ```bash
   fly status
   ```

3. **Restart Service**
   ```bash
   fly apps restart
   ```

### Updating Secrets

1. **Via UI**
   - Update secrets in Fly.io dashboard
   - Restart service to apply changes:
   ```bash
   fly apps restart
   ```

2. **Via CLI**
   - Use `set-fly-secrets.sh` script
   - Or manually:
   ```bash
   fly secrets set KEY=VALUE
   ```

### Troubleshooting

1. **Deployment Issues**
   - Check build logs: `fly logs`
   - Verify Dockerfile syntax
   - Ensure all required files are present

2. **Runtime Issues**
   - Check application logs: `fly logs`
   - Verify environment variables: `fly secrets list`
   - Check service status: `fly status`

3. **Common Problems**
   - Missing secrets
   - Incorrect file paths in Dockerfile
   - Nginx configuration errors
   - Qdrant startup issues 