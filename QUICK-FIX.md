# 🔧 Quick Fix untuk Error Chromium

## Masalah
Error: `Tried to find the browser at the configured path (/usr/bin/google-chrome-stable), but no executable was found.`

## Solusi

### Di VPS, jalankan perintah berikut:

```bash
# 1. Stop container yang error
docker compose down

# 2. Hapus image lama
docker rmi whatsapp-web.js-whatsapp-finance-bot

# 3. Rebuild dengan no-cache (PENTING!)
docker compose build --no-cache

# 4. Jalankan container
docker compose up -d

# 5. Lihat logs untuk QR code
docker compose logs -f
```

## Atau gunakan script otomatis:

```bash
# Beri permission
chmod +x rebuild.sh

# Jalankan
./rebuild.sh
```

## Penjelasan Fix

1. **Dockerfile sudah diperbaiki** untuk tidak set `PUPPETEER_EXECUTABLE_PATH`
2. **Puppeteer akan download Chromium** sendiri saat `npm install`
3. **finance-bot.js sudah diperbaiki** untuk tidak force executable path
4. **Args `--no-sandbox`** sudah ditambahkan untuk Docker environment

## Verifikasi

Setelah rebuild, cek logs:
```bash
docker compose logs -f
```

Anda harus melihat:
- ✅ "Bot keuangan siap digunakan!"
- ✅ QR code muncul di terminal

## Jika Masih Error

### Cek apakah Puppeteer berhasil download Chromium:
```bash
docker compose exec whatsapp-finance-bot ls -la /app/node_modules/puppeteer/.local-chromium/
```

### Cek memory VPS:
```bash
free -h
```

Minimal 1GB RAM diperlukan.

### Cek disk space:
```bash
df -h
```

Minimal 2GB free space diperlukan untuk Chromium.

## Build Time

Build pertama kali akan memakan waktu **5-10 menit** karena:
- Download dependencies
- Puppeteer download Chromium (~150MB)
- Install system packages

**Bersabar dan tunggu sampai selesai!**
