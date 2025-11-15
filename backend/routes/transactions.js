const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ایجاد تراکنش جدید
router.post('/', async (req, res) => {
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
        
        const [result] = await db.execute(
            `INSERT INTO transactions (fiscal_year_id, transaction_date, transaction_type, title, amount, description) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [fiscal_year_id, transactionDateToSave, transaction_type, title, parseFloat(amount), description || '']
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

// دریافت تراکنش‌های یک سال مالی
router.get('/:fiscal_year_id', async (req, res) => {
    try {
        const { fiscal_year_id } = req.params;
        
        console.log('دریافت تراکنش‌های سال مالی:', fiscal_year_id);
        
        const [transactions] = await db.execute(
            'SELECT * FROM transactions WHERE fiscal_year_id = ? ORDER BY transaction_date DESC, id DESC',
            [fiscal_year_id]
        );
        
        console.log('تعداد تراکنش‌های دریافت شده:', transactions.length);
        
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'خطا در دریافت تراکنش‌ها' });
    }
});

// ویرایش تراکنش
router.put('/:id', async (req, res) => {
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

module.exports = router;