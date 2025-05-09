# Dockerfile: application/packages/backend/Dockerfile
# Build context is assumed to be the monorepo root (application/)

# Stage 1: Build the application (builder)
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/common/package.json ./packages/common/
COPY packages/backend/package.json ./packages/backend/
RUN npm ci
COPY . .
RUN npm run build --workspace=@narrow-ai-matchmaker/common
RUN npm run build --workspace=@narrow-ai-matchmaker/backend

# Stage 2: Prepare backend runtime (backend)
FROM node:20-slim AS backend
WORKDIR /app/backend
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/backend/package.json ./packages/backend/
COPY --from=builder /app/packages/common/package.json ./packages/common/

# Stage 3: Qdrant source (qdrant)
FROM qdrant/qdrant:latest AS qdrant

# Stage 4: Final runtime image
FROM node:20-slim AS final

WORKDIR /app

# Install Nginx, curl, and libunwind8
RUN apt-get update && \
    apt-get install -y nginx curl libunwind8 --no-install-recommends && \
    rm -rf /var/lib/apt/lists/* && \
    rm /etc/nginx/sites-enabled/default # Remove default site

# Copy built backend application structure from 'backend' stage
COPY --from=backend /app/backend /app/backend/

# Copy Qdrant from 'qdrant' stage
COPY --from=qdrant /qdrant /app/qdrant/

# Modify main nginx.conf to enable global debug logging
# RUN sed -i 's|^error_log.*|error_log /var/log/nginx/error.log debug;|' /etc/nginx/nginx.conf

# Copy Nginx configuration and start script from build context
RUN mkdir -p /etc/nginx/conf.d
COPY packages/backend/nginx.conf /etc/nginx/conf.d/default.conf
COPY packages/backend/start.sh /app/start.sh

# Forward request and error logs to Docker log collector
RUN ln -sf /dev/stdout /var/log/nginx/access.log && \
    ln -sf /dev/stderr /var/log/nginx/error.log

# Ensure scripts and static files have correct permissions
RUN chmod +x /app/start.sh && \
    chmod +x /app/qdrant/qdrant && \
    chmod +x /app/qdrant/entrypoint.sh && \
    chmod -R 755 /app/qdrant/static

# Debugging: List key directories
RUN ls -la /app && \
    ls -la /app/qdrant && \
    ls -la /app/qdrant/static && \
    ls -la /app/backend && \
    ls -la /app/backend/packages/backend/dist && \
    ls -la /app/backend/node_modules

EXPOSE 80
CMD ["/app/start.sh"] 