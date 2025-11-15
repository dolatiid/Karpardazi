-- حذف دیتابیس اگر وجود دارد و ایجاد مجدد
DROP DATABASE IF EXISTS karpardazi_system;
CREATE DATABASE karpardazi_system CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
USE karpardazi_system;

-- حذف جداول اگر وجود دارند (به ترتیب وابستگی)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS fiscal_years;
DROP TABLE IF EXISTS ledgers;
DROP TABLE IF EXISTS users;

-- جدول کاربران
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول دفاتر
CREATE TABLE ledgers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    initial_debt DECIMAL(15,2) DEFAULT 0,
    initial_cash DECIMAL(15,2) DEFAULT 0,
    initial_pending_cost DECIMAL(15,2) DEFAULT 0,
    initial_vendor_invoice DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- جدول سال‌های مالی
CREATE TABLE fiscal_years (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ledger_id INT NOT NULL,
    year VARCHAR(9) NOT NULL,
    start_date VARCHAR(10) NOT NULL, -- ذخیره به صورت شمسی YYYY/MM/DD
    end_date VARCHAR(10) NOT NULL, -- ذخیره به صورت شمسی YYYY/MM/DD
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ledger_id) REFERENCES ledgers(id) ON DELETE CASCADE
);

-- جدول تراکنش‌ها
CREATE TABLE transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fiscal_year_id INT NOT NULL,
    transaction_date VARCHAR(10) NOT NULL, -- ذخیره به صورت شمسی YYYY/MM/DD
    transaction_type ENUM(
        'دریافت وجه',
        'پرداخت وجه بدون فاکتور', 
        'پرداخت وجه با فاکتور',
        'دریافت هزینه',
        'ارسال هزینه',
        'واخواهی هزینه',
        'عودت مبلغ دریافتی'
    ) NOT NULL,
    title VARCHAR(200) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    attachment_path VARCHAR(500), -- مسیر فایل ضمیمه
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (fiscal_year_id) REFERENCES fiscal_years(id) ON DELETE CASCADE
);

