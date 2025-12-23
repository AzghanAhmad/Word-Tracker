#!/bin/bash
set -e

# Copy frontend dist to backend publish folder for serving
echo "📦 Copying frontend files to backend..."
mkdir -p backend/dotnet_migration_pending/publish/frontend/dist/word-tracker-frontend/browser
cp -r frontend/dist/word-tracker-frontend/browser/* backend/dotnet_migration_pending/publish/frontend/dist/word-tracker-frontend/browser/ || true

# Start the backend (which will serve the frontend static files)
echo "🚀 Starting application..."
cd backend/dotnet_migration_pending/publish
dotnet WordTracker.Api.dll

