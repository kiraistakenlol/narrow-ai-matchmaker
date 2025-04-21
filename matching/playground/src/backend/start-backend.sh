#!/bin/bash

# Find project root (hardcoded for simplicity)
PROJECT_ROOT="/Users/kirillsobolev/Workspace/narrow-ai-matchmaker"

# Kill any running processes on port 3000
echo "Checking for existing processes on port 3000..."
pid=$(lsof -ti:3000)
if [ ! -z "$pid" ]; then
  echo "Killing process $pid running on port 3000"
  kill -9 $pid
fi

# Set OpenAI API key from .env file if it exists in the project root
if [ -f "$PROJECT_ROOT/.env" ]; then
  echo "Loading environment variables from $PROJECT_ROOT/.env"
  export $(grep -v '^#' "$PROJECT_ROOT/.env" | xargs)
else
  # Check if OPENAI_API_KEY is already set
  if [ -z "$OPENAI_API_KEY" ]; then
    echo "WARNING: OPENAI_API_KEY environment variable not set."
    echo "Please create a .env file in $PROJECT_ROOT with your OPENAI_API_KEY or set it in your environment."
    echo "Example .env file:"
    echo "OPENAI_API_KEY=your-api-key-here"
  fi
fi

# Start the backend server
echo "Starting NestJS backend server in development mode..."
npm run start:dev 