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

module.exports = router;