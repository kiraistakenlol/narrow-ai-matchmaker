#!/bin/bash

echo "Setting up narrow-ai-matchmaker modules..."

# Build the common module first
echo "Building common module..."
cd "$(dirname "$0")/common" || exit 1
npm install
npm run build

# Install dependencies in backend
echo "Setting up backend..."
cd ../backend || exit 1
npm install

# Install dependencies in frontend
echo "Setting up frontend..."
cd ../frontend || exit 1
npm install

echo "Setup complete!" 