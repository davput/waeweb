const express = require('express');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 3000;

// File data
const DATA_FILE = path.join(__dirname, 'finance-data.json');
const ARCHIVE_DIR = path.join(__dirname, 'archives');

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Load data
function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    return {};
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Calculate balance
function calculateBalance(transactions) {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    return { income, expense, balance: income - expense };
}

// API: Get all users
app.get('/api/users', (req, res) => {
    const data = loadData();
    const users = Object.keys(data).map(userId => ({
        id: userId,
        transactionCount: data[userId].transactions.length,
        ...calculateBalance(data[userId].transactions)
    }));
    res.json(users);
});

// API: Get user data
app.get('/api/user/:userId', (req, res) => {
    const data = loadData();
    const userId = req.params.userId;
    
    if (!data[userId]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = data[userId];
    const balance = calculateBalance(userData.transactions);
    
    // Group by category
    const byCategory = {};
    userData.transactions.forEach(t => {
        if (!byCategory[t.category]) {
            byCategory[t.category] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            byCategory[t.category].income += t.amount;
        } else {
            byCategory[t.category].expense += t.amount;
        }
    });
    
    // Group by month
    const byMonth = {};
    userData.transactions.forEach(t => {
        const month = new Date(t.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' });
        if (!byMonth[month]) {
            byMonth[month] = { income: 0, expense: 0 };
        }
        if (t.type === 'income') {
            byMonth[month].income += t.amount;
        } else {
            byMonth[month].expense += t.amount;
        }
    });
    
    res.json({
        userId,
        balance,
        transactions: userData.transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
        categories: userData.categories,
        byCategory,
        byMonth
    });
});

// API: Get transactions with pagination
app.get('/api/user/:userId/transactions', (req, res) => {
    const data = loadData();
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type; // 'income' or 'expense'
    const category = req.query.category;
    
    if (!data[userId]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    let transactions = data[userId].transactions;
    
    // Filter by type
    if (type) {
        transactions = transactions.filter(t => t.type === type);
    }
    
    // Filter by category
    if (category) {
        transactions = transactions.filter(t => t.category === category);
    }
    
    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Pagination
    const total = transactions.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedTransactions = transactions.slice(start, end);
    
    res.json({
        transactions: paginatedTransactions,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    });
});

// API: Download PDF
app.get('/api/user/:userId/download-pdf', async (req, res) => {
    const data = loadData();
    const userId = req.params.userId;
    
    if (!data[userId]) {
        return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = data[userId];
    const balance = calculateBalance(userData.transactions);
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-${userId}-${Date.now()}.pdf`);
    
    doc.pipe(res);
    
    // Header
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
    
    // Summary
    const summaryY = 120;
    doc.rect(50, summaryY, doc.page.width - 100, 100)
       .fillAndStroke('#ecf0f1', '#bdc3c7');
    
    doc.fillColor('#2c3e50')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('RINGKASAN', 70, summaryY + 15);
    
    doc.fontSize(11).font('Helvetica');
    
    const col1X = 70;
    const col2X = 250;
    const col3X = 400;
    const rowY = summaryY + 45;
    
    doc.fillColor('#27ae60')
       .fontSize(10)
       .text('Pemasukan', col1X, rowY);
    doc.fontSize(13)
       .font('Helvetica-Bold')
       .text(formatCurrency(balance.income), col1X, rowY + 15);
    
    doc.fillColor('#e74c3c')
       .fontSize(10)
       .font('Helvetica')
       .text('Pengeluaran', col2X, rowY);
    doc.fontSize(13)
       .font('Helvetica-Bold')
       .text(formatCurrency(balance.expense), col2X, rowY + 15);
    
    doc.fillColor(balance.balance >= 0 ? '#3498db' : '#e74c3c')
       .fontSize(10)
       .font('Helvetica')
       .text('Saldo Akhir', col3X, rowY);
    doc.fontSize(13)
       .font('Helvetica-Bold')
       .text(formatCurrency(balance.balance), col3X, rowY + 15);
    
    doc.fillColor('#000000');
    
    // Transactions
    let currentY = summaryY + 130;
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#2c3e50')
       .text('DETAIL TRANSAKSI', 50, currentY);
    
    currentY += 25;
    
    const transactions = userData.transactions.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Header tabel
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
        if (currentY > 750) {
            doc.addPage();
            currentY = 50;
            
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
    
    // Footer
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
});

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`📊 Dashboard running at http://localhost:${PORT}`);
    console.log(`🔗 Open in browser: http://localhost:${PORT}`);
});
