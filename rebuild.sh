#!/bin/bash

echo "🔄 Rebuilding WhatsApp Finance Bot..."

# Stop container
echo "⏹️  Stopping container..."
docker compose down

# Clean up old images (optional)
echo "🧹 Cleaning up..."
docker system prune -f

# Rebuild with no cache
echo "🔨 Building new image..."
docker compose build --no-cache

# Start container
echo "🚀 Starting container..."
docker compose up -d

# Show logs
echo "📋 Showing logs (Ctrl+C to exit)..."
sleep 2
docker compose logs -f
