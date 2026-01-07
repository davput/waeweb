const { Client, LocalAuth, MessageMedia } = require('./index');
const qrcode = require('qrcode-terminal');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// File untuk menyimpan data keuangan
const DATA_FILE = path.join(__dirname, 'finance-data.json');
const ARCHIVE_DIR = path.join(__dirname, 'archives');

// ===== WHITELIST CONFIGURATION =====
const ALLOWED_USERS = config.ALLOWED_USERS;
const ALLOW_ALL_USERS = config.ALLOW_ALL_USERS;

// Fungsi untuk cek apakah user diizinkan
function isUserAllowed(userId) {
    if (ALLOW_ALL_USERS) {
        console.log(`⚠️  ALLOW_ALL_USERS is enabled - User ${userId} allowed`);
        return true;
    }
    const allowed = ALLOWED_USERS.includes(userId);
    if (!allowed) {
        console.log(`🚫 Access denied for user: ${userId}`);
    }
    return allowed;
}

// Inisialisasi client dengan LocalAuth
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
        // Biarkan executablePath kosong agar Puppeteer gunakan Chromium bawaan
    }
});

// Load data keuangan
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    return {};
}

// Save data keuangan
function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Inisialisasi data user
function initUser(userId) {
    const data = loadData();
    if (!data[userId]) {
        data[userId] = {
            transactions: [],
            categories: config.DEFAULT_CATEGORIES
        };
        saveData(data);
    }
    return data;
}

// Tambah transaksi dengan tanggal custom
function addTransaction(userId, type, amount, category, description, customDate = null) {
    const data = initUser(userId);
    
    // Generate ID sederhana (nomor urut)
    const lastId = data[userId].transactions.length > 0 
        ? Math.max(...data[userId].transactions.map(t => t.id))
        : 0;
    
    data[userId].transactions.push({
        id: lastId + 1,
        type, // 'income' atau 'expense'
        amount: parseFloat(amount),
        category,
        description,
        date: customDate ? new Date(customDate).toISOString() : new Date().toISOString()
    });
    saveData(data);
}

// Parse format natural seperti "beli jajan 10k" atau "terima gaji 5jt"
function parseNaturalMessage(text) {
    // Hapus kata-kata umum di awal
    let cleanText = text.toLowerCase()
        .replace(/^(beli|bayar|belanja|buat|untuk|dapat|terima|dapet|uang\s+masuk|uang\s+keluar)\s+/i, '');
    
    // Extract jumlah dengan berbagai format:
    // - 10k, 10rb, 5jt (dengan suffix)
    // - 5000000 (angka biasa)
    // - 2.452.382 (dengan titik pemisah ribuan)
    // - 2,452,382 (dengan koma pemisah ribuan)
    // - 50.5 atau 50,5 (dengan desimal)
    const amountMatch = cleanText.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(k|rb|ribu|jt|juta)?/i);
    if (!amountMatch) return null;
    
    let amountStr = amountMatch[1];
    const unit = amountMatch[2]?.toLowerCase();
    
    // Normalisasi format angka
    // Deteksi apakah menggunakan titik atau koma sebagai pemisah ribuan
    const dotCount = (amountStr.match(/\./g) || []).length;
    const commaCount = (amountStr.match(/,/g) || []).length;
    
    // Jika ada lebih dari 1 titik atau koma, itu pemisah ribuan
    if (dotCount > 1 || (dotCount === 1 && amountStr.indexOf('.') < amountStr.length - 3)) {
        // Format: 2.452.382 (titik sebagai pemisah ribuan)
        amountStr = amountStr.replace(/\./g, '');
    } else if (commaCount > 1 || (commaCount === 1 && amountStr.indexOf(',') < amountStr.length - 3)) {
        // Format: 2,452,382 (koma sebagai pemisah ribuan)
        amountStr = amountStr.replace(/,/g, '');
    } else if (dotCount === 1) {
        // Format: 50.5 (titik sebagai desimal) - biarkan
    } else if (commaCount === 1) {
        // Format: 50,5 (koma sebagai desimal) - ganti ke titik
        amountStr = amountStr.replace(',', '.');
    }
    
    let amount = parseFloat(amountStr);
    
    // Konversi ke rupiah berdasarkan suffix
    if (unit === 'k' || unit === 'rb' || unit === 'ribu') {
        amount *= 1000;
    } else if (unit === 'jt' || unit === 'juta') {
        amount *= 1000000;
    }
    
    // Extract deskripsi (sebelum jumlah)
    let description = cleanText.substring(0, amountMatch.index).trim();
    
    // Jika tidak ada deskripsi, gunakan default berdasarkan tipe
    if (!description) {
        description = text.toLowerCase().match(/uang\s+masuk|terima|dapat|dapet|gaji/) 
            ? 'Pemasukan' 
            : 'Pengeluaran';
    }
    
    // Extract tanggal jika ada (format: tanggal 5, tgl 5 januari, 5/1, dll)
    let customDate = null;
    const dateMatch = text.match(/(?:tanggal|tgl|tg)\s+(\d{1,2})(?:\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember))?/i);
    if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const monthName = dateMatch[2];
        const now = new Date();
        let month = now.getMonth();
        
        if (monthName) {
            const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 
                          'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
            month = months.indexOf(monthName.toLowerCase());
        }
        
        customDate = new Date(now.getFullYear(), month, day);
    }
    
    // Deteksi kategori dari kata kunci
    let category = 'Lainnya';
    const lowerText = text.toLowerCase();
    if (lowerText.match(/jajan|makan|makanan|minum|kopi|nasi|soto|bakso|warteg|restoran|cafe/)) {
        category = 'Makanan';
    } else if (lowerText.match(/ojek|ojol|grab|gojek|bensin|parkir|tol|transport|angkot|bus/)) {
        category = 'Transport';
    } else if (lowerText.match(/belanja|beli|shopping|tokped|shopee|lazada/)) {
        category = 'Belanja';
    } else if (lowerText.match(/listrik|air|wifi|internet|pulsa|token|tagihan|bayar/)) {
        category = 'Tagihan';
    } else if (lowerText.match(/gaji|bonus|terima|dapat|dapet|transfer|masuk|uang\s+masuk/)) {
        category = 'Gaji';
    }
    
    return {
        amount,
        category,
        description,
        customDate
    };
}

