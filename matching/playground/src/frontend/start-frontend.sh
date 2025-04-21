#!/bin/bash

# Find project root (hardcoded for simplicity)
PROJECT_ROOT="/Users/kirillsobolev/Workspace/narrow-ai-matchmaker"

# Kill any running processes on port 3001 (using different port from backend)
echo "Checking for existing processes on port 3001..."
pid=$(lsof -ti:3001)
if [ ! -z "$pid" ]; then
  echo "Killing process $pid running on port 3001"
  kill -9 $pid
fi

# Set OpenAI API key from .env file if it exists in the project root
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "Loading environment variables from $PROJECT_ROOT/.env"
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
fi

# Start the frontend development server
echo "Starting Vite frontend server in development mode..."
# Use port 3001 to avoid conflict with backend
VITE_PORT=3001 npm run dev 