#!/bin/bash

echo "🔨 Building Docker image with retry..."
echo "⏰ This may take 5-10 minutes..."
echo ""

MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "📦 Build attempt $((RETRY_COUNT + 1)) of $MAX_RETRIES..."
    
    if docker compose build --no-cache; then
        echo ""
        echo "✅ Build successful!"
        echo ""
        echo "🚀 Starting container..."
        docker compose up -d
        
        echo ""
        echo "📋 Showing logs (Ctrl+C to exit)..."
        sleep 2
        docker compose logs -f
        exit 0
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo ""
            echo "❌ Build failed. Retrying in 15 seconds..."
            echo "   (Attempt $RETRY_COUNT of $MAX_RETRIES failed)"
            sleep 15
        fi
    fi
done

echo ""
echo "❌ Build failed after $MAX_RETRIES attempts."
echo ""
echo "💡 Possible solutions:"
echo "1. Check internet connection: ping google.com"
echo "2. Try again later (better network time)"
echo "3. Use Dockerfile.alpine: edit docker-compose.yml"
echo "4. Read QUICK-FIX-CHROMIUM-DOWNLOAD.md for more solutions"
exit 1