// Hitung saldo
function calculateBalance(userId) {
    const data = loadData();
    if (!data[userId]) return { income: 0, expense: 0, balance: 0 };
    
    const transactions = data[userId].transactions;
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expense, balance: income - expense };
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Parse angka dari berbagai format
function parseAmount(amountStr) {
    if (!amountStr) return NaN;
    
    // Hapus spasi
    amountStr = amountStr.trim();
    
    // Deteksi format
    const dotCount = (amountStr.match(/\./g) || []).length;
    const commaCount = (amountStr.match(/,/g) || []).length;
    
    // Format: 2.452.382 (titik sebagai pemisah ribuan)
    if (dotCount > 1 || (dotCount === 1 && amountStr.indexOf('.') < amountStr.length - 3)) {
        amountStr = amountStr.replace(/\./g, '');
    }
    // Format: 2,452,382 (koma sebagai pemisah ribuan)
    else if (commaCount > 1 || (commaCount === 1 && amountStr.indexOf(',') < amountStr.length - 3)) {
        amountStr = amountStr.replace(/,/g, '');
    }
    // Format: 50,5 (koma sebagai desimal)
    else if (commaCount === 1) {
        amountStr = amountStr.replace(',', '.');
    }
    
    return parseFloat(amountStr);
}

// Generate PDF Laporan
async function generatePDFReport(userId) {
    try {
        const data = loadData();
        if (!data[userId] || data[userId].transactions.length === 0) {
            console.log('No transactions found for user:', userId);
            return null;
        }
        
        // Buat folder archives jika belum ada
        if (!fs.existsSync(ARCHIVE_DIR)) {
            console.log('Creating archives directory...');
            fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const pdfPath = path.join(ARCHIVE_DIR, `laporan-${userId.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.pdf`);
        
        console.log('Creating PDF at:', pdfPath);
        
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ 
                    margin: 50,
                    size: 'A4'
                });
                const stream = fs.createWriteStream(pdfPath);
                
                stream.on('error', (err) => {
                    console.error('Stream error:', err);
                    reject(err);
                });
                
                doc.on('error', (err) => {
                    console.error('PDF doc error:', err);
                    reject(err);
                });
                
                doc.pipe(stream);
        
        // ===== HEADER =====
        doc.rect(0, 0, doc.page.width, 80).fill('#2c3e50');
        doc.fillColor('#ffffff')
           .fontSize(24)
           .font('Helvetica-Bold')
           .text('LAPORAN KEUANGAN', 50, 25, { align: 'center' });
        
        doc.fontSize(11)
           .font('Helvetica')
           .text(new Date().toLocaleDateString('id-ID', { 
               weekday: 'long', 
               year: 'numeric', 
               month: 'long', 
               day: 'numeric' 
           }), 50, 50, { align: 'center' });
        
        doc.fillColor('#000000');
        doc.moveDown(4);
        
        // ===== RINGKASAN BOX =====
        const { income, expense, balance } = calculateBalance(userId);
        const summaryY = 120;
        
        // Box background
        doc.rect(50, summaryY, doc.page.width - 100, 100)
           .fillAndStroke('#ecf0f1', '#bdc3c7');
        
        // Ringkasan content
        doc.fillColor('#2c3e50')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('RINGKASAN', 70, summaryY + 15);
        
        doc.fontSize(11).font('Helvetica');
        
        // Grid layout untuk ringkasan
        const col1X = 70;
        const col2X = 250;
        const col3X = 400;
        const rowY = summaryY + 45;
        
        // Pemasukan
        doc.fillColor('#27ae60')
           .fontSize(10)
           .text('Pemasukan', col1X, rowY);
        doc.fontSize(13)
           .font('Helvetica-Bold')
           .text(formatCurrency(income), col1X, rowY + 15);
        
        // Pengeluaran
        doc.fillColor('#e74c3c')
           .fontSize(10)
           .font('Helvetica')
           .text('Pengeluaran', col2X, rowY);
        doc.fontSize(13)
           .font('Helvetica-Bold')
           .text(formatCurrency(expense), col2X, rowY + 15);
        
        // Saldo
        doc.fillColor(balance >= 0 ? '#3498db' : '#e74c3c')
           .fontSize(10)
           .font('Helvetica')
           .text('Saldo Akhir', col3X, rowY);
        doc.fontSize(13)
           .font('Helvetica-Bold')
           .text(formatCurrency(balance), col3X, rowY + 15);
        
        doc.fillColor('#000000');
        
        // ===== PENGELUARAN PER KATEGORI =====
        let currentY = summaryY + 130;
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c3e50')
           .text('PENGELUARAN PER KATEGORI', 50, currentY);
        
        currentY += 25;
        
        const expenseByCategory = {};
        data[userId].transactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                if (!expenseByCategory[t.category]) {
                    expenseByCategory[t.category] = 0;
                }
                expenseByCategory[t.category] += t.amount;
            });
        
        // Tabel kategori
        const categoryEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
        
        if (categoryEntries.length > 0) {
            // Header tabel
            doc.rect(50, currentY, doc.page.width - 100, 25).fill('#34495e');
            doc.fillColor('#ffffff')
               .fontSize(10)
               .font('Helvetica-Bold')
               .text('Kategori', 60, currentY + 8)
               .text('Jumlah', doc.page.width - 200, currentY + 8)
               .text('Persentase', doc.page.width - 120, currentY + 8);
            
            currentY += 25;
            doc.fillColor('#000000');
            
            const totalExpense = categoryEntries.reduce((sum, [, amount]) => sum + amount, 0);
            
            categoryEntries.forEach(([category, amount], index) => {
                const percentage = ((amount / totalExpense) * 100).toFixed(1);
                const bgColor = index % 2 === 0 ? '#ecf0f1' : '#ffffff';
                
                doc.rect(50, currentY, doc.page.width - 100, 20).fill(bgColor);
                doc.fillColor('#000000')
                   .fontSize(9)
                   .font('Helvetica')
                   .text(category, 60, currentY + 6)
                   .text(formatCurrency(amount), doc.page.width - 200, currentY + 6)
                   .text(`${percentage}%`, doc.page.width - 120, currentY + 6);
                
                currentY += 20;
            });
        }
        
        currentY += 30;
        
        // ===== DETAIL TRANSAKSI =====
        if (currentY > 650) {
            doc.addPage();
            currentY = 50;
        }
        
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2c3e50')
           .text('DETAIL TRANSAKSI', 50, currentY);
        
        currentY += 25;
        
        const transactions = data[userId].transactions.sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );
        
        // Header tabel transaksi
        doc.rect(50, currentY, doc.page.width - 100, 25).fill('#34495e');
        doc.fillColor('#ffffff')
           .fontSize(9)
           .font('Helvetica-Bold')
           .text('Tanggal', 60, currentY + 8)
           .text('Tipe', 130, currentY + 8)
           .text('Kategori', 190, currentY + 8)
           .text('Keterangan', 270, currentY + 8)
           .text('Jumlah', doc.page.width - 150, currentY + 8);
        
        currentY += 25;
        doc.fillColor('#000000');
        
        transactions.forEach((t, index) => {
            // Cek jika perlu halaman baru
            if (currentY > 750) {
                doc.addPage();
                currentY = 50;
                
                // Header tabel ulang
                doc.rect(50, currentY, doc.page.width - 100, 25).fill('#34495e');
                doc.fillColor('#ffffff')
                   .fontSize(9)
                   .font('Helvetica-Bold')
                   .text('Tanggal', 60, currentY + 8)
                   .text('Tipe', 130, currentY + 8)
                   .text('Kategori', 190, currentY + 8)
                   .text('Keterangan', 270, currentY + 8)
                   .text('Jumlah', doc.page.width - 150, currentY + 8);
                
                currentY += 25;
                doc.fillColor('#000000');
            }
            
            const date = new Date(t.date).toLocaleDateString('id-ID', { 
                day: '2-digit', 
                month: 'short',
                year: '2-digit'
            });
            const type = t.type === 'income' ? 'Masuk' : 'Keluar';
            const bgColor = index % 2 === 0 ? '#ecf0f1' : '#ffffff';
            const amountColor = t.type === 'income' ? '#27ae60' : '#e74c3c';
            
            doc.rect(50, currentY, doc.page.width - 100, 20).fill(bgColor);
            
            doc.fillColor('#000000')
               .fontSize(8)
               .font('Helvetica')
               .text(date, 60, currentY + 6, { width: 60 })
               .text(type, 130, currentY + 6, { width: 50 })
               .text(t.category, 190, currentY + 6, { width: 70 })
               .text(t.description.substring(0, 25), 270, currentY + 6, { width: 150 });
            
            doc.fillColor(amountColor)
               .font('Helvetica-Bold')
               .text(formatCurrency(t.amount), doc.page.width - 150, currentY + 6, { width: 100 });
            
            currentY += 20;
        });
        
        // ===== FOOTER =====
        const footerY = doc.page.height - 50;
        doc.fontSize(8)
           .fillColor('#7f8c8d')
           .font('Helvetica')
           .text(
               `Dibuat oleh Bot Keuangan WhatsApp | ${new Date().toLocaleString('id-ID')}`,
               50,
               footerY,
               { align: 'center', width: doc.page.width - 100 }
           );
        
        doc.end();
        
        stream.on('finish', () => {
            console.log('PDF created successfully');
            resolve(pdfPath);
        });
        stream.on('error', reject);
            } catch (err) {
                console.error('Error in PDF generation:', err);
                reject(err);
            }
        });
    } catch (error) {
        console.error('Error in generatePDFReport:', error);
        return null;
    }
}

