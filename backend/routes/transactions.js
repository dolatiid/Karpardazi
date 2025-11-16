const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// پیکربندی multer برای آپلود فایل
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        // ایجاد پوشه اگر وجود ندارد
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // ایجاد نام فایل منحصر به فرد
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'transaction-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: function (req, file, cb) {
        // فقط فایل‌های تصویر و PDF مجاز هستند
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('فقط فایل‌های تصویر و PDF مجاز هستند'));
        }
    }
});

// ایجاد تراکنش جدید
router.post('/', upload.single('attachment'), async (req, res) => {
    try {
        const { fiscal_year_id, transaction_date, transaction_type, title, amount, description } = req.body;
        
        console.log('📨 دریافت داده‌های تراکنش:', { 
            fiscal_year_id, 
            transaction_date, 
            transaction_type, 
            title, 
            amount, 
            description 
        });
        
        // بررسی وجود فیلدهای ضروری
        if (!fiscal_year_id) {
            return res.status(400).json({ error: 'شناسه سال مالی الزامی است' });
        }
        if (!transaction_date) {
            return res.status(400).json({ error: 'تاریخ تراکنش الزامی است' });
        }
        if (!transaction_type) {
            return res.status(400).json({ error: 'نوع تراکنش الزامی است' });
        }
        if (!title) {
            return res.status(400).json({ error: 'عنوان تراکنش الزامی است' });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'مبلغ تراکنش باید بزرگتر از صفر باشد' });
        }
        
        // بررسی معتبر بودن نوع تراکنش
        const validTransactionTypes = [
            'دریافت وجه',
            'پرداخت وجه بدون فاکتور',
            'پرداخت وجه با فاکتور',
            'دریافت هزینه',
            'ارسال هزینه',
            'واخواهی هزینه',
            'عودت مبلغ دریافتی'
        ];
        
        if (!validTransactionTypes.includes(transaction_type)) {
            return res.status(400).json({ error: 'نوع تراکنش معتبر نیست' });
        }
        
        // استفاده مستقیم از تاریخ شمسی در دیتابیس
        const transactionDateToSave = transaction_date;
        
        console.log('💾 ذخیره تراکنش در دیتابیس:', { 
            transactionDateToSave,
            transaction_type,
            title,
            amount
        });
        
        // مسیر فایل ضمیمه
        const attachmentPath = req.file ? `/uploads/${req.file.filename}` : null;
        
        const [result] = await db.execute(
            `INSERT INTO transactions (fiscal_year_id, transaction_date, transaction_type, title, amount, description, attachment_path) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [fiscal_year_id, transactionDateToSave, transaction_type, title, parseFloat(amount), description || '', attachmentPath]
        );
        
        console.log('✅ تراکنش با موفقیت ثبت شد. ID:', result.insertId);
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'تراکنش با موفقیت ثبت شد'
        });
        
    } catch (error) {
        console.error('❌ خطا در ثبت تراکنش:', error);
        res.status(500).json({ 
            error: 'خطا در ثبت تراکنش: ' + error.message 
        });
    }
});

// ویرایش تراکنش
router.put('/:id', upload.single('attachment'), async (req, res) => {
    try {
        const { id } = req.params;
        const { transaction_date, transaction_type, title, amount, description } = req.body;
        
        console.log('ویرایش تراکنش:', { id, transaction_date, transaction_type, title, amount });
        
        // بررسی وجود تراکنش
        const [transactions] = await db.execute(
            'SELECT * FROM transactions WHERE id = ?',
            [id]
        );
        
        if (transactions.length === 0) {
            return res.status(404).json({ error: 'تراکنش پیدا نشد' });
        }
        
        const currentTransaction = transactions[0];
        
        // بررسی معتبر بودن نوع تراکنش
        const validTransactionTypes = [
            'دریافت وجه',
            'پرداخت وجه بدون فاکتور',
            'پرداخت وجه با فاکتور',
            'دریافت هزینه',
            'ارسال هزینه',
            'واخواهی هزینه',
            'عودت مبلغ دریافتی'
        ];
        
        if (transaction_type && !validTransactionTypes.includes(transaction_type)) {
            return res.status(400).json({ error: 'نوع تراکنش معتبر نیست' });
        }
        
        // آماده کردن فیلدها برای بروزرسانی
        const updateFields = [];
        const updateValues = [];
        
        if (transaction_date) {
            updateFields.push('transaction_date = ?');
            updateValues.push(transaction_date);
        }
        
        if (transaction_type) {
            updateFields.push('transaction_type = ?');
            updateValues.push(transaction_type);
        }
        
        if (title) {
            updateFields.push('title = ?');
            updateValues.push(title);
        }
        
        if (amount) {
            updateFields.push('amount = ?');
            updateValues.push(parseFloat(amount));
        }
        
        if (description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(description);
        }
        
        // مدیریت فایل ضمیمه
        if (req.file) {
            // حذف فایل قدیم اگر وجود دارد
            if (currentTransaction.attachment_path) {
                const oldFilePath = path.join(__dirname, '..', currentTransaction.attachment_path);
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                }
            }
            
            updateFields.push('attachment_path = ?');
            updateValues.push(`/uploads/${req.file.filename}`);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'هیچ فیلدی برای بروزرسانی ارسال نشده است' });
        }
        
        updateFields.push('updated_at = NOW()');
        updateValues.push(id);
        
        const query = `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`;
        
        await db.execute(query, updateValues);
        
        res.json({ 
            success: true,
            message: 'تراکنش با موفقیت ویرایش شد'
        });
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'خطا در ویرایش تراکنش' });
    }
});

// حذف تراکنش
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('حذف تراکنش:', id);
        
        // بررسی وجود تراکنش
        const [transactions] = await db.execute(
            'SELECT * FROM transactions WHERE id = ?',
            [id]
        );
        
        if (transactions.length === 0) {
            return res.status(404).json({ error: 'تراکنش پیدا نشد' });
        }
        
        const transaction = transactions[0];
        
        // حذف فایل ضمیمه اگر وجود دارد
        if (transaction.attachment_path) {
            const filePath = path.join(__dirname, '..', transaction.attachment_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        await db.execute('DELETE FROM transactions WHERE id = ?', [id]);
        
        res.json({ 
            success: true,
            message: 'تراکنش با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'خطا در حذف تراکنش' });
    }
});

// دانلود فایل ضمیمه
router.get('/attachment/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [transactions] = await db.execute(
            'SELECT attachment_path FROM transactions WHERE id = ?',
            [id]
        );
        
        if (transactions.length === 0 || !transactions[0].attachment_path) {
            return res.status(404).json({ error: 'فایل ضمیمه پیدا نشد' });
        }
        
        const filePath = path.join(__dirname, '..', transactions[0].attachment_path);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'فایل ضمیمه پیدا نشد' });
        }
        
        res.download(filePath);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ error: 'خطا در دانلود فایل' });
    }
});
// آپدیت تابع renderTransactionsTable
function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTable');
    tbody.innerHTML = '';
    
    // مرتب‌سازی تراکنش‌ها
    transactions.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    
    let runningBalance = 0;
    let runningVendorInvoice = 0;
    let runningCostSent = 0;
    let hasAddedInitialBalance = false;
    
    // اضافه کردن مانده اولیه اگر لازم باشد
    if (currentLedgerData && shouldAddInitialBalance()) {
        const initialCash = parseFloat(currentLedgerData.initial_cash) || 0;
        const initialVendorInvoice = parseFloat(currentLedgerData.initial_vendor_invoice) || 0;
        
        runningBalance += initialCash;
        runningVendorInvoice = initialVendorInvoice;
        
        const initialBalanceRow = document.createElement('tr');
        initialBalanceRow.className = 'initial-balance-row';
        initialBalanceRow.innerHTML = `
            <td>${getFiscalYearStartDate()}</td>
            <td><strong>مانده اولیه</strong></td>
            <td><strong>موجودی نقد و هزینه ارسال نشده اولیه</strong></td>
            <td><strong>${formatCurrency(initialCash)}</strong></td>
            <td></td>
            <td><strong>${formatCurrency(runningBalance)}</strong></td>
            <td></td>
            <td></td>
            <td></td>
            <td><strong>${formatCurrency(initialVendorInvoice)}</strong></td>
            <td><span class="badge bg-success">معتبر</span></td>
            <td></td>
        `;
        tbody.appendChild(initialBalanceRow);
        hasAddedInitialBalance = true;
    }
    
    // نمایش تراکنش‌ها
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // محاسبه مقادیر و وضعیت
        const amounts = calculateTransactionAmounts(transaction, runningBalance, runningVendorInvoice, runningCostSent);
        runningBalance = amounts.balance;
        runningVendorInvoice = amounts.vendor_invoice;
        runningCostSent = amounts.cost_sent_total;
        
        // تعیین وضعیت
        const statusBadge = transaction.status === 'معتبر' ? 
            '<span class="badge bg-success">معتبر</span>' : 
            `<span class="badge bg-danger" title="${transaction.status_reason || 'نامعتبر'}">نامعتبر</span>`;
        
        // دکمه دانلود ضمیمه
        const attachmentButton = transaction.attachment_path ? 
            `<button class="btn btn-sm btn-outline-info" onclick="downloadAttachment(${transaction.id})" title="دانلود ضمیمه">
                <i class="bi bi-paperclip"></i>
            </button>` : '';
        
        row.innerHTML = `
            <td>${transaction.transaction_date}</td>
            <td>${transaction.transaction_type}</td>
            <td>${transaction.title}</td>
            <td>${amounts.received ? formatCurrency(amounts.received) : ''}</td>
            <td>${amounts.paid ? formatCurrency(amounts.paid) : ''}</td>
            <td>${formatCurrency(amounts.balance)}</td>
            <td>${amounts.cost_received ? formatCurrency(amounts.cost_received) : ''}</td>
            <td>${amounts.cost_sent ? formatCurrency(amounts.cost_sent) : ''}</td>
            <td>${amounts.cost_recalled ? formatCurrency(amounts.cost_recalled) : ''}</td>
            <td>${formatCurrency(amounts.vendor_invoice)}</td>
            <td>${statusBadge}</td>
            <td>
                ${attachmentButton}
                <button class="btn btn-sm btn-warning" onclick="editTransaction(${transaction.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTransaction(${transaction.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        // رنگ‌آمیزی ردیف‌های نامعتبر
        if (transaction.status === 'نامعتبر') {
            row.classList.add('table-danger');
        }
        
        tbody.appendChild(row);
    });
}

