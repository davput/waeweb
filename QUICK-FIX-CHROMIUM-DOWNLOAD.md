# 🔧 Fix Error: Failed to download Chromium

## Error Message
```
Error: ERROR: Failed to set up chrome v143.0.7499.169!
Error: read ECONNRESET
```

## Penyebab
Koneksi internet terputus saat Puppeteer mencoba download Chromium (~150MB).

## Solusi

### 1. Retry Build (Paling Mudah)
Dockerfile sudah dikonfigurasi untuk retry otomatis 3x:

```bash
# Di VPS
cd /path/to/whatsapp-web.js

# Build ulang (akan retry otomatis)
docker compose build --no-cache

# Jika masih gagal, coba lagi
docker compose build --no-cache
```

### 2. Build dengan Koneksi Lebih Baik

**Cek koneksi internet VPS:**
```bash
# Test download speed
wget -O /dev/null http://speedtest.tele2.net/100MB.zip

# Test DNS
ping google.com
```

**Jika koneksi lambat, tunggu waktu yang lebih baik:**
- Hindari jam sibuk (siang hari)
- Build di malam hari atau pagi hari
- Pastikan tidak ada proses lain yang menggunakan bandwidth

### 3. Increase Timeout & Retry

Edit `Dockerfile`, tambahkan sebelum `RUN npm install`:

```dockerfile
# Increase npm timeout
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-maxtimeout 300000 && \
    npm config set fetch-retry-mintimeout 30000 && \
    npm config set fetch-retries 10
```

Lalu rebuild:
```bash
docker compose build --no-cache
```

### 4. Download Chromium Manual (Advanced)

Jika build terus gagal, download Chromium manual:

```bash
# Di VPS, buat folder temporary
mkdir -p /tmp/chromium-download
cd /tmp/chromium-download

# Download Chromium manual (sesuaikan versi)
wget https://storage.googleapis.com/chrome-for-testing-public/143.0.7499.169/linux64/chrome-linux64.zip

# Extract
unzip chrome-linux64.zip

# Copy ke project
mkdir -p /path/to/whatsapp-web.js/.local-chromium/linux-143.0.7499.169
cp -r chrome-linux64/* /path/to/whatsapp-web.js/.local-chromium/linux-143.0.7499.169/

# Update Dockerfile untuk skip download
# Tambahkan ENV PUPPETEER_SKIP_DOWNLOAD=true
```

### 5. Gunakan Dockerfile.alpine (Lebih Kecil)

Alpine menggunakan Chromium dari package manager (lebih cepat):

```bash
# Edit docker-compose.yml
nano docker-compose.yml
```

Ubah:
```yaml
services:
  whatsapp-finance-bot:
    build:
      context: .
      dockerfile: Dockerfile.alpine  # Gunakan Alpine
```

Build:
```bash
docker compose build --no-cache
docker compose up -d
```

### 6. Build di Lokal, Push ke VPS

Jika VPS koneksi lambat, build di komputer lokal:

```bash
# Di komputer lokal (dengan koneksi bagus)
docker build -t whatsapp-bot:latest .

# Save image
docker save whatsapp-bot:latest | gzip > whatsapp-bot.tar.gz

# Upload ke VPS
scp whatsapp-bot.tar.gz user@vps-ip:/home/user/

# Di VPS, load image
docker load < whatsapp-bot.tar.gz

# Update docker-compose.yml untuk gunakan image
# Ganti:
#   build: .
# Menjadi:
#   image: whatsapp-bot:latest
```

## Verifikasi Build Berhasil

Setelah build berhasil, cek:

```bash
# Cek image ada
docker images | grep whatsapp

# Cek Chromium terinstall
docker run --rm whatsapp-finance-bot ls -la /app/node_modules/puppeteer/.local-chromium/

# Harus ada folder chrome-linux atau chromium
```

## Tips Mencegah Error

1. **Pastikan koneksi stabil** sebelum build
2. **Gunakan VPS dengan bandwidth bagus**
3. **Build di waktu yang tepat** (malam/pagi)
4. **Gunakan Alpine** jika koneksi lambat
5. **Monitor logs** saat build: `docker compose build --no-cache --progress=plain`

## Jika Masih Gagal

Hubungi provider VPS untuk:
- Cek apakah ada firewall yang block download
- Cek apakah ada bandwidth limit
- Cek apakah DNS berfungsi dengan baik

Atau gunakan VPS lain dengan koneksi lebih baik.