// Tutup catatan dan reset
async function closePeriod(userId) {
    const data = loadData();
    if (!data[userId] || data[userId].transactions.length === 0) {
        return { success: false, message: 'Tidak ada transaksi untuk ditutup.' };
    }
    
    try {
        // Generate PDF
        console.log('Generating PDF report...');
        const pdfPath = await generatePDFReport(userId);
        if (!pdfPath) {
            return { success: false, message: 'Gagal membuat laporan PDF.' };
        }
        console.log('PDF generated:', pdfPath);
        
        // Backup data ke JSON
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(ARCHIVE_DIR, `backup-${userId.replace(/[^a-zA-Z0-9]/g, '_')}-${timestamp}.json`);
        fs.writeFileSync(backupPath, JSON.stringify(data[userId], null, 2));
        console.log('Backup created:', backupPath);
        
        // Reset transaksi
        const { income, expense, balance } = calculateBalance(userId);
        data[userId].transactions = [];
        saveData(data);
        console.log('Transactions reset for user:', userId);
        
        return {
            success: true,
            pdfPath,
            summary: { income, expense, balance }
        };
    } catch (error) {
        console.error('Error in closePeriod:', error);
        return { 
            success: false, 
            message: `Error: ${error.message}` 
        };
    }
}

// Generate laporan
function generateReport(userId, period = 'all') {
    const data = loadData();
    if (!data[userId]) return 'Belum ada data transaksi.';
    
    let transactions = data[userId].transactions;
    const now = new Date();
    
    // Filter berdasarkan periode
    if (period === 'hari') {
        transactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.toDateString() === now.toDateString();
        });
    } else if (period === 'bulan') {
        transactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getMonth() === now.getMonth() && 
                   tDate.getFullYear() === now.getFullYear();
        });
    }
    
    if (transactions.length === 0) return `Tidak ada transaksi untuk periode ${period}.`;
    
    const { income, expense, balance } = calculateBalance(userId);
    
    let report = `📊 *LAPORAN KEUANGAN*\n`;
    report += `Periode: ${period === 'all' ? 'Semua' : period === 'hari' ? 'Hari Ini' : 'Bulan Ini'}\n\n`;
    report += `💰 Pemasukan: ${formatCurrency(income)}\n`;
    report += `💸 Pengeluaran: ${formatCurrency(expense)}\n`;
    report += `📈 Saldo: ${formatCurrency(balance)}\n\n`;
    
    // Transaksi terakhir
    report += `*Transaksi Terakhir:*\n`;
    transactions.slice(-5).reverse().forEach(t => {
        const icon = t.type === 'income' ? '💰' : '💸';
        const date = new Date(t.date).toLocaleDateString('id-ID');
        report += `${icon} ${formatCurrency(t.amount)} - ${t.category}\n`;
        report += `   ${t.description} (${date})\n`;
    });
    
    return report;
}

