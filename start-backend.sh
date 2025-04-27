#!/bin/bash
# Script to start the backend development server

# Exit immediately if a command exits with a non-zero status.
set -e

# Get the directory where the script is located
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

# Navigate to the application root directory relative to the script
cd "$SCRIPT_DIR/application"

echo "Starting backend development server..."

# Run the backend server using npm workspaces
# The --watch flag keeps it running and watches for changes
npm run start:dev -w @narrow-ai-matchmaker/backend 