const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ورود کاربر
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // پیدا کردن کاربر
        const [users] = await db.execute(
            'SELECT * FROM users WHERE username = ?', 
            [username]
        );
        
        if (users.length === 0) {
            return res.json({ 
                success: false, 
                message: 'نام کاربری یا رمز عبور اشتباه است' 
            });
        }
        
        const user = users[0];
        
        // بررسی رمز عبور
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.json({ 
                success: false, 
                message: 'نام کاربری یا رمز عبور اشتباه است' 
            });
        }
        
        // ایجاد توکن
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                email: user.email
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'خطا در سرور' 
        });
    }
});

// ثبت نام کاربر جدید
router.post('/register', async (req, res) => {
    try {
        const { username, password, full_name, email } = req.body;
        
        // بررسی وجود کاربر
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE username = ?', 
            [username]
        );
        
        if (existingUsers.length > 0) {
            return res.json({ 
                success: false, 
                message: 'نام کاربری already exists' 
            });
        }
        
        // هش کردن رمز عبور
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // ایجاد کاربر جدید
        const [result] = await db.execute(
            'INSERT INTO users (username, password, full_name, email) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, full_name, email]
        );
        
        res.json({
            success: true,
            message: 'کاربر با موفقیت ایجاد شد'
        });
        
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'خطا در سرور' 
        });
    }
});

module.exports = router;