// Hapus transaksi berdasarkan ID
function deleteTransaction(userId, transactionId) {
    const data = loadData();
    if (!data[userId]) {
        return { success: false, message: 'Tidak ada data transaksi.' };
    }
    
    const transactions = data[userId].transactions;
    const index = transactions.findIndex(t => t.id === parseInt(transactionId));
    
    if (index === -1) {
        return { success: false, message: 'Transaksi tidak ditemukan.' };
    }
    
    const deleted = transactions.splice(index, 1)[0];
    saveData(data);
    
    return {
        success: true,
        transaction: deleted
    };
}

// Lihat daftar transaksi dengan ID
function listTransactions(userId, limit = 10) {
    const data = loadData();
    if (!data[userId] || data[userId].transactions.length === 0) {
        return 'Belum ada transaksi.';
    }
    
    const transactions = data[userId].transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    
    let list = `📋 *DAFTAR TRANSAKSI*\n\n`;
    
    transactions.forEach((t, index) => {
        const icon = t.type === 'income' ? '💰' : '💸';
        const date = new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        list += `${index + 1}. ID: ${t.id}\n`;
        list += `   ${icon} ${formatCurrency(t.amount)} - ${t.category}\n`;
        list += `   ${t.description} (${date})\n\n`;
    });
    
    list += `💡 Hapus dengan: /hapus [id]`;
    
    return list;
}

