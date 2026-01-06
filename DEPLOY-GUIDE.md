# 🚀 Panduan Deploy ke VPS dengan Docker

Panduan lengkap untuk menjalankan WhatsApp Finance Bot di VPS menggunakan Docker.

## 📋 Prasyarat

1. **VPS dengan spesifikasi minimal:**
   - RAM: 1GB (recommended 2GB)
   - Storage: 10GB
   - OS: Ubuntu 20.04/22.04 atau Debian 11/12

2. **Software yang harus terinstall:**
   - Docker
   - Docker Compose
   - Git (optional)

## 🔧 Instalasi Docker di VPS

### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install dependencies
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Add Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add user to docker group (optional, agar tidak perlu sudo)
sudo usermod -aG docker $USER
newgrp docker
```

## 📦 Deploy Bot ke VPS

### 1. Upload Project ke VPS

**Opsi A: Menggunakan Git**
```bash
# Clone repository
git clone <your-repo-url>
cd whatsapp-web.js
```

**Opsi B: Upload Manual**
```bash
# Di komputer lokal, compress project
tar -czf whatsapp-bot.tar.gz .

# Upload ke VPS menggunakan scp
scp whatsapp-bot.tar.gz user@your-vps-ip:/home/user/

# Di VPS, extract
cd /home/user
tar -xzf whatsapp-bot.tar.gz
cd whatsapp-web.js
```

### 2. Build dan Jalankan Container

```bash
# Build Docker image
docker compose build

# Jalankan container
docker compose up -d

# Lihat logs untuk scan QR code
docker compose logs -f
```

### 3. Scan QR Code

Setelah container berjalan, QR code akan muncul di logs:

```bash
# Lihat logs
docker compose logs -f whatsapp-finance-bot

# Scan QR code yang muncul dengan WhatsApp Anda
```

## 🔍 Monitoring & Management

### Melihat Status Container
```bash
docker compose ps
```

### Melihat Logs
```bash
# Real-time logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Logs dari waktu tertentu
docker compose logs --since 30m
```

### Restart Container
```bash
docker compose restart
```

### Stop Container
```bash
docker compose stop
```

### Start Container
```bash
docker compose start
```

### Stop dan Hapus Container
```bash
docker compose down
```

### Rebuild Container (setelah update code)
```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```

## 📁 Data Persistence

Data berikut akan tersimpan di VPS dan tidak hilang saat restart:

- **WhatsApp Session**: `./wwebjs_auth/`
- **Finance Data**: `./finance-data.json`
- **Archives (PDF & Backup)**: `./archives/`

## 🔄 Update Bot

```bash
# Stop container
docker compose down

# Pull latest code (jika pakai git)
git pull

# Atau upload file baru via scp

# Rebuild dan restart
docker compose build --no-cache
docker compose up -d
```

## 🛡️ Security Best Practices

### 1. Firewall Setup
```bash
# Install UFW
sudo apt install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### 2. Backup Otomatis

Buat script backup:

```bash
# Buat file backup.sh
nano backup.sh
```

Isi dengan:
```bash
#!/bin/bash
BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup data
tar -czf $BACKUP_DIR/bot-backup-$DATE.tar.gz \
    finance-data.json \
    archives/ \
    wwebjs_auth/

# Hapus backup lama (lebih dari 7 hari)
find $BACKUP_DIR -name "bot-backup-*.tar.gz" -mtime +7 -delete

echo "Backup completed: bot-backup-$DATE.tar.gz"
```

Jadwalkan dengan cron:
```bash
chmod +x backup.sh

# Edit crontab
crontab -e

# Tambahkan (backup setiap hari jam 2 pagi)
0 2 * * * /home/user/whatsapp-web.js/backup.sh
```

### 3. Auto-restart on Failure

Docker compose sudah dikonfigurasi dengan `restart: unless-stopped`, jadi container akan otomatis restart jika crash.

## 📊 Resource Monitoring

### Install htop
```bash
sudo apt install htop
htop
```

### Monitor Docker Stats
```bash
docker stats whatsapp-finance-bot
```

## 🐛 Troubleshooting

### Container tidak bisa start
```bash
# Cek logs error
docker compose logs

# Cek resource
docker stats

# Rebuild dari awal
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

### QR Code tidak muncul
```bash
# Pastikan container running
docker compose ps

# Cek logs detail
docker compose logs -f whatsapp-finance-bot
```

### Session hilang setelah restart
```bash
# Pastikan volume mounted dengan benar
docker compose down
docker compose up -d

# Cek permission folder
ls -la wwebjs_auth/
```

### Out of Memory
```bash
# Tambah swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 🔐 Environment Variables (Optional)

Jika ingin menggunakan environment variables, buat file `.env`:

```bash
# .env
NODE_ENV=production
TZ=Asia/Jakarta
BOT_NAME=Finance Bot
```

Update `docker-compose.yml`:
```yaml
services:
  whatsapp-finance-bot:
    env_file:
      - .env
```

## 📱 Akses dari Luar (Optional)

Jika ingin menambahkan web dashboard:

1. Expose port di `docker-compose.yml`
2. Setup Nginx reverse proxy
3. Setup SSL dengan Let's Encrypt

## 🎯 Tips Production

1. **Gunakan screen/tmux** untuk melihat logs:
   ```bash
   screen -S bot-logs
   docker compose logs -f
   # Ctrl+A+D untuk detach
   # screen -r bot-logs untuk attach kembali
   ```

2. **Setup monitoring** dengan Portainer (optional):
   ```bash
   docker volume create portainer_data
   docker run -d -p 9000:9000 --name portainer --restart=always \
     -v /var/run/docker.sock:/var/run/docker.sock \
     -v portainer_data:/data portainer/portainer-ce
   ```

3. **Log rotation** untuk mencegah disk penuh:
   ```bash
   # Edit /etc/docker/daemon.json
   sudo nano /etc/docker/daemon.json
   ```
   
   Tambahkan:
   ```json
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     }
   }
   ```
   
   Restart Docker:
   ```bash
   sudo systemctl restart docker
   ```

## ✅ Checklist Deploy

- [ ] VPS sudah siap dengan Docker terinstall
- [ ] Project sudah di-upload ke VPS
- [ ] Docker image berhasil di-build
- [ ] Container berjalan dengan `docker compose up -d`
- [ ] QR code berhasil di-scan
- [ ] Bot merespon pesan dengan baik
- [ ] Data tersimpan di volume yang benar
- [ ] Backup script sudah dijadwalkan
- [ ] Firewall sudah dikonfigurasi
- [ ] Monitoring sudah disetup

## 📞 Support

Jika ada masalah, cek:
1. Logs container: `docker compose logs -f`
2. Resource VPS: `htop` atau `docker stats`
3. Disk space: `df -h`
4. Memory: `free -h`
