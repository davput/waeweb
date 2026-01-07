#!/bin/bash

echo "🔄 Rebuilding WhatsApp Finance Bot..."

# Stop container
echo "⏹️  Stopping container..."
docker compose down

# Clean up old images (optional)
echo "🧹 Cleaning up..."
docker system prune -f

# Rebuild with no cache and retry on failure
echo "🔨 Building new image (this may take 5-10 minutes)..."
docker compose build --no-cache || {
    echo "❌ Build failed, retrying in 10 seconds..."
    sleep 10
    docker compose build --no-cache
}

# Start container
echo "🚀 Starting container..."
docker compose up -d

# Show logs
echo "📋 Showing logs (Ctrl+C to exit)..."
sleep 2
docker compose logs -f
