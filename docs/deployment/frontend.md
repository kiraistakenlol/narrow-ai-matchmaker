# Frontend Deployment

## Overview

The frontend is deployed using Vercel, which provides:
- Automatic deployments from Git
- Preview deployments for pull requests
- Edge network distribution
- Environment variable management

## Deployment Process

### Prerequisites

1. Vercel CLI (optional):
```bash
npm i -g vercel
```

2. Vercel account with project access

### Deployment Steps

1. **Automatic Deployment**
   - Push to main branch triggers production deployment
   - Pull requests get preview deployments

2. **Manual Deployment**
   ```bash
   # From application/packages/frontend directory
   vercel
   ```

### Configuration

1. **Environment Variables**
   - Set in Vercel dashboard:
     - `VITE_API_BASE_URL`
     - `VITE_COGNITO_USER_POOL_ID`
     - `VITE_COGNITO_CLIENT_ID`
     - `VITE_COGNITO_DOMAIN`

2. **vercel.json**
   - Handles SPA routing
   - Configures redirects for authentication

### Monitoring

1. **View Deployments**
   - Vercel dashboard
   - Deployment logs
   - Build logs

2. **Performance**
   - Vercel Analytics
   - Core Web Vitals
   - Edge network performance

### Troubleshooting

1. **Build Issues**
   - Check build logs in Vercel dashboard
   - Verify environment variables
   - Check for dependency issues

2. **Runtime Issues**
   - Check browser console
   - Verify API connectivity
   - Check authentication flow

3. **Common Problems**
   - Missing environment variables
   - API connection issues
   - Authentication configuration
   - SPA routing issues 