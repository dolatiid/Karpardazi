-- ایجاد دیتابیس
CREATE DATABASE IF NOT EXISTS karpardazi_system CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
USE karpardazi_system;

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

-- تراکنش‌های نمونه
INSERT INTO transactions (fiscal_year_id, transaction_date, transaction_type, title, amount, description) VALUES 
-- سال مالی 1402-1403 دفتر مرکزی
(1, '1402/02/15', 'دریافت وجه', 'دریافت وام از بانک', 5000000, 'دریافت وام کوتاه مدت'),
(1, '1402/03/01', 'پرداخت وجه با فاکتور', 'خرید تجهیزات اداری', 2000000, 'خرید کامپیوتر و پرینتر'),
(1, '1402/04/20', 'دریافت هزینه', 'دریافت حق الزحمه مشاوره', 3000000, 'حق الزحمه پروژه مشاوره'),

-- سال مالی 1403-1404 دفتر مرکزی
(2, '1403/01/10', 'دریافت وجه', 'فروش محصولات', 4000000, 'فروش محصولات به مشتریان'),
(2, '1403/02/05', 'پرداخت وجه بدون فاکتور', 'هزینه حمل و نقل', 500000, 'هزینه حمل مواد اولیه'),
(2, '1403/03/15', 'ارسال هزینه', 'ارسال هزینه به دفتر فروش', 1500000, 'هزینه بازاریابی و فروش'),
(2, '1403/04/01', 'واخواهی هزینه', 'بازگشت هزینه حمل', 200000, 'عودت هزینه حمل اضافی'),

-- سال مالی 1403-1404 دفتر فروش
(4, '1403/01/20', 'دریافت وجه', 'فروش مستقیم', 2500000, 'فروش مستقیم به مصرف کننده'),
(4, '1403/02/10', 'پرداخت وجه با فاکتور', 'خرید مواد تبلیغاتی', 800000, 'چاپ بروشور و کاتالوگ'),
(4, '1403/03/05', 'دریافت هزینه', 'دریافت هزینه بازاریابی', 1200000, 'هزینه allocated از دفتر مرکزی'),

-- سال مالی 1403-1404 دفتر پروژه
(5, '1403/01/15', 'دریافت وجه', 'پیش پرداخت پروژه', 6000000, 'پیش پرداخت پروژه ساختمانی'),
(5, '1403/02/20', 'پرداخت وجه با فاکتور', 'خرید مصالح ساختمانی', 3500000, 'خرید سیمان و آجر'),
(5, '1403/03/25', 'عودت مبلغ دریافتی', 'عودت پیش پرداخت', 1000000, 'کاهش scope پروژه');

-- نمایش اطلاعات ایجاد شده
SELECT '=== کاربران ===' as '';
SELECT * FROM users;

SELECT '=== دفاتر ===' as '';
SELECT * FROM ledgers;

SELECT '=== سال‌های مالی ===' as '';
SELECT * FROM fiscal_years;

SELECT '=== تراکنش‌ها ===' as '';
SELECT * FROM transactions;

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