-- ایجاد ایندکس برای بهبود عملکرد
CREATE INDEX idx_ledgers_user_id ON ledgers(user_id);
CREATE INDEX idx_fiscal_years_ledger_id ON fiscal_years(ledger_id);
CREATE INDEX idx_fiscal_years_start_date ON fiscal_years(start_date);
CREATE INDEX idx_transactions_fiscal_year_id ON transactions(fiscal_year_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_transaction_type ON transactions(transaction_type);

-- کاربر پیش‌فرض برای تست
INSERT INTO users (username, password, full_name) VALUES 
('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'مدیر سیستم');

-- دفاتر نمونه
INSERT INTO ledgers (user_id, title, initial_debt, initial_cash, initial_pending_cost, initial_vendor_invoice) VALUES 
(1, 'دفتر مرکزی', 10000000, 5000000, 3000000, 2000000),
(1, 'دفتر فروش', 5000000, 2000000, 2000000, 1000000),
(1, 'دفتر پروژه', 8000000, 4000000, 2500000, 1500000);

-- سال‌های مالی نمونه
INSERT INTO fiscal_years (ledger_id, year, start_date, end_date, is_active) VALUES 
(1, '1402-1403', '1402/01/01', '1403/01/01', false),
(1, '1403-1404', '1403/01/01', '1404/01/01', true),
(1, '1404-1405', '1404/01/01', '1405/01/01', false),
(2, '1403-1404', '1403/01/01', '1404/01/01', true),
(3, '1403-1404', '1403/01/01', '1404/01/01', true);

-- تراکنش‌های نمونه برای تست منطق جدید
INSERT INTO transactions (fiscal_year_id, transaction_date, transaction_type, title, amount, description) VALUES 
-- سال مالی 1403-1404 دفتر مرکزی - نمونه‌هایی برای تست منطق جدید
(2, '1403/01/05', 'دریافت وجه', 'دریافت وام از بانک', 5000000, 'دریافت وام کوتاه مدت'),
(2, '1403/01/10', 'پرداخت وجه با فاکتور', 'خرید تجهیزات اداری', 2000000, 'خرید کامپیوتر و پرینتر - با فاکتور'),
(2, '1403/01/15', 'پرداخت وجه بدون فاکتور', 'هزینه حمل و نقل', 500000, 'هزینه حمل مواد اولیه - بدون فاکتور'),
(2, '1403/01/20', 'دریافت هزینه', 'دریافت فاکتور خرید تجهیزات', 2000000, 'دریافت فاکتور خرید تجهیزات اداری'),
(2, '1403/01/25', 'پرداخت وجه بدون فاکتور', 'خرید ملزومات', 300000, 'خرید ملزومات اداری - بدون فاکتور'),
(2, '1403/02/01', 'دریافت هزینه', 'دریافت فاکتور خرید ملزومات', 300000, 'دریافت فاکتور خرید ملزومات اداری'),

-- سال مالی 1403-1404 دفتر فروش
(4, '1403/01/10', 'دریافت وجه', 'فروش محصولات', 2500000, 'فروش مستقیم به مصرف کننده'),
(4, '1403/01/15', 'پرداخت وجه با فاکتور', 'خرید مواد تبلیغاتی', 800000, 'چاپ بروشور و کاتالوگ - با فاکتور'),
(4, '1403/01/20', 'پرداخت وجه بدون فاکتور', 'هزینه بازاریابی', 400000, 'هزینه بازاریابی - بدون فاکتور'),

-- سال مالی 1403-1404 دفتر پروژه
(5, '1403/01/10', 'دریافت وجه', 'پیش پرداخت پروژه', 6000000, 'پیش پرداخت پروژه ساختمانی'),
(5, '1403/01/15', 'پرداخت وجه با فاکتور', 'خرید مصالح ساختمانی', 3500000, 'خرید سیمان و آجر - با فاکتور'),
(5, '1403/01/20', 'پرداخت وجه بدون فاکتور', 'هزینه کارگری', 1000000, 'هزینه کارگری - بدون فاکتور');

-- نمایش اطلاعات ایجاد شده
SELECT '=== کاربران ===' as '';
SELECT * FROM users;

SELECT '=== دفاتر ===' as '';
SELECT * FROM ledgers;

SELECT '=== سال‌های مالی ===' as '';
SELECT * FROM fiscal_years;

SELECT '=== تراکنش‌ها ===' as '';
SELECT 
    t.*,
    fy.year as fiscal_year,
    l.title as ledger_title
FROM transactions t
JOIN fiscal_years fy ON t.fiscal_year_id = fy.id
JOIN ledgers l ON fy.ledger_id = l.id
ORDER BY t.transaction_date, t.id;

-- نمایش خلاصه اطلاعات
SELECT '=== خلاصه سیستم ===' as '';
SELECT 
    'تعداد کاربران: ' AS '',
    (SELECT COUNT(*) FROM users) AS count
UNION ALL
SELECT 
    'تعداد دفاتر: ' AS '',
    (SELECT COUNT(*) FROM ledgers) AS count
UNION ALL
SELECT 
    'تعداد سال‌های مالی: ' AS '',
    (SELECT COUNT(*) FROM fiscal_years) AS count
UNION ALL
SELECT 
    'تعداد تراکنش‌ها: ' AS '',
    (SELECT COUNT(*) FROM transactions) AS count;

-- نمایش نمونه‌ای از محاسبات برای تست منطق جدید
SELECT '=== تست منطق فاکتور نزد فروشنده ===' as '';
SELECT 
    'مانده اولیه فاکتور نزد فروشنده دفتر مرکزی: ' AS description,
    (SELECT initial_vendor_invoice FROM ledgers WHERE id = 1) AS amount
UNION ALL
SELECT 
    'جمع پرداخت‌های بدون فاکتور در دفتر مرکزی: ' AS description,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions t 
     JOIN fiscal_years fy ON t.fiscal_year_id = fy.id 
     WHERE fy.ledger_id = 1 AND t.transaction_type = 'پرداخت وجه بدون فاکتور') AS amount
UNION ALL
SELECT 
    'جمع هزینه‌های دریافتی در دفتر مرکزی: ' AS description,
    (SELECT COALESCE(SUM(amount), 0) FROM transactions t 
     JOIN fiscal_years fy ON t.fiscal_year_id = fy.id 
     WHERE fy.ledger_id = 1 AND t.transaction_type = 'دریافت هزینه') AS amount
UNION ALL
SELECT 
    'فاکتور نزد فروشنده نهایی (محاسبه شده): ' AS description,
    ((SELECT initial_vendor_invoice FROM ledgers WHERE id = 1) +
     (SELECT COALESCE(SUM(amount), 0) FROM transactions t 
      JOIN fiscal_years fy ON t.fiscal_year_id = fy.id 
      WHERE fy.ledger_id = 1 AND t.transaction_type = 'پرداخت وجه بدون فاکتور') -
     (SELECT COALESCE(SUM(amount), 0) FROM transactions t 
      JOIN fiscal_years fy ON t.fiscal_year_id = fy.id 
      WHERE fy.ledger_id = 1 AND t.transaction_type = 'دریافت هزینه')) AS amount;

-- نمایش لاگ موفقیت آمیز بودن اجرا
SELECT '=== وضعیت اجرا ===' as '';
SELECT '✅ پایگاه داده با موفقیت ایجاد و با داده‌های نمونه پر شد' AS status;