// Event: QR Code
client.on('qr', (qr) => {
    console.log('📱 Scan QR code ini dengan WhatsApp Anda:\n');
    qrcode.generate(qr, { small: true });
});

// Event: Ready
client.on('ready', () => {
    console.log('✅ Bot keuangan siap digunakan!');
});

// Event: Message
client.on('message', async (msg) => {
    const userId = msg.from;
    const text = msg.body.trim();
    const textLower = text.toLowerCase();
    
    // ===== WHITELIST CHECK =====
    // Silent ignore - tidak ada respon sama sekali untuk user yang tidak diizinkan
    if (!isUserAllowed(userId)) {
        return;
    }
    
    // Command: /help
    if (textLower === '/help' || textLower === '/mulai') {
        const helpText = `💕 *BOT UNTUK CATAT UANG VEROLINA YANG CANTIK NAN COMEL* 💕 \n\n` +
            `*Cara Mudah (Natural):*\n` +
            `Uang masuk 50k\n` +
            `Uang keluar 20k\n` +
            `Beli jajan 10k\n` +
            `Beli makanan 20k tanggal 5\n` +
            `Bayar listrik 150rb tgl 10 januari\n` +
            `Terima gaji 5jt\n` +
            `Ojek 15rb\n\n` +
            `*Perintah Lengkap:*\n` +
            `/masuk [jumlah] [kategori] [keterangan]\n` +
            `/keluar [jumlah] [kategori] [keterangan]\n\n` +
            `📊 *Laporan:*\n` +
            `/saldo - Lihat saldo\n` +
            `/laporan - Laporan semua transaksi\n` +
            `/laporan hari - Laporan hari ini\n` +
            `/laporan bulan - Laporan bulan ini\n\n` +
            `📋 *Lainnya:*\n` +
            `/kategori - Lihat kategori\n` +
            `/list - Lihat daftar transaksi\n` +
            `/hapus [id] - Hapus transaksi\n` +
            `/tutup - Tutup catatan & buat PDF\n\n` +
            `*Format Jumlah:*\n` +
            `10k = 10.000\n` +
            `5jt = 5.000.000\n` +
            `150rb = 150.000\n\n` +
            `💡 *Tips:* Keterangan opsional, cukup tulis jumlahnya!`;
        
        await msg.reply(helpText);
        return;
    }
    
    // Command: /masuk (pemasukan)
    if (textLower.startsWith('/masuk ')) {
        const parts = text.replace(/^\/masuk\s+/i, '').split(' ');
        if (parts.length < 3) {
            await msg.reply('Format: /masuk [jumlah] [kategori] [keterangan]\n\nContoh:\n/masuk 2.452.382 Gaji Gaji Januari\n/masuk 5000000 Gaji Bonus');
            return;
        }
        
        const amountStr = parts[0];
        const category = parts[1];
        const description = parts.slice(2).join(' ');
        
        const amount = parseAmount(amountStr);
        if (isNaN(amount) || amount <= 0) {
            await msg.reply('❌ Jumlah tidak valid!\n\nFormat yang didukung:\n- 5000000\n- 2.452.382\n- 2,452,382');
            return;
        }
        
        addTransaction(userId, 'income', amount, category, description);
        
        // Hitung saldo setelah transaksi
        const { balance } = calculateBalance(userId);
        
        await msg.reply(
            `✅ *Pemasukan Tercatat*\n\n` +
            `💰 Jumlah: ${formatCurrency(amount)}\n` +
            `📁 Kategori: ${category}\n` +
            `📝 Keterangan: ${description}\n\n` +
            `💵 *Saldo Saat Ini: ${formatCurrency(balance)}*`
        );
        return;
    }
    
    // Command: /keluar (pengeluaran)
    if (textLower.startsWith('/keluar ')) {
        const parts = text.replace(/^\/keluar\s+/i, '').split(' ');
        if (parts.length < 3) {
            await msg.reply('Format: /keluar [jumlah] [kategori] [keterangan]\n\nContoh:\n/keluar 2.452.382 Belanja Belanja bulanan\n/keluar 50000 Makanan Makan siang');
            return;
        }
        
        const amountStr = parts[0];
        const category = parts[1];
        const description = parts.slice(2).join(' ');
        
        const amount = parseAmount(amountStr);
        if (isNaN(amount) || amount <= 0) {
            await msg.reply('❌ Jumlah tidak valid!\n\nFormat yang didukung:\n- 5000000\n- 2.452.382\n- 2,452,382');
            return;
        }
        
        addTransaction(userId, 'expense', amount, category, description);
        
        // Hitung saldo setelah transaksi
        const { balance } = calculateBalance(userId);
        
        await msg.reply(
            `✅ *Pengeluaran Tercatat*\n\n` +
            `💸 Jumlah: ${formatCurrency(amount)}\n` +
            `📁 Kategori: ${category}\n` +
            `📝 Keterangan: ${description}\n\n` +
            `💵 *Sisa Saldo: ${formatCurrency(balance)}*`
        );
        return;
    }
    
    // Command: /saldo
    if (textLower === '/saldo') {
        const { income, expense, balance } = calculateBalance(userId);
        const report = `💰 *SALDO KEUANGAN LUVLUVVV* ❤️\n\n` +
            `Pemasukan: ${formatCurrency(income)}\n` +
            `Pengeluaran: ${formatCurrency(expense)}\n` +
            `Saldo: ${formatCurrency(balance)}`;
        await msg.reply(report);
        return;
    }
    
    // Command: /laporan
    if (textLower.startsWith('/laporan')) {
        const period = textLower.split(' ')[1] || 'all';
        const report = generateReport(userId, period);
        await msg.reply(report);
        return;
    }
    
    // Command: /kategori
    if (textLower === '/kategori') {
        const data = loadData();
        const categories = data[userId]?.categories || [];
        await msg.reply(`📋 *Kategori:*\n${categories.join(', ')}`);
        return;
    }
    
    // Command: /tutup atau /tutup catatan
    if (textLower === '/tutup' || textLower === '/tutup catatan') {
        await msg.reply('⏳ Sabar ya luvluvv catatan nya lagi di tutup 😘');
        
        try {
            const result = await closePeriod(userId);
            
            if (!result.success) {
                await msg.reply(`❌ ${result.message}`);
                return;
            }
            
            // Kirim summary
            const summaryText = `✅ *CATATAN DITUTUP*\n\n` +
                `📊 *Ringkasan Periode:*\n` +
                `💰 Total Pemasukan: ${formatCurrency(result.summary.income)}\n` +
                `💸 Total Pengeluaran: ${formatCurrency(result.summary.expense)}\n` +
                `📈 Saldo Akhir: ${formatCurrency(result.summary.balance)}\n\n` +
                `📄 Laporan PDF sedang dikirim...\n` +
                `🔄 Saldo telah direset ke Rp 0`;
            
            await msg.reply(summaryText);
            
            // Kirim PDF
            const media = MessageMedia.fromFilePath(result.pdfPath);
            await client.sendMessage(userId, media, {
                caption: '📄 Laporan Keuangan Lengkap'
            });
            
            console.log(`✅ Catatan ditutup untuk user: ${userId}`);
        } catch (error) {
            console.error('Error closing period:', error);
            await msg.reply('❌ Terjadi kesalahan saat menutup catatan. Silakan coba lagi.');
        }
        return;
    }
    
    // Command: /list - Lihat daftar transaksi
    if (textLower === '/list' || textLower === '/daftar') {
        const list = listTransactions(userId, 10);
        await msg.reply(list);
        return;
    }
    
    // Command: /hapus [id] - Hapus transaksi
    if (textLower.startsWith('/hapus ')) {
        const transactionId = text.replace(/^\/hapus\s+/i, '').trim();
        
        if (!transactionId || isNaN(transactionId)) {
            await msg.reply('Format: /hapus [id]\n\nGunakan /list untuk melihat ID transaksi.');
            return;
        }
        
        const result = deleteTransaction(userId, transactionId);
        
        if (!result.success) {
            await msg.reply(`❌ ${result.message}`);
            return;
        }
        
        const t = result.transaction;
        const icon = t.type === 'income' ? '💰' : '💸';
        const typeText = t.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        
        await msg.reply(
            `✅ *Transaksi Dihapus*\n\n` +
            `${icon} ${typeText}\n` +
            `Jumlah: ${formatCurrency(t.amount)}\n` +
            `Kategori: ${t.category}\n` +
            `Keterangan: ${t.description}\n\n` +
            `Ketik /saldo untuk cek saldo terbaru`
        );
        return;
    }
    
    // Natural language parsing untuk pesan biasa
    // Cek apakah pesan mengandung angka (kemungkinan transaksi)
    if (/\d+\s*(k|rb|ribu|jt|juta)?/i.test(text) && !text.startsWith('/')) {
        const parsed = parseNaturalMessage(text);
        
        if (parsed && parsed.amount > 0) {
            // Deteksi apakah pemasukan atau pengeluaran
            const isIncome = /uang\s+masuk|terima|dapat|dapet|gaji|bonus|masuk/i.test(text);
            const type = isIncome ? 'income' : 'expense';
            
            addTransaction(
                userId, 
                type, 
                parsed.amount, 
                parsed.category, 
                parsed.description,
                parsed.customDate
            );
            
            // Hitung saldo setelah transaksi
            const { balance } = calculateBalance(userId);
            
            const icon = type === 'income' ? '💰' : '💸';
            const typeText = type === 'income' ? 'Pemasukan' : 'Pengeluaran';
            const dateText = parsed.customDate 
                ? ` (${new Date(parsed.customDate).toLocaleDateString('id-ID')})` 
                : '';
            
            await msg.reply(
                `${icon} *${typeText} Tercatat*\n\n` +
                `Jumlah: ${formatCurrency(parsed.amount)}\n` +
                `Kategori: ${parsed.category}\n` +
                `Keterangan: ${parsed.description}${dateText}\n\n` +
                `💵 *${type === 'income' ? 'Saldo bubub luvluv*💕 *sekarang*' : 'Sisa Saldo bubub luvluvv💕*'}: *${formatCurrency(balance)}* \n` +
                `${type === 'expense'? 'jan boros boros dong bubb 😖😖😖':''}`
            );
            return;
        }
    }
});

// Inisialisasi client
client.initialize();
