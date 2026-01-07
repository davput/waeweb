// ===== KONFIGURASI BOT KEUANGAN =====

module.exports = {
    // Whitelist nomor WhatsApp yang diizinkan
    // Format: '6281234567890@c.us' (nomor dengan kode negara tanpa +)
    ALLOWED_USERS: [
        '6283150916278@c.us',  // Ganti dengan nomor Anda
        '6285961523932@c.us',  // Tambahkan nomor lain jika perlu
        // '628987654321@c.us',
    ],
    
    // Set ke true untuk mengizinkan semua user (mode development/testing)
    // PERINGATAN: Jangan set true di production!
    ALLOW_ALL_USERS: false,
    
    // Timezone untuk laporan
    TIMEZONE: 'Asia/Jakarta',
    
    // Kategori default
    DEFAULT_CATEGORIES: [
        'Makanan',
        'Transport',
        'Belanja',
        'Tagihan',
        'Gaji',
        'Lainnya'
    ],
    
    // Limit transaksi yang ditampilkan di /list
    LIST_LIMIT: 10
};
