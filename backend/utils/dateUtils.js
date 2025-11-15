const { toJalaali, toGregorian, jalaaliMonthLength, isLeapJalaaliYear } = require('jalaali-js');

// تبدیل تاریخ شمسی به میلادی
function persianToGregorian(persianDateStr) {
    if (!persianDateStr) return null;
    
    try {
        const parts = persianDateStr.split('/');
        if (parts.length !== 3) return null;
        
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        
        // بررسی اعتبار تاریخ شمسی
        if (year < 1300 || year > 1500) return null;
        if (month < 1 || month > 12) return null;
        
        // بررسی تعداد روزهای ماه
        const maxDays = jalaaliMonthLength(year, month);
        if (day < 1 || day > maxDays) return null;
        
        // تبدیل شمسی به میلادی
        const gregorian = toGregorian(year, month, day);
        
        // ایجاد تاریخ میلادی
        const gregorianDate = new Date(
            gregorian.gy, 
            gregorian.gm - 1, // ماه در JavaScript از 0 شروع می‌شود
            gregorian.gd
        );
        
        return gregorianDate.toISOString().split('T')[0];
    } catch (error) {
        console.error('Error converting persian date to gregorian:', error);
        return null;
    }
}

// تبدیل تاریخ میلادی به شمسی
function gregorianToPersian(gregorianDateStr) {
    if (!gregorianDateStr) return '';
    
    try {
        const date = new Date(gregorianDateStr + 'T00:00:00');
        
        // بررسی اعتبار تاریخ میلادی
        if (isNaN(date.getTime())) {
            return gregorianDateStr;
        }
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        // تبدیل میلادی به شمسی
        const jalaali = toJalaali(year, month, day);
        
        // فرمت کردن به صورت YYYY/MM/DD
        return `${jalaali.jy}/${String(jalaali.jm).padStart(2, '0')}/${String(jalaali.jd).padStart(2, '0')}`;
    } catch (error) {
        console.error('Error converting gregorian date to persian:', error);
        return gregorianDateStr;
    }
}

// بررسی معتبر بودن تاریخ شمسی
function isValidPersianDate(persianDateStr) {
    if (!persianDateStr) return false;
    
    try {
        const parts = persianDateStr.split('/');
        if (parts.length !== 3) return false;
        
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        
        // بررسی محدوده معقول برای سال (1300 تا 1500 شمسی)
        if (year < 1300 || year > 1500) return false;
        if (month < 1 || month > 12) return false;
        
        // بررسی تعداد روزهای ماه
        const maxDays = jalaaliMonthLength(year, month);
        if (day < 1 || day > maxDays) return false;
        
        return true;
    } catch (error) {
        return false;
    }
}

// مقایسه تاریخ‌های شمسی
function comparePersianDates(date1, date2) {
    if (!isValidPersianDate(date1) || !isValidPersianDate(date2)) {
        return null;
    }
    
    const parts1 = date1.split('/').map(Number);
    const parts2 = date2.split('/').map(Number);
    
    // مقایسه سال
    if (parts1[0] !== parts2[0]) {
        return parts1[0] - parts2[0];
    }
    
    // مقایسه ماه
    if (parts1[1] !== parts2[1]) {
        return parts1[1] - parts2[1];
    }
    
    // مقایسه روز
    return parts1[2] - parts2[2];
}

// بررسی اینکه تاریخ شمسی اول قبل از تاریخ شمسی دوم باشد
function isPersianDateBefore(date1, date2) {
    const comparison = comparePersianDates(date1, date2);
    return comparison !== null && comparison < 0;
}

module.exports = {
    persianToGregorian,
    gregorianToPersian,
    isValidPersianDate,
    comparePersianDates,
    isPersianDateBefore
};