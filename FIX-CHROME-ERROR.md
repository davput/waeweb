# 🔧 Fix Chrome/Chromium Error di Docker

## Error yang Terjadi
```
Error: Tried to find the browser at the configured path (/usr/bin/google-chrome-stable), but no executable was found.
```

## ✅ Solusi

### 1. Rebuild Container dengan Dockerfile Baru

Di VPS, jalankan:

```bash
# Stop container yang error
docker compose down

# Hapus cache Docker (optional tapi recommended)
docker system prune -a -f

# Rebuild dengan no-cache
docker compose build --no-cache

# Start container
docker compose up -d

# Lihat logs
docker compose logs -f
```

### 2. Atau Gunakan Script Otomatis

```bash
# Beri permission
chmod +x rebuild.sh

# Jalankan
./rebuild.sh
```

## 📝 Perubahan yang Dilakukan

### Dockerfile
- ✅ Install `chromium` dan `chromium-sandbox`
- ✅ Set environment variable `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`
- ✅ Tambah font dependencies

### finance-bot.js
- ✅ Tambah puppeteer args untuk Docker:
  - `--no-sandbox`
  - `--disable-setuid-sandbox`
  - `--disable-dev-shm-usage`
  - `--disable-gpu`
- ✅ Auto-detect Chromium path dari environment variable

## 🐳 Alternative: Gunakan Alpine (Image Lebih Kecil)

Jika ingin image lebih kecil (~200MB vs ~800MB):

### Edit docker-compose.yml

```yaml
services:
  whatsapp-finance-bot:
    build:
      context: .
      dockerfile: Dockerfile.alpine  # Ganti ini
    # ... rest of config
```

### Rebuild

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## ⚡ Quick Commands

```bash
# Cek status
docker compose ps

# Lihat logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose stop

# Start
docker compose start

# Rebuild total
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

## 🔍 Verify Installation

Setelah rebuild, cek apakah Chromium terinstall:

```bash
# Masuk ke container
docker compose exec whatsapp-finance-bot /bin/bash

# Cek Chromium
which chromium
chromium --version

# Exit
exit
```

## 📊 Resource Requirements

Pastikan VPS punya resource cukup:

- **RAM**: Minimal 1GB (recommended 2GB)
- **Storage**: Minimal 2GB free space
- **CPU**: 1 core minimal

Cek resource:
```bash
# Memory
free -h

# Disk
df -h

# CPU
nproc
```

## 🆘 Masih Error?

### Error: Out of Memory
```bash
# Tambah swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Error: Permission Denied
```bash
# Fix permission
sudo chown -R $USER:$USER .
chmod -R 755 .
```

### Error: Port Already in Use
```bash
# Cek container yang running
docker ps -a

# Stop semua
docker stop $(docker ps -aq)

# Hapus semua
docker rm $(docker ps -aq)

# Start ulang
docker compose up -d
```

## ✅ Success Indicators

Jika berhasil, logs akan menampilkan:

```
✅ Bot keuangan siap digunakan!
📱 Scan QR code ini dengan WhatsApp Anda:

[QR CODE MUNCUL DI SINI]
```

Scan QR code tersebut dengan WhatsApp Anda!
