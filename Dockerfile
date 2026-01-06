# Base image dengan Node.js
FROM node:18-slim

# Install dependencies untuk Puppeteer dan Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - Puppeteer akan download Chromium otomatis
# JANGAN set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD agar Puppeteer download Chromium
RUN npm install --production

# Copy application files
COPY . .

# Create directories for data persistence
RUN mkdir -p /app/.wwebjs_auth /app/archives

# TIDAK perlu set PUPPETEER_EXECUTABLE_PATH
# Biarkan Puppeteer menggunakan Chromium yang di-download saat npm install

# Expose port (optional, jika nanti mau tambah web dashboard)
# EXPOSE 3000

# Run the bot
CMD ["node", "finance-bot.js"]