// آپدیت تابع calculateTransactionAmounts برای محاسبه cost_sent_total
function calculateTransactionAmounts(transaction, currentBalance, currentVendorInvoice, currentCostSent) {
    const amounts = {
        received: 0,
        paid: 0,
        balance: currentBalance,
        cost_received: 0,
        cost_sent: 0,
        cost_recalled: 0,
        vendor_invoice: currentVendorInvoice,
        cost_sent_total: currentCostSent
    };
    
    const amount = parseFloat(transaction.amount);
    
    switch(transaction.transaction_type) {
        case 'دریافت وجه':
            amounts.received = amount;
            amounts.balance += amount;
            break;
            
        case 'پرداخت وجه بدون فاکتور':
            amounts.paid = amount;
            amounts.balance -= amount;
            amounts.vendor_invoice += amount;
            break;
            
        case 'پرداخت وجه با فاکتور':
            amounts.paid = amount;
            amounts.balance -= amount;
            break;
            
        case 'دریافت هزینه':
            amounts.cost_received = amount;
            amounts.vendor_invoice -= amount;
            break;
            
        case 'ارسال هزینه':
            amounts.cost_sent = amount;
            amounts.cost_sent_total += amount;
            break;
            
        case 'واخواهی هزینه':
            amounts.cost_recalled = amount;
            amounts.cost_sent_total -= amount;
            break;
            
        case 'عودت مبلغ دریافتی':
            amounts.paid = amount;
            amounts.balance -= amount;
            break;
    }
    
    // اطمینان از عدم منفی شدن مقادیر
    if (amounts.vendor_invoice < 0) amounts.vendor_invoice = 0;
    if (amounts.cost_sent_total < 0) amounts.cost_sent_total = 0;
    
    return amounts;
}
// دریافت تراکنش‌های یک سال مالی
router.get('/:fiscal_year_id', async (req, res) => {
    try {
        const { fiscal_year_id } = req.params;
        
        console.log('دریافت تراکنش‌های سال مالی:', fiscal_year_id);
        
        // مرتب‌سازی بر اساس تاریخ (صعودی) و سپس ID
        const [transactions] = await db.execute(
            `SELECT * FROM transactions 
             WHERE fiscal_year_id = ? 
             ORDER BY 
                 SUBSTRING_INDEX(transaction_date, '/', 1) DESC,
                 SUBSTRING_INDEX(SUBSTRING_INDEX(transaction_date, '/', 2), '/', -1) DESC,
                 SUBSTRING_INDEX(transaction_date, '/', -1) DESC,
                 id ASC`,
            [fiscal_year_id]
        );
        
        console.log('تعداد تراکنش‌های دریافت شده:', transactions.length);
        
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'خطا در دریافت تراکنش‌ها' });
    }
});

module.exports = router;