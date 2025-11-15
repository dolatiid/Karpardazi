const express = require('express');
const router = express.Router();
const db = require('../config/database');

// دریافت تمام دفاتر کاربر
router.get('/my-ledgers', async (req, res) => {
    try {
        // در اینجا باید userId از توکن دریافت شود
        // برای تست از کاربر پیش‌فرض استفاده می‌کنیم
        const userId = 1;
        
        const [ledgers] = await db.execute(
            'SELECT * FROM ledgers WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        
        res.json(ledgers);
    } catch (error) {
        console.error('Error fetching ledgers:', error);
        res.status(500).json({ error: 'خطا در دریافت دفاتر' });
    }
});

// ایجاد دفتر جدید
router.post('/', async (req, res) => {
    try {
        const { title, initial_debt, initial_cash, initial_pending_cost, initial_vendor_invoice } = req.body;
        const userId = 1; // برای تست
        
        // بررسی جمع مقادیر اولیه
        const total = parseFloat(initial_cash) + parseFloat(initial_pending_cost) + parseFloat(initial_vendor_invoice);
        if (total !== parseFloat(initial_debt)) {
            return res.status(400).json({ 
                error: 'جمع موجودی نقد، هزینه ارسال نشده و فاکتور نزد فروشنده باید برابر با مانده بدهی باشد' 
            });
        }
        
        const [result] = await db.execute(
            `INSERT INTO ledgers (user_id, title, initial_debt, initial_cash, initial_pending_cost, initial_vendor_invoice) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, title, initial_debt, initial_cash, initial_pending_cost, initial_vendor_invoice]
        );
        
        res.json({ 
            success: true, 
            id: result.insertId,
            message: 'دفتر با موفقیت ایجاد شد'
        });
    } catch (error) {
        console.error('Error creating ledger:', error);
        res.status(500).json({ error: 'خطا در ایجاد دفتر' });
    }
});

// دریافت اطلاعات یک دفتر
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = 1; // برای تست
        
        const [ledgers] = await db.execute(
            'SELECT * FROM ledgers WHERE id = ? AND user_id = ?',
            [id, userId]
        );
        
        if (ledgers.length === 0) {
            return res.status(404).json({ error: 'دفتر پیدا نشد' });
        }
        
        res.json(ledgers[0]);
    } catch (error) {
        console.error('Error fetching ledger:', error);
        res.status(500).json({ error: 'خطا در دریافت اطلاعات دفتر' });
    }
});

// حذف دفتر با کنترل وابستگی
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = 1; // برای تست - در حالت واقعی از توکن دریافت شود

        console.log('درخواست حذف دفتر:', id);

        // بررسی وجود دفتر
        const [ledgers] = await db.execute(
            'SELECT * FROM ledgers WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (ledgers.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'دفتر پیدا نشد' 
            });
        }

        // بررسی وجود سال‌های مالی مرتبط
        const [fiscalYears] = await db.execute(
            'SELECT id, year FROM fiscal_years WHERE ledger_id = ?',
            [id]
        );

        if (fiscalYears.length > 0) {
            // بررسی وجود تراکنش‌ها در سال‌های مالی
            let fiscalYearsWithTransactions = [];

            for (const fiscalYear of fiscalYears) {
                const [transactions] = await db.execute(
                    'SELECT id FROM transactions WHERE fiscal_year_id = ? LIMIT 1',
                    [fiscalYear.id]
                );
                
                if (transactions.length > 0) {
                    fiscalYearsWithTransactions.push(fiscalYear.year);
                }
            }

            if (fiscalYearsWithTransactions.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `امکان حذف دفتر وجود ندارد زیرا دارای سال‌های مالی با تراکنش است: ${fiscalYearsWithTransactions.join(', ')}`
                });
            }
        }

        // اگر سال مالی دارد اما تراکنش ندارد، می‌توان حذف کرد
        // حذف دفتر (به دلیل CASCADE، سال‌های مالی مرتبط هم حذف می‌شوند)
        await db.execute('DELETE FROM ledgers WHERE id = ?', [id]);

        console.log('✅ دفتر با موفقیت حذف شد:', id);

        res.json({
            success: true,
            message: 'دفتر با موفقیت حذف شد'
        });
    } catch (error) {
        console.error('❌ Error deleting ledger:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطا در حذف دفتر: ' + error.message 
        });
    }
});

// ویرایش دفتر
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, initial_debt, initial_cash, initial_pending_cost, initial_vendor_invoice } = req.body;
        const userId = 1; // برای تست

        console.log('ویرایش دفتر:', { id, title });

        // بررسی وجود دفتر
        const [ledgers] = await db.execute(
            'SELECT * FROM ledgers WHERE id = ? AND user_id = ?',
            [id, userId]
        );

        if (ledgers.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'دفتر پیدا نشد' 
            });
        }

        // بررسی جمع مقادیر اولیه
        const total = parseFloat(initial_cash) + parseFloat(initial_pending_cost) + parseFloat(initial_vendor_invoice);
        if (total !== parseFloat(initial_debt)) {
            return res.status(400).json({ 
                success: false,
                error: 'جمع موجودی نقد، هزینه ارسال نشده و فاکتور نزد فروشنده باید برابر با مانده بدهی باشد' 
            });
        }

        // بررسی وجود سال‌های مالی و تراکنش‌ها
        const [fiscalYears] = await db.execute(
            'SELECT id FROM fiscal_years WHERE ledger_id = ?',
            [id]
        );

        if (fiscalYears.length > 0) {
            // بررسی وجود تراکنش‌ها
            for (const fiscalYear of fiscalYears) {
                const [transactions] = await db.execute(
                    'SELECT id FROM transactions WHERE fiscal_year_id = ? LIMIT 1',
                    [fiscalYear.id]
                );
                
                if (transactions.length > 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'امکان ویرایش دفتر وجود ندارد زیرا دارای تراکنش است. لطفاً ابتدا تراکنش‌های مربوطه را حذف کنید.'
                    });
                }
            }
        }

        // بروزرسانی دفتر
        const [result] = await db.execute(
            `UPDATE ledgers 
             SET title = ?, initial_debt = ?, initial_cash = ?, initial_pending_cost = ?, initial_vendor_invoice = ?
             WHERE id = ? AND user_id = ?`,
            [title, initial_debt, initial_cash, initial_pending_cost, initial_vendor_invoice, id, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'دفتر پیدا نشد' 
            });
        }

        console.log('✅ دفتر با موفقیت ویرایش شد:', id);

        res.json({
            success: true,
            message: 'دفتر با موفقیت ویرایش شد'
        });
    } catch (error) {
        console.error('❌ Error updating ledger:', error);
        res.status(500).json({ 
            success: false,
            error: 'خطا در ویرایش دفتر: ' + error.message 
        });
    }
});

module.exports = router;