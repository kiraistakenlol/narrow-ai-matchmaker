#!/bin/bash

# Script to start the Docker image for local development and stream logs
# This script should be run from the application/packages/backend directory

# Define the path to your .env file
ENV_FILE="./.env"

# Define the Docker image name and tag
IMAGE_NAME="narrow-ai-matchmaker-backend:latest"

# Define the host port you want to map to the container's port
# The container exposes port 3000 by default (as per Dockerfile)
# If your .env file sets a PORT variable that your app uses, adjust the container port accordingly.
HOST_PORT=3001
CONTAINER_PORT=3000 # This is the port EXPOSEd in the Dockerfile and what the app listens on by default

# Check if the .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: .env file not found at $ENV_FILE"
    echo "Please create it based on .env.example or provide the necessary environment variables."
    exit 1
fi

CONTAINER_NAME="narrow-ai-matchmaker-dev"

echo "Attempting to stop any existing container named '${CONTAINER_NAME}' (if any)..."
docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
echo "Attempting to remove any existing container named '${CONTAINER_NAME}' (if any)..."
docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "Starting Docker container ${IMAGE_NAME} in the foreground..."
echo "Logs will be streamed to this terminal. Press Ctrl+C to stop the container."

# Run the container in the foreground (remove -d)
# Stdout/Stderr will be attached to the terminal
docker run --rm \
    --name "${CONTAINER_NAME}" \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    --env-file "${ENV_FILE}" \
    "${IMAGE_NAME}"

# Script will block here until the container stops.
# The exit code of docker run will be the exit code of this script.
echo "Container '${CONTAINER_NAME}' stopped." 