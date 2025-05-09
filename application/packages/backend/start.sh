#!/bin/sh

# Debug: List directories
echo "Listing /app contents:"
ls -la /app
echo "Listing /app/qdrant contents:"
ls -la /app/qdrant
echo "Listing /app/backend contents:"
ls -la /app/backend
echo "Listing /app/backend/packages/backend/dist contents:"
ls -la /app/backend/packages/backend/dist
echo "Listing /app/backend/node_modules contents:"
ls -la /app/backend/node_modules

# Start Qdrant in the background
(cd /app/qdrant && ./qdrant) &

# Wait for Qdrant to be ready
echo "Waiting for Qdrant to be ready..."
until curl -s http://localhost:6333/healthz > /dev/null; do
    echo "Waiting for Qdrant..."
    sleep 1
done
echo "Qdrant is ready!"

# Start the backend
(cd /app/backend && NODE_PATH=/app/backend/node_modules node packages/backend/dist/src/main.js) &

# Test Nginx configuration
nginx -t

# Start Nginx in the foreground
nginx -g 'daemon off;' 