# 🤖 WhatsApp Finance Bot

Bot WhatsApp untuk manajemen catatan keuangan pribadi dengan fitur export PDF.

## 📋 Fitur

- ✅ Catat pemasukan dan pengeluaran (format natural)
- ✅ Lihat saldo real-time
- ✅ Laporan keuangan (harian, bulanan, semua)
- ✅ Kategori transaksi otomatis
- ✅ Support tanggal custom
- ✅ **Hapus transaksi** dengan ID
- ✅ **Tutup catatan & export PDF**
- ✅ Multi-user support
- ✅ Data tersimpan lokal (JSON)
- ✅ Arsip otomatis

## 🚀 Cara Menggunakan

### 1. Install Dependencies
```bash
npm install
```

### 2. Jalankan Bot
```bash
node finance-bot.js
```

### 3. Scan QR Code
Scan QR code yang muncul di terminal (berbentuk gambar) menggunakan WhatsApp Anda.

### 4. Mulai Gunakan
Kirim pesan `/help` ke bot untuk melihat daftar perintah.

## 📝 Perintah Bot

### Catat Transaksi (Format Natural)
```
Uang masuk 50k
Uang keluar 20k
Beli jajan 10k
Beli makanan 20k tanggal 5
Bayar listrik 150rb tgl 10 januari
Terima gaji 5jt
Ojek 15rb
```

### Catat Transaksi (Format Lengkap)
```
/masuk [jumlah] [kategori] [keterangan]
/keluar [jumlah] [kategori] [keterangan]
```

**Contoh:**
```
/masuk 5000000 Gaji Gaji bulan Januari
/keluar 50000 Makanan Makan siang di warteg
/keluar 20000 Transport Ongkos ojol
```

### Lihat Laporan
```
/saldo              - Lihat saldo saat ini
/laporan            - Laporan semua transaksi
/laporan hari       - Laporan hari ini
/laporan bulan      - Laporan bulan ini
/kategori           - Lihat daftar kategori
/list               - Lihat daftar transaksi dengan ID
```

### Hapus Transaksi
```
/list               - Lihat daftar transaksi
/hapus [id]         - Hapus transaksi berdasarkan ID
```

**Contoh:**
```
/list               → Melihat 10 transaksi terakhir dengan ID
/hapus 5            → Hapus transaksi dengan ID 5
```

### Tutup Catatan
```
/tutup              - Tutup catatan, buat PDF, reset saldo
```

**Fitur Tutup Catatan:**
- 📄 Generate laporan lengkap dalam PDF
- 💾 Backup data ke JSON
- 🔄 Reset saldo ke Rp 0
- 📊 Ringkasan periode lengkap
- 📁 Arsip tersimpan di folder `archives/`

## 💾 Penyimpanan Data

### Data Aktif
Data disimpan di file `finance-data.json` dengan struktur:
```json
{
  "user_id": {
    "transactions": [...],
    "categories": [...]
  }
}
```

### Arsip
Saat tutup catatan, file akan disimpan di folder `archives/`:
- `laporan-[user]-[timestamp].pdf` - Laporan PDF lengkap
- `backup-[user]-[timestamp].json` - Backup data JSON

## 🎨 Format Jumlah

Bot mendukung berbagai format penulisan:
- `10k` atau `10rb` = Rp 10.000
- `5jt` = Rp 5.000.000
- `150rb` = Rp 150.000
- `50000` = Rp 50.000

## 🏷️ Kategori Otomatis

Bot akan otomatis mendeteksi kategori dari kata kunci:
- **Makanan**: jajan, makan, kopi, warteg, dll
- **Transport**: ojek, grab, bensin, parkir, dll
- **Belanja**: beli, shopping, tokped, dll
- **Tagihan**: listrik, wifi, pulsa, dll
- **Gaji**: gaji, bonus, terima, dll

## 📄 Isi Laporan PDF

Laporan PDF mencakup dengan tampilan profesional:

### 1. Header
- Background berwarna dengan judul besar
- Tanggal pembuatan lengkap

### 2. Ringkasan (Box dengan Grid Layout)
- Total Pemasukan (hijau)
- Total Pengeluaran (merah)
- Saldo Akhir (biru/merah)

### 3. Tabel Pengeluaran per Kategori
- Kolom: Kategori | Jumlah | Persentase
- Sorted dari terbesar ke terkecil
- Alternating row colors untuk kemudahan baca

### 4. Tabel Detail Transaksi
- Kolom: Tanggal | Tipe | Kategori | Keterangan | Jumlah
- Warna berbeda untuk pemasukan (hijau) dan pengeluaran (merah)
- Alternating row colors
- Auto pagination jika data banyak

### 5. Footer
- Timestamp pembuatan laporan

## 🔧 Kustomisasi

Anda bisa menambahkan fitur:
- Export ke Excel
- Grafik visualisasi
- Reminder tagihan
- Budget planning
- Kategori custom per user
- Backup otomatis ke cloud
- Multi-periode (mingguan, tahunan)

## ⚠️ Catatan

- Bot menggunakan LocalAuth, sesi tersimpan otomatis
- Data keuangan tersimpan lokal di server
- Pastikan backup folder `archives/` secara berkala
- PDF akan dikirim langsung ke WhatsApp setelah tutup catatan
