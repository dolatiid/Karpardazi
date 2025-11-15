const express = require('express');
const router = express.Router();
const db = require('../config/database');

// دریافت سال‌های مالی یک دفتر
router.get('/ledger/:ledgerId', async (req, res) => {
    try {
        const { ledgerId } = req.params;
        
        const [fiscalYears] = await db.execute(
            'SELECT * FROM fiscal_years WHERE ledger_id = ? ORDER BY start_date DESC',
            [ledgerId]
        );
        
        res.json(fiscalYears);
    } catch (error) {
        console.error('Error fetching fiscal years:', error);
        res.status(500).json({ error: 'خطا در دریافت سال‌های مالی' });
    }
});

// ایجاد سال مالی جدید
router.post('/', async (req, res) => {
    try {
        const { ledger_id, year, start_date, end_date, is_active = false } = req.body;
        
        console.log('📨 دریافت داده‌ها از کلاینت:', { 
            ledger_id, 
            year, 
            start_date, 
            end_date, 
            is_active 
        });
        
        // بررسی وجود فیلدهای ضروری
        if (!ledger_id) {
            return res.status(400).json({ error: 'شناسه دفتر الزامی است' });
        }
        if (!year) {
            return res.status(400).json({ error: 'عنوان سال مالی الزامی است' });
        }
        if (!start_date) {
            return res.status(400).json({ error: 'تاریخ شروع الزامی است' });
        }
        if (!end_date) {
            return res.status(400).json({ error: 'تاریخ پایان الزامی است' });
        }
        
        // بررسی ساده‌شده تاریخ‌ها (فعلاً بدون تبدیل)
        // فقط بررسی کنیم که تاریخ‌ها رشته باشند
        if (typeof start_date !== 'string' || typeof end_date !== 'string') {
            return res.status(400).json({ error: 'فرمت تاریخ‌ها نامعتبر است' });
        }
        
        // بررسی اینکه تاریخ شروع قبل از تاریخ پایان باشد (مقایسه ساده رشته)
        if (start_date >= end_date) {
            return res.status(400).json({ 
                error: `تاریخ شروع باید قبل از تاریخ پایان باشد. شروع: ${start_date}, پایان: ${end_date}` 
            });
        }
        
        // استفاده مستقیم از تاریخ‌های شمسی در دیتابیس (موقت)
        const startDateToSave = start_date; // فعلاً شمسی ذخیره می‌کنیم
        const endDateToSave = end_date; // فعلاً شمسی ذخیره می‌کنیم
        
        console.log('💾 ذخیره در دیتابیس:', { 
            startDateToSave, 
            endDateToSave 
        });
        
        // اگر سال مالی جدید فعال است، بقیه سال‌های مالی همین دفتر را غیرفعال کن
        if (is_active) {
            await db.execute(
                'UPDATE fiscal_years SET is_active = false WHERE ledger_id = ?',
                [ledger_id]
            );
        }
        
        const [result] = await db.execute(
            'INSERT INTO fiscal_years (ledger_id, year, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?)',
            [ledger_id, year, startDateToSave, endDateToSave, is_active]
        );
        
        console.log('✅ سال مالی با موفقیت ایجاد شد. ID:', result.insertId);
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'سال مالی با موفقیت ایجاد شد'
        });
        
    } catch (error) {
        console.error('❌ خطا در ایجاد سال مالی:', error);
        res.status(500).json({ 
            error: 'خطا در ایجاد سال مالی: ' + error.message 
        });
    }
});

// تنظیم سال مالی به عنوان فعال
router.put('/:id/set-active', async (req, res) => {
    try {
        const { id } = req.params;
        
        // پیدا کردن ledger_id از سال مالی
        const [fiscalYears] = await db.execute(
            'SELECT ledger_id FROM fiscal_years WHERE id = ?',
            [id]
        );
        
        if (fiscalYears.length === 0) {
            return res.status(404).json({ error: 'سال مالی پیدا نشد' });
        }
        
        const ledger_id = fiscalYears[0].ledger_id;
        
        // غیرفعال کردن تمام سال‌های مالی این دفتر
        await db.execute(
            'UPDATE fiscal_years SET is_active = false WHERE ledger_id = ?',
            [ledger_id]
        );
        
        // فعال کردن سال مالی انتخاب شده
        await db.execute(
            'UPDATE fiscal_years SET is_active = true WHERE id = ?',
            [id]
        );
        
        res.json({ 
            success: true,
            message: 'سال مالی با موفقیت فعال شد'
        });
    } catch (error) {
        console.error('Error setting active fiscal year:', error);
        res.status(500).json({ error: 'خطا در فعال کردن سال مالی' });
    }
});

// حذف سال مالی
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // بررسی وجود سال مالی
        const [fiscalYears] = await db.execute(
            'SELECT * FROM fiscal_years WHERE id = ?',
            [id]
        );
        
        if (fiscalYears.length === 0) {
            return res.status(404).json({ error: 'سال مالی پیدا نشد' });
        }
        
        // بررسی وجود تراکنش‌های مرتبط
        const [transactions] = await db.execute(
            'SELECT id FROM transactions WHERE fiscal_year_id = ?',
            [id]
        );
        
        if (transactions.length > 0) {
            return res.status(400).json({ 
                error: 'امکان حذف سال مالی وجود ندارد زیرا تراکنش‌هایی به آن مرتبط هستند' 
            });
        }
        
        await db.execute('DELETE FROM fiscal_years WHERE id = ?', [id]);
        
        res.json({ 
            success: true,
            message: 'سال مالی با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('Error deleting fiscal year:', error);
        res.status(500).json({ error: 'خطا در حذف سال مالی' });
    }
});

// دریافت اطلاعات یک سال مالی
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const [fiscalYears] = await db.execute(
            'SELECT * FROM fiscal_years WHERE id = ?',
            [id]
        );
        
        if (fiscalYears.length === 0) {
            return res.status(404).json({ error: 'سال مالی پیدا نشد' });
        }
        
        res.json(fiscalYears[0]);
    } catch (error) {
        console.error('Error fetching fiscal year:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات سال مالی' });
    }
});

module.exports = router;