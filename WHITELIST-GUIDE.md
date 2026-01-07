# 🔐 Panduan Whitelist Bot Keuangan

Bot ini dilengkapi dengan sistem whitelist untuk membatasi akses hanya untuk nomor WhatsApp tertentu.

## 📋 Cara Kerja

1. **Whitelist aktif** - Hanya nomor yang terdaftar bisa menggunakan bot
2. **User tidak terdaftar** - Bot akan **diam saja** (tidak ada respon)
3. **Logging** - Setiap akses ditolak akan dicatat di console (untuk admin)

## ⚙️ Konfigurasi

### File: `config.js`

```javascript
module.exports = {
    // Daftar nomor yang diizinkan
    ALLOWED_USERS: [
        '6281234567890@c.us',  // Format: kode negara + nomor + @c.us
        '6289876543210@c.us',
    ],
    
    // Mode development (izinkan semua user)
    ALLOW_ALL_USERS: false,  // Set true untuk testing
};
```

## 📱 Cara Menambah Nomor

### 1. Dapatkan ID WhatsApp User

**Cara: Lihat di console logs**
```bash
docker compose logs -f
# Atau
node finance-bot.js

# Ketika user yang belum terdaftar kirim pesan, akan muncul:
# 🚫 Access denied for user: 6281234567890@c.us
```

**Catatan:** Bot tidak akan membalas pesan dari user yang tidak terdaftar (silent ignore).

### 2. Tambahkan ke config.js

Edit file `config.js`:

```javascript
ALLOWED_USERS: [
    '6283150916278@c.us',  // User 1
    '6281234567890@c.us',  // User 2 (baru ditambah)
    '6289876543210@c.us',  // User 3 (baru ditambah)
],
```

### 3. Restart Bot

**Jika pakai Docker:**
```bash
docker compose restart
```

**Jika run langsung:**
```bash
# Ctrl+C untuk stop
node finance-bot.js
```

## 🔓 Mode Development (Allow All)

Untuk testing, Anda bisa mengizinkan semua user:

```javascript
// config.js
ALLOW_ALL_USERS: true,  // ⚠️ JANGAN di production!
```

**PERINGATAN:** Jangan lupa set kembali ke `false` saat deploy ke production!

## 📊 Monitoring Akses

### Lihat logs akses ditolak:

```bash
# Docker
docker compose logs -f | grep "Access denied"

# Direct run
# Akan muncul di console
```

### Format log:
```
🚫 Access denied for user: 6281234567890@c.us
```

## 🔍 Troubleshooting

### User sudah ditambah tapi masih ditolak

1. **Cek format ID:**
   - ✅ Benar: `'6281234567890@c.us'`
   - ❌ Salah: `6281234567890` (tanpa @c.us)
   - ❌ Salah: `+6281234567890@c.us` (pakai +)

2. **Cek restart bot:**
   ```bash
   docker compose restart
   ```

3. **Cek config.js:**
   ```bash
   cat config.js
   # Pastikan nomor ada di array ALLOWED_USERS
   ```

### Cara cek nomor sendiri

Kirim pesan ke bot dari nomor yang ingin dicek, lalu lihat logs:

```bash
docker compose logs -f
```

ID akan muncul di logs.

## 🛡️ Best Practices

### 1. Jangan commit nomor pribadi ke Git

Tambahkan ke `.gitignore`:
```
config.js
```

Atau buat `config.example.js`:
```javascript
module.exports = {
    ALLOWED_USERS: [
        '628XXXXXXXXXX@c.us',  // Ganti dengan nomor Anda
    ],
    ALLOW_ALL_USERS: false,
};
```

### 2. Backup daftar user

Simpan daftar nomor di tempat aman (password manager, dll).

### 3. Review akses secara berkala

Hapus nomor yang sudah tidak aktif:
```javascript
ALLOWED_USERS: [
    '6281234567890@c.us',  // Active
    // '6289876543210@c.us',  // Removed - tidak aktif
],
```

### 4. Gunakan environment variable (Advanced)

Untuk production, bisa pakai environment variable:

```javascript
// config.js
module.exports = {
    ALLOWED_USERS: process.env.ALLOWED_USERS 
        ? process.env.ALLOWED_USERS.split(',')
        : ['6283150916278@c.us'],
    ALLOW_ALL_USERS: process.env.ALLOW_ALL_USERS === 'true',
};
```

Di VPS:
```bash
export ALLOWED_USERS="6281234567890@c.us,6289876543210@c.us"
export ALLOW_ALL_USERS="false"
```

Atau di `docker-compose.yml`:
```yaml
environment:
  - ALLOWED_USERS=6281234567890@c.us,6289876543210@c.us
  - ALLOW_ALL_USERS=false
```

## 📝 Contoh Skenario

### Skenario 1: Tambah 1 user baru

```bash
# 1. User kirim /help, dapat ID: 6281234567890@c.us
# 2. Edit config.js
nano config.js

# 3. Tambahkan nomor
ALLOWED_USERS: [
    '6283150916278@c.us',
    '6281234567890@c.us',  // Baru
],

# 4. Restart
docker compose restart

# 5. User coba lagi, sekarang bisa akses
```

### Skenario 2: Hapus user

```bash
# 1. Edit config.js
nano config.js

# 2. Hapus atau comment nomor
ALLOWED_USERS: [
    '6283150916278@c.us',
    // '6281234567890@c.us',  // Dihapus
],

# 3. Restart
docker compose restart
```

### Skenario 3: Testing dengan allow all

```bash
# 1. Edit config.js
ALLOW_ALL_USERS: true,

# 2. Restart
docker compose restart

# 3. Test dengan berbagai nomor

# 4. Setelah selesai, set kembali
ALLOW_ALL_USERS: false,

# 5. Restart
docker compose restart
```

## 🔐 Security Tips

1. ✅ Selalu gunakan whitelist di production
2. ✅ Jangan share config.js yang berisi nomor pribadi
3. ✅ Review logs secara berkala
4. ✅ Hapus user yang tidak aktif
5. ❌ Jangan set `ALLOW_ALL_USERS: true` di production
6. ❌ Jangan commit nomor pribadi ke public repository

## 📞 Support

Jika ada masalah dengan whitelist:
1. Cek logs: `docker compose logs -f`
2. Cek format ID nomor
3. Pastikan sudah restart bot
4. Cek file config.js tidak ada typo
