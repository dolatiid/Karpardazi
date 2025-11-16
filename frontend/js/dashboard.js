// متغیرهای global
let currentLedgerId = null;
let currentFiscalYearId = null;
let currentBalance = 0;
let allTransactions = [];
let currentLedgerData = null;

// بارگذاری اولیه صفحه
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadLedgers();
    
    setTimeout(() => {
        initializePersianDatePickers();
    }, 100);
});

// فرمت کردن مبالغ به صورت سه‌رقمی
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '';
    const number = parseFloat(amount);
    if (isNaN(number)) return '';
    return new Intl.NumberFormat('fa-IR').format(number);
}

// تبدیل به عدد
function parseCurrency(formattedValue) {
    if (!formattedValue) return 0;
    // حذف تمام جداکننده‌ها
    const cleanValue = formattedValue.toString().replace(/,/g, '');
    return parseFloat(cleanValue) || 0;
}

// تنظیم input های مبلغ
function setupCurrencyInputs() {
    const amountInputs = [
        'transactionAmount', 'editTransactionAmount',
        'initialDebt', 'initialCash', 'initialPendingCost', 'initialVendorInvoice',
        'editInitialDebt', 'editInitialCash', 'editInitialPendingCost', 'editInitialVendorInvoice'
    ];
    
    amountInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // هنگام تایپ - فقط اعداد و نقطه مجاز
            input.addEventListener('input', function(e) {
                let value = this.value;
                value = value.replace(/[^\d.]/g, '');
                const parts = value.split('.');
                if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                }
                this.value = value;
            });
            
            // هنگام خروج از فوکوس - فرمت کن
            input.addEventListener('blur', function() {
                if (this.value) {
                    const parsed = parseCurrency(this.value);
                    if (!isNaN(parsed)) {
                        this.value = formatCurrency(parsed);
                    }
                }
            });
            
            // هنگام فوکوس - حذف فرمت
            input.addEventListener('focus', function() {
                if (this.value) {
                    const parsed = parseCurrency(this.value);
                    if (!isNaN(parsed)) {
                        this.value = parsed.toString();
                    }
                }
            });
        }
    });
}

// نمایش مودال ویرایش دفتر
function showEditLedgerModal(ledgerId, event) {
    event.stopPropagation();
    
    const ledger = currentLedgerData;
    if (!ledger) return;

    // پر کردن فرم - نمایش مقادیر خام
    document.getElementById('editLedgerId').value = ledger.id;
    document.getElementById('editLedgerTitle').value = ledger.title;
    document.getElementById('editInitialDebt').value = ledger.initial_debt;
    document.getElementById('editInitialCash').value = ledger.initial_cash;
    document.getElementById('editInitialPendingCost').value = ledger.initial_pending_cost;
    document.getElementById('editInitialVendorInvoice').value = ledger.initial_vendor_invoice;

    const modal = new bootstrap.Modal(document.getElementById('editLedgerModal'));
    modal.show();
}

// بروزرسانی دفتر
async function updateLedger() {
    if (!validateEditDebtDistribution()) {
        alert('جمع موجودی نقد، هزینه ارسال نشده و فاکتور نزد فروشنده باید برابر با مانده بدهی باشد');
        return;
    }
    
    const ledgerData = {
        title: document.getElementById('editLedgerTitle').value,
        initial_debt: parseCurrency(document.getElementById('editInitialDebt').value),
        initial_cash: parseCurrency(document.getElementById('editInitialCash').value),
        initial_pending_cost: parseCurrency(document.getElementById('editInitialPendingCost').value),
        initial_vendor_invoice: parseCurrency(document.getElementById('editInitialVendorInvoice').value)
    };
    
    const ledgerId = document.getElementById('editLedgerId').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/ledgers/${ledgerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ledgerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('دفتر با موفقیت ویرایش شد');
            bootstrap.Modal.getInstance(document.getElementById('editLedgerModal')).hide();
            loadLedgers();
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating ledger:', error);
        alert('خطا در ویرایش دفتر');
    }
}

// بررسی توزیع مانده بدهی برای ویرایش
function validateEditDebtDistribution() {
    const debt = parseCurrency(document.getElementById('editInitialDebt').value) || 0;
    const cash = parseCurrency(document.getElementById('editInitialCash').value) || 0;
    const pendingCost = parseCurrency(document.getElementById('editInitialPendingCost').value) || 0;
    const vendorInvoice = parseCurrency(document.getElementById('editInitialVendorInvoice').value) || 0;
    
    const total = cash + pendingCost + vendorInvoice;
    const isValid = Math.abs(total - debt) < 0.01;
    
    const saveBtn = document.querySelector('#editLedgerModal .btn-primary');
    if (saveBtn) {
        saveBtn.disabled = !isValid;
    }
    
    return isValid;
}

// ایجاد دفتر جدید
async function createLedger() {
    if (!validateDebtDistribution()) {
        alert('جمع موجودی نقد، هزینه ارسال نشده و فاکتور نزد فروشنده باید برابر با مانده بدهی باشد');
        return;
    }
    
    const ledgerData = {
        title: document.getElementById('ledgerTitle').value,
        initial_debt: parseCurrency(document.getElementById('initialDebt').value),
        initial_cash: parseCurrency(document.getElementById('initialCash').value),
        initial_pending_cost: parseCurrency(document.getElementById('initialPendingCost').value),
        initial_vendor_invoice: parseCurrency(document.getElementById('initialVendorInvoice').value)
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/ledgers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ledgerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('دفتر با موفقیت ایجاد شد');
            bootstrap.Modal.getInstance(document.getElementById('addLedgerModal')).hide();
            loadLedgers();
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating ledger:', error);
        alert('خطا در ایجاد دفتر');
    }
}

// بررسی توزیع مانده بدهی
function validateDebtDistribution() {
    const debt = parseCurrency(document.getElementById('initialDebt').value) || 0;
    const cash = parseCurrency(document.getElementById('initialCash').value) || 0;
    const pendingCost = parseCurrency(document.getElementById('initialPendingCost').value) || 0;
    const vendorInvoice = parseCurrency(document.getElementById('initialVendorInvoice').value) || 0;
    
    const total = cash + pendingCost + vendorInvoice;
    const isValid = Math.abs(total - debt) < 0.01;
    
    const saveBtn = document.querySelector('#addLedgerModal .btn-primary');
    if (saveBtn) {
        saveBtn.disabled = !isValid;
    }
    
    return isValid;
}

// مقداردهی اولیه datepicker های فارسی
function initializePersianDatePickers() {
    try {
        if (typeof $ !== 'undefined' && $.fn.persianDatepicker) {
            $('.persian-datepicker').persianDatepicker({
                format: 'YYYY/MM/DD',
                autoClose: true,
                initialValue: false,
                persianDigit: false,
                toolbox: {
                    calendarSwitch: {
                        enabled: true
                    }
                },
                navigator: {
                    scroll: {
                        enabled: true
                    }
                },
                observer: true
            });
            console.log('Persian datepickers initialized successfully');
        } else {
            console.warn('jQuery or PersianDatepicker not loaded');
        }
    } catch (error) {
        console.error('Error initializing persian datepickers:', error);
    }
}

// تنظیم تاریخ‌های پیش‌فرض شمسی
function setDefaultPersianDates() {
    try {
        // بررسی وجود کتابخانه persianDate
        if (typeof persianDate === 'undefined') {
            console.warn('persianDate library not loaded, using fallback dates');
            setFallbackDates();
            return;
        }
        
        // استفاده از تاریخ شمسی فعلی
        const today = new Date();
        const persianDateObj = new persianDate(today);
        const todayFormatted = persianDateObj.format('YYYY/MM/DD');
        
        // تنظیم تاریخ پیش‌فرض برای تراکنش‌ها
        document.getElementById('transactionDate').value = todayFormatted;
        document.getElementById('editTransactionDate').value = todayFormatted;
        
        // تنظیم تاریخ‌های پیش‌فرض برای سال مالی (شروع: امروز، پایان: یک سال بعد)
        const nextYear = new persianDate(today);
        nextYear.add('year', 1);
        const nextYearFormatted = nextYear.format('YYYY/MM/DD');
        
        document.getElementById('startDate').value = todayFormatted;
        document.getElementById('endDate').value = nextYearFormatted;
        document.getElementById('editStartDate').value = todayFormatted;
        document.getElementById('editEndDate').value = nextYearFormatted;
        
    } catch (error) {
        console.error('Error setting default persian dates:', error);
        setFallbackDates();
    }
}

// تاریخ‌های پیش‌فرض جایگزین
function setFallbackDates() {
    // استفاده از تاریخ‌های ثابت شمسی
    document.getElementById('transactionDate').value = '1403/01/01';
    document.getElementById('editTransactionDate').value = '1403/01/01';
    document.getElementById('startDate').value = '1403/01/01';
    document.getElementById('endDate').value = '1404/01/01';
    document.getElementById('editStartDate').value = '1403/01/01';
    document.getElementById('editEndDate').value = '1404/01/01';
}

// بررسی احراز هویت
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
        window.location.href = '../index.html';
        return;
    }
    
    const userData = JSON.parse(user);
    document.getElementById('userWelcome').textContent = `خوش آمدید ${userData.full_name || userData.username}`;
}

// خروج از سیستم
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
}

// بارگذاری دفاتر کاربر
async function loadLedgers() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/ledgers/my-ledgers', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('خطا در دریافت دفاتر');
        }
        
        const ledgers = await response.json();
        renderLedgersList(ledgers);
    } catch (error) {
        console.error('Error loading ledgers:', error);
        alert('خطا در بارگذاری دفاتر');
    }
}

// نمایش لیست دفاتر
function renderLedgersList(ledgers) {
    const ledgersList = document.getElementById('ledgersList');
    ledgersList.innerHTML = '';
    
    if (ledgers.length === 0) {
        ledgersList.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="bi bi-journal-x"></i>
                <p class="mt-2">دفتری یافت نشد</p>
            </div>
        `;
        return;
    }
    
    ledgers.forEach(ledger => {
        const ledgerItem = document.createElement('div');
        ledgerItem.className = 'list-group-item ledger-item';
        ledgerItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <strong>${ledger.title}</strong>
                    <br>
                    <small class="text-muted">مانده: ${formatCurrency(ledger.initial_debt)} ریال</small>
                </div>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-warning btn-sm" onclick="showEditLedgerModal(${ledger.id}, event)">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteLedger(${ledger.id}, event)">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // اضافه کردن event listener برای انتخاب دفتر
        ledgerItem.querySelector('.flex-grow-1').addEventListener('click', () => selectLedger(ledger));
        ledgersList.appendChild(ledgerItem);
    });
}

// انتخاب دفتر
async function selectLedger(ledger) {
    currentLedgerId = ledger.id;
    currentLedgerData = ledger;
    
    // آپدیت UI
    document.querySelectorAll('.ledger-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.closest('.ledger-item').classList.add('active');
    
    document.getElementById('currentLedgerTitle').textContent = ledger.title;
    document.getElementById('noLedgerSelected').style.display = 'none';
    document.getElementById('ledgerContent').style.display = 'block';
    
    // بارگذاری سال‌های مالی
    await loadFiscalYears(ledger.id);
}

// حذف دفتر
async function deleteLedger(ledgerId, event) {
    event.stopPropagation(); // جلوگیری از انتخاب دفتر
    
    if (!confirm('آیا از حذف این دفتر اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/ledgers/${ledgerId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('دفتر با موفقیت حذف شد');
            // بارگذاری مجدد لیست دفاتر
            await loadLedgers();
            
            // اگر دفتر جاری حذف شده، محتوای دفتر را پنهان کن
            if (currentLedgerId === ledgerId) {
                currentLedgerId = null;
                currentLedgerData = null;
                document.getElementById('noLedgerSelected').style.display = 'block';
                document.getElementById('ledgerContent').style.display = 'none';
            }
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting ledger:', error);
        alert('خطا در حذف دفتر');
    }
}

// نمایش مودال ویرایش دفتر
function showEditLedgerModal(ledgerId, event) {
    event.stopPropagation();
    
    const ledger = currentLedgerData;
    if (!ledger) return;

    // پر کردن فرم با داده‌های فعلی (بدون فرمت برای ویرایش)
    document.getElementById('editLedgerId').value = ledger.id;
    document.getElementById('editLedgerTitle').value = ledger.title;
    document.getElementById('editInitialDebt').value = parseFloat(ledger.initial_debt);
    document.getElementById('editInitialCash').value = parseFloat(ledger.initial_cash);
    document.getElementById('editInitialPendingCost').value = parseFloat(ledger.initial_pending_cost);
    document.getElementById('editInitialVendorInvoice').value = parseFloat(ledger.initial_vendor_invoice);

    // نمایش مودال
    const modal = new bootstrap.Modal(document.getElementById('editLedgerModal'));
    modal.show();
}

// بروزرسانی دفتر
async function updateLedger() {
    if (!validateEditDebtDistribution()) {
        alert('جمع موجودی نقد، هزینه ارسال نشده و فاکتور نزد فروشنده باید برابر با مانده بدهی باشد');
        return;
    }
    
    const ledgerData = {
        title: document.getElementById('editLedgerTitle').value,
        initial_debt: parseFloat(document.getElementById('editInitialDebt').value),
        initial_cash: parseFloat(document.getElementById('editInitialCash').value),
        initial_pending_cost: parseFloat(document.getElementById('editInitialPendingCost').value),
        initial_vendor_invoice: parseFloat(document.getElementById('editInitialVendorInvoice').value)
    };
    
    const ledgerId = document.getElementById('editLedgerId').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/ledgers/${ledgerId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ledgerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('دفتر با موفقیت ویرایش شد');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editLedgerModal'));
            modal.hide();
            loadLedgers(); // بارگذاری مجدد لیست دفاتر
            
            // بروزرسانی داده‌های جاری
            if (currentLedgerId === parseInt(ledgerId)) {
                currentLedgerData = { ...currentLedgerData, ...ledgerData };
            }
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating ledger:', error);
        alert('خطا در ویرایش دفتر');
    }
}

// بررسی صحت توزیع مانده بدهی برای ویرایش
function validateEditDebtDistribution() {
    const debt = parseFloat(document.getElementById('editInitialDebt').value) || 0;
    const cash = parseFloat(document.getElementById('editInitialCash').value) || 0;
    const pendingCost = parseFloat(document.getElementById('editInitialPendingCost').value) || 0;
    const vendorInvoice = parseFloat(document.getElementById('editInitialVendorInvoice').value) || 0;
    
    const total = cash + pendingCost + vendorInvoice;
    const isValid = Math.abs(total - debt) < 0.01;
    
    const saveBtn = document.querySelector('#editLedgerModal .btn-primary');
    if (saveBtn) {
        saveBtn.disabled = !isValid;
        if (!isValid) {
            saveBtn.title = 'جمع موارد باید برابر با مانده بدهی باشد';
        } else {
            saveBtn.title = '';
        }
    }
    
    return isValid;
}

// بارگذاری سال‌های مالی
async function loadFiscalYears(ledgerId) {
    try {
        const response = await fetch(`/api/fiscal-years/ledger/${ledgerId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const fiscalYears = await response.json();
        console.log('سال‌های مالی دریافت شده:', fiscalYears);
        
        const select = document.getElementById('fiscalYearSelect');
        select.innerHTML = '<option value="">انتخاب سال مالی</option>';
        
        // مرتب‌سازی سال‌های مالی بر اساس تاریخ شروع (صعودی)
        fiscalYears.sort((a, b) => a.start_date.localeCompare(b.start_date));
        
        fiscalYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year.id;
            option.textContent = `${year.year} (${year.start_date} تا ${year.end_date})`;
            if (year.is_active) {
                option.textContent += ' ✅ فعال';
                option.selected = true;
                currentFiscalYearId = year.id;
            }
            select.appendChild(option);
        });
        
        // اگر سال مالی فعال وجود دارد، تراکنش‌ها را بارگذاری کن
        if (currentFiscalYearId) {
            onFiscalYearChange();
        }
    } catch (error) {
        console.error('Error loading fiscal years:', error);
        alert('خطا در بارگذاری سال‌های مالی');
    }
}

// تغییر سال مالی
function onFiscalYearChange() {
    const select = document.getElementById('fiscalYearSelect');
    currentFiscalYearId = select.value;
    
    if (currentFiscalYearId) {
        loadTransactions(currentFiscalYearId);
        document.getElementById('financialSummary').style.display = 'flex';
        document.getElementById('transactionsSection').style.display = 'block';
    } else {
        document.getElementById('financialSummary').style.display = 'none';
        document.getElementById('transactionsSection').style.display = 'none';
    }
}

// تنظیم event listeners
function setupEventListeners() {
    // بررسی جمع مقادیر دفتر
    const debtInputs = ['initialCash', 'initialPendingCost', 'initialVendorInvoice'];
    debtInputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', validateDebtDistribution);
    });

    // بررسی جمع مقادیر دفتر برای ویرایش
    const editDebtInputs = ['editInitialCash', 'editInitialPendingCost', 'editInitialVendorInvoice'];
    editDebtInputs.forEach(id => {
        document.getElementById(id)?.addEventListener('input', validateEditDebtDistribution);
    });

    // تنظیم input های مبلغ برای تراکنش‌ها
    setupTransactionCurrencyInputs();
}

// بررسی صحت توزیع مانده بدهی
function validateDebtDistribution() {
    const debt = parseFloat(document.getElementById('initialDebt').value) || 0;
    const cash = parseFloat(document.getElementById('initialCash').value) || 0;
    const pendingCost = parseFloat(document.getElementById('initialPendingCost').value) || 0;
    const vendorInvoice = parseFloat(document.getElementById('initialVendorInvoice').value) || 0;
    
    const total = cash + pendingCost + vendorInvoice;
    const isValid = Math.abs(total - debt) < 0.01; // تحمل خطای اعشاری
    
    const saveBtn = document.querySelector('#addLedgerModal .btn-primary');
    if (saveBtn) {
        saveBtn.disabled = !isValid;
        if (!isValid) {
            saveBtn.title = 'جمع موارد باید برابر با مانده بدهی باشد';
        } else {
            saveBtn.title = '';
        }
    }
    
    return isValid;
}

// فرمت کردن مبالغ به صورت سه‌رقمی
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '';
    const number = parseFloat(amount);
    if (isNaN(number)) return '';
    return number.toLocaleString('fa-IR');
}

// تبدیل فرمت به عدد
function parseCurrency(formattedValue) {
    if (!formattedValue) return 0;
    // حذف تمام کاراکترهای غیرعددی به جز نقطه
    const cleanValue = formattedValue.toString().replace(/[^\d.]/g, '');
    return parseFloat(cleanValue) || 0;
}

// اعمال فرمت روی input مبالغ تراکنش‌ها
function setupTransactionCurrencyInputs() {
    const transactionAmountInputs = [
        'transactionAmount', 
        'editTransactionAmount'
    ];
    
    transactionAmountInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // هنگام تایپ کردن، فقط اعداد و نقطه مجاز
            input.addEventListener('input', function(e) {
                let value = this.value;
                // حذف تمام کاراکترهای غیرعددی به جز نقطه
                value = value.replace(/[^\d.]/g, '');
                // فقط یک نقطه مجاز است
                const parts = value.split('.');
                if (parts.length > 2) {
                    value = parts[0] + '.' + parts.slice(1).join('');
                }
                this.value = value;
            });
            
            // هنگام خروج از focus فرمت کن
            input.addEventListener('blur', function() {
                if (this.value) {
                    const parsedValue = parseCurrency(this.value);
                    if (!isNaN(parsedValue) && parsedValue > 0) {
                        this.value = formatCurrency(parsedValue);
                    }
                }
            });
            
            // هنگام focus حذف فرمت
            input.addEventListener('focus', function() {
                if (this.value) {
                    const parsedValue = parseCurrency(this.value);
                    if (!isNaN(parsedValue)) {
                        this.value = parsedValue.toString();
                    }
                }
            });
        }
    });
}

// نمایش مودال افزودن دفتر
function showAddLedgerModal() {
    const modalElement = document.getElementById('addLedgerModal');
    const modal = new bootstrap.Modal(modalElement);
    document.getElementById('addLedgerForm').reset();
    modal.show();
}

// ایجاد دفتر جدید
async function createLedger() {
    if (!validateDebtDistribution()) {
        alert('جمع موجودی نقد، هزینه ارسال نشده و فاکتور نزد فروشنده باید برابر با مانده بدهی باشد');
        return;
    }
    
    const ledgerData = {
        title: document.getElementById('ledgerTitle').value,
        initial_debt: parseFloat(document.getElementById('initialDebt').value),
        initial_cash: parseFloat(document.getElementById('initialCash').value),
        initial_pending_cost: parseFloat(document.getElementById('initialPendingCost').value),
        initial_vendor_invoice: parseFloat(document.getElementById('initialVendorInvoice').value)
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/ledgers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(ledgerData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('دفتر با موفقیت ایجاد شد');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addLedgerModal'));
            modal.hide();
            loadLedgers(); // بارگذاری مجدد لیست دفاتر
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error creating ledger:', error);
        alert('خطا در ایجاد دفتر');
    }
}

// نمایش مودال افزودن سال مالی
function showAddFiscalYearModal() {
    if (!currentLedgerId) {
        alert('لطفاً ابتدا یک دفتر انتخاب کنید');
        return;
    }
    
    const modalElement = document.getElementById('addFiscalYearModal');
    const modal = new bootstrap.Modal(modalElement);
    document.getElementById('addFiscalYearForm').reset();
    document.getElementById('fiscalYearLedgerId').value = currentLedgerId;
    
    // نمایش نام دفتر جاری
    const currentLedgerTitle = document.getElementById('currentLedgerTitle').textContent;
    document.getElementById('currentLedgerName').textContent = currentLedgerTitle;
    
    // تنظیم تاریخ‌های پیش‌فرض شمسی
    setDefaultPersianDates();
    
    modal.show();
}

// ایجاد سال مالی جدید
async function createFiscalYear() {
    const form = document.getElementById('addFiscalYearForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const fiscalYearData = {
        ledger_id: document.getElementById('fiscalYearLedgerId').value,
        year: document.getElementById('fiscalYearTitle').value,
        start_date: document.getElementById('startDate').value, // تاریخ شمسی
        end_date: document.getElementById('endDate').value, // تاریخ شمسی
        is_active: document.getElementById('isActive').checked
    };
    
    console.log('📤 ارسال داده‌های سال مالی:', fiscalYearData);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/fiscal-years', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(fiscalYearData)
        });
        
        console.log('📥 وضعیت پاسخ:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ خطای سرور:', errorData);
            alert('خطا: ' + (errorData.error || 'خطای ناشناخته'));
            return;
        }
        
        const result = await response.json();
        console.log('✅ نتیجه موفق:', result);
        
        if (result.success) {
            alert('سال مالی با موفقیت ایجاد شد');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addFiscalYearModal'));
            modal.hide();
            
            // بارگذاری مجدد سال‌های مالی
            await loadFiscalYears(currentLedgerId);
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error creating fiscal year:', error);
        alert('خطا در ایجاد سال مالی: ' + error.message);
    }
}

// نمایش مودال مدیریت سال‌های مالی
async function showManageFiscalYearsModal() {
    if (!currentLedgerId) {
        alert('لطفاً ابتدا یک دفتر انتخاب کنید');
        return;
    }
    
    const modalElement = document.getElementById('manageFiscalYearsModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // نمایش نام دفتر
    const currentLedgerTitle = document.getElementById('currentLedgerTitle').textContent;
    document.getElementById('manageLedgerName').textContent = currentLedgerTitle;
    
    // بارگذاری و نمایش سال‌های مالی
    await loadFiscalYearsForManagement();
    modal.show();
}

// بارگذاری سال‌های مالی برای مدیریت
async function loadFiscalYearsForManagement() {
    try {
        const response = await fetch(`/api/fiscal-years/ledger/${currentLedgerId}`);
        const fiscalYears = await response.json();
        
        const tbody = document.getElementById('fiscalYearsManagementTable');
        tbody.innerHTML = '';
        
        if (fiscalYears.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        <i class="bi bi-calendar-x"></i>
                        هیچ سال مالی یافت نشد
                    </td>
                </tr>
            `;
            return;
        }
        
        for (const year of fiscalYears) {
            // دریافت تعداد تراکنش‌های هر سال مالی
            const transactionCount = await getTransactionCount(year.id);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <strong>${year.year}</strong>
                    ${year.is_active ? '<span class="badge bg-success">فعال</span>' : ''}
                </td>
                <td>${year.start_date}</td>
                <td>${year.end_date}</td>
                <td>
                    ${year.is_active ? 
                        '<span class="badge bg-success">فعال</span>' : 
                        '<span class="badge bg-secondary">غیرفعال</span>'
                    }
                </td>
                <td>
                    <span class="badge bg-primary">${transactionCount} تراکنش</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="setActiveFiscalYear(${year.id})" 
                            ${year.is_active ? 'disabled' : ''}>
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning" onclick="editFiscalYear(${year.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteFiscalYear(${year.id})" 
                            ${transactionCount > 0 ? 'disabled' : ''}>
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        }
    } catch (error) {
        console.error('Error loading fiscal years for management:', error);
    }
}

// دریافت تعداد تراکنش‌های یک سال مالی
async function getTransactionCount(fiscalYearId) {
    try {
        const response = await fetch(`/api/transactions/${fiscalYearId}`);
        const transactions = await response.json();
        return transactions.length;
    } catch (error) {
        console.error('Error getting transaction count:', error);
        return 0;
    }
}

// تنظیم سال مالی به عنوان فعال
async function setActiveFiscalYear(fiscalYearId) {
    if (!confirm('آیا از فعال کردن این سال مالی اطمینان دارید؟')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/fiscal-years/${fiscalYearId}/set-active`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('سال مالی با موفقیت فعال شد');
            // بارگذاری مجدد سال‌های مالی
            await loadFiscalYears(currentLedgerId);
            await loadFiscalYearsForManagement();
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error setting active fiscal year:', error);
        alert('خطا در فعال کردن سال مالی');
    }
}

// ویرایش سال مالی
async function editFiscalYear(fiscalYearId) {
    try {
        // دریافت اطلاعات سال مالی
        const response = await fetch(`/api/fiscal-years/${fiscalYearId}`);
        const fiscalYear = await response.json();
        
        if (!fiscalYear) {
            alert('سال مالی پیدا نشد');
            return;
        }
        
        // پر کردن فرم ویرایش
        document.getElementById('editFiscalYearId').value = fiscalYear.id;
        document.getElementById('editFiscalYearTitle').value = fiscalYear.year;
        document.getElementById('editStartDate').value = fiscalYear.start_date;
        document.getElementById('editEndDate').value = fiscalYear.end_date;
        document.getElementById('editIsActive').checked = fiscalYear.is_active;
        
        // نمایش مودال ویرایش
        const modalElement = document.getElementById('editFiscalYearModal');
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
        
    } catch (error) {
        console.error('Error loading fiscal year for edit:', error);
        alert('خطا در بارگذاری اطلاعات سال مالی');
    }
}

// بروزرسانی سال مالی
async function updateFiscalYear() {
    const form = document.getElementById('editFiscalYearForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const fiscalYearData = {
        year: document.getElementById('editFiscalYearTitle').value,
        start_date: document.getElementById('editStartDate').value,
        end_date: document.getElementById('editEndDate').value,
        is_active: document.getElementById('editIsActive').checked
    };
    
    const fiscalYearId = document.getElementById('editFiscalYearId').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/fiscal-years/${fiscalYearId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(fiscalYearData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('سال مالی با موفقیت ویرایش شد');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editFiscalYearModal'));
            modal.hide();
            
            // بارگذاری مجدد سال‌های مالی
            await loadFiscalYears(currentLedgerId);
            await loadFiscalYearsForManagement();
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating fiscal year:', error);
        alert('خطا در ویرایش سال مالی');
    }
}

// حذف سال مالی
async function deleteFiscalYear(fiscalYearId) {
    if (!confirm('آیا از حذف این سال مالی اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/fiscal-years/${fiscalYearId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('سال مالی با موفقیت حذف شد');
            // بارگذاری مجدد سال‌های مالی
            await loadFiscalYears(currentLedgerId);
            await loadFiscalYearsForManagement();
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting fiscal year:', error);
        alert('خطا در حذف سال مالی');
    }
}

// نمایش مودال افزودن تراکنش
function showAddTransactionModal() {
    if (!currentFiscalYearId) {
        alert('لطفاً ابتدا یک سال مالی انتخاب کنید');
        return;
    }
    
    const modalElement = document.getElementById('addTransactionModal');
    const modal = new bootstrap.Modal(modalElement);
    document.getElementById('addTransactionForm').reset();
    document.getElementById('transactionFiscalYearId').value = currentFiscalYearId;
    
    // تنظیم تاریخ امروز شمسی
    setDefaultPersianDates();
    
    modal.show();
}

// ایجاد تراکنش جدید
async function createTransaction() {
    const form = document.getElementById('addTransactionForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const amountValue = parseCurrency(document.getElementById('transactionAmount').value);
    if (!amountValue || amountValue <= 0) {
        alert('لطفاً مبلغ معتبر وارد کنید');
        return;
    }
    
    const formData = new FormData();
    formData.append('fiscal_year_id', document.getElementById('transactionFiscalYearId').value);
    formData.append('transaction_date', document.getElementById('transactionDate').value);
    formData.append('transaction_type', document.getElementById('transactionType').value);
    formData.append('title', document.getElementById('transactionTitle').value);
    formData.append('amount', amountValue.toString());
    formData.append('description', document.getElementById('transactionDescription').value);
    
    // اضافه کردن فایل ضمیمه اگر وجود دارد
    const attachmentFile = document.getElementById('transactionAttachment').files[0];
    if (attachmentFile) {
        formData.append('attachment', attachmentFile);
    }
    
    console.log('📤 ارسال داده‌های تراکنش:', {
        fiscal_year_id: document.getElementById('transactionFiscalYearId').value,
        transaction_date: document.getElementById('transactionDate').value,
        transaction_type: document.getElementById('transactionType').value,
        title: document.getElementById('transactionTitle').value,
        amount: amountValue
    });
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        console.log('📥 وضعیت پاسخ:', response.status);
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ خطای سرور:', errorData);
            alert('خطا: ' + (errorData.error || 'خطای ناشناخته'));
            return;
        }
        
        const result = await response.json();
        console.log('✅ نتیجه موفق:', result);
        
        if (result.success) {
            alert('تراکنش با موفقیت ثبت شد');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addTransactionModal'));
            modal.hide();
            
            // بارگذاری مجدد تراکنش‌ها
            await loadTransactions(currentFiscalYearId);
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error creating transaction:', error);
        alert('خطا در ثبت تراکنش: ' + error.message);
    }
}

// محاسبه مقادیر مالی بر اساس نوع تراکنش
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

// دانلود فایل ضمیمه
async function downloadAttachment(transactionId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/transactions/attachment/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            // ایجاد لینک دانلود
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `attachment-${transactionId}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            alert('خطا در دانلود فایل ضمیمه');
        }
    } catch (error) {
        console.error('Error downloading attachment:', error);
        alert('خطا در دانلود فایل ضمیمه');
    }
}

// بررسی آیا باید مانده اولیه اضافه شود
function shouldAddInitialBalance() {
    // فقط برای کوچکترین سال مالی مانده اولیه اضافه می‌شود
    const fiscalYearSelect = document.getElementById('fiscalYearSelect');
    if (fiscalYearSelect.options.length === 0) return false;
    
    // اولین سال مالی (کوچکترین) را پیدا کن
    let smallestYearId = null;
    let smallestYearDate = null;
    
    for (let i = 0; i < fiscalYearSelect.options.length; i++) {
        const option = fiscalYearSelect.options[i];
        if (option.value && option.value !== '') {
            const yearText = option.text;
            const startDateMatch = yearText.match(/\((\d{4}\/\d{2}\/\d{2})/);
            if (startDateMatch) {
                const startDate = startDateMatch[1];
                if (!smallestYearDate || startDate < smallestYearDate) {
                    smallestYearDate = startDate;
                    smallestYearId = option.value;
                }
            }
        }
    }
    
    return currentFiscalYearId === smallestYearId;
}

// دریافت تاریخ شروع سال مالی جاری
function getFiscalYearStartDate() {
    const fiscalYearSelect = document.getElementById('fiscalYearSelect');
    const selectedOption = fiscalYearSelect.options[fiscalYearSelect.selectedIndex];
    const yearText = selectedOption.text;
    const startDateMatch = yearText.match(/\((\d{4}\/\d{2}\/\d{2})/);
    return startDateMatch ? startDateMatch[1] : '1403/01/01';
}

// محاسبه خلاصه مالی - تابع اصلاح شده
function calculateFinancialSummary(transactions) {
    let totalReceived = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalCostReceived = 0;
    let totalCostSent = 0;
    let totalCostRecalled = 0;
    let totalVendorInvoice = 0;
    
    // اگر مانده اولیه وجود دارد، آن را اضافه کن
    if (currentLedgerData && shouldAddInitialBalance()) {
        totalReceived += parseFloat(currentLedgerData.initial_cash) || 0;
        totalCostReceived += parseFloat(currentLedgerData.initial_pending_cost) || 0;
        totalVendorInvoice = parseFloat(currentLedgerData.initial_vendor_invoice) || 0;
        totalBalance = totalReceived - totalPaid;
    }
    
    let runningVendorInvoice = totalVendorInvoice;
    let runningCostSent = 0;
    
    transactions.forEach(transaction => {
        const amounts = calculateTransactionAmounts(transaction, 0, runningVendorInvoice, runningCostSent);
        totalReceived += amounts.received;
        totalPaid += amounts.paid;
        totalBalance = totalReceived - totalPaid;
        totalCostReceived += amounts.cost_received;
        totalCostSent += amounts.cost_sent;
        totalCostRecalled += amounts.cost_recalled;
        runningVendorInvoice = amounts.vendor_invoice;
        runningCostSent = amounts.cost_sent_total;
    });
    
    totalVendorInvoice = runningVendorInvoice;
    
    // بررسی وجود المنت‌ها قبل از تنظیم مقدار
    const totalReceivedElement = document.getElementById('totalReceived');
    const totalPaidElement = document.getElementById('totalPaid');
    const totalBalanceElement = document.getElementById('totalBalance');
    const totalCostReceivedElement = document.getElementById('totalCostReceived');
    const totalCostSentElement = document.getElementById('totalCostSent');
    const totalCostRecalledElement = document.getElementById('totalCostRecalled');
    const totalVendorInvoiceElement = document.getElementById('totalVendorInvoice');
    
    if (totalReceivedElement) totalReceivedElement.textContent = formatCurrency(totalReceived);
    if (totalPaidElement) totalPaidElement.textContent = formatCurrency(totalPaid);
    if (totalBalanceElement) totalBalanceElement.textContent = formatCurrency(totalBalance);
    if (totalCostReceivedElement) totalCostReceivedElement.textContent = formatCurrency(totalCostReceived);
    if (totalCostSentElement) totalCostSentElement.textContent = formatCurrency(totalCostSent);
    if (totalCostRecalledElement) totalCostRecalledElement.textContent = formatCurrency(totalCostRecalled);
    if (totalVendorInvoiceElement) totalVendorInvoiceElement.textContent = formatCurrency(totalVendorInvoice);
}

// ویرایش تراکنش
async function editTransaction(transactionId) {
    const transaction = allTransactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    const modalElement = document.getElementById('editTransactionModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // پر کردن فرم با داده‌های فعلی
    document.getElementById('editTransactionId').value = transaction.id;
    document.getElementById('editTransactionTitle').value = transaction.title;
    document.getElementById('editTransactionAmount').value = parseFloat(transaction.amount);
    document.getElementById('editTransactionDescription').value = transaction.description || '';
    document.getElementById('editTransactionType').value = transaction.transaction_type;
    
    // استفاده از تاریخ شمسی
    document.getElementById('editTransactionDate').value = transaction.transaction_date;
    
    // نمایش اطلاعات ضمیمه اگر وجود دارد
    const attachmentInfo = document.getElementById('editAttachmentInfo');
    if (transaction.attachment_path) {
        attachmentInfo.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-paperclip"></i>
                فایل ضمیمه موجود است. انتخاب فایل جدید جایگزین می‌شود.
            </div>
        `;
    } else {
        attachmentInfo.innerHTML = '';
    }
    
    modal.show();
}

// بروزرسانی تراکنش
async function updateTransaction() {
    const form = document.getElementById('editTransactionForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const amountValue = parseCurrency(document.getElementById('editTransactionAmount').value);
    if (!amountValue || amountValue <= 0) {
        alert('لطفاً مبلغ معتبر وارد کنید');
        return;
    }
    
    const formData = new FormData();
    formData.append('transaction_date', document.getElementById('editTransactionDate').value);
    formData.append('transaction_type', document.getElementById('editTransactionType').value);
    formData.append('title', document.getElementById('editTransactionTitle').value);
    formData.append('amount', amountValue.toString());
    formData.append('description', document.getElementById('editTransactionDescription').value);
    
    // اضافه کردن فایل ضمیمه جدید اگر وجود دارد
    const attachmentFile = document.getElementById('editTransactionAttachment').files[0];
    if (attachmentFile) {
        formData.append('attachment', attachmentFile);
    }
    
    const transactionId = document.getElementById('editTransactionId').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/transactions/${transactionId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تراکنش با موفقیت ویرایش شد');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editTransactionModal'));
            modal.hide();
            
            // بارگذاری مجدد تراکنش‌ها
            await loadTransactions(currentFiscalYearId);
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert('خطا در ویرایش تراکنش');
    }
}

// حذف تراکنش
async function deleteTransaction(transactionId) {
    if (!confirm('آیا از حذف این تراکنش اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/transactions/${transactionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('تراکنش با موفقیت حذف شد');
            // بارگذاری مجدد تراکنش‌ها
            await loadTransactions(currentFiscalYearId);
        } else {
            alert('خطا: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('خطا در حذف تراکنش');
    }
}
// بارگذاری تراکنش‌ها
async function loadTransactions(fiscalYearId) {
    try {
        console.log('📥 درخواست تراکنش‌های سال مالی:', fiscalYearId);
        const response = await fetch(`/api/transactions/${fiscalYearId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const transactions = await response.json();
        console.log('✅ تراکنش‌های دریافت شده:', transactions);
        
        allTransactions = transactions;
        renderTransactionsTable(transactions);
        calculateFinancialSummary(transactions);
    } catch (error) {
        console.error('❌ Error loading transactions:', error);
        alert('خطا در بارگذاری تراکنش‌ها: ' + error.message);
    }
}

// رندر جدول تراکنش‌ها
function renderTransactionsTable(transactions) {
    const tbody = document.getElementById('transactionsTable');
    tbody.innerHTML = '';
    
    // مرتب‌سازی تراکنش‌ها بر اساس تاریخ (صعودی) و سپس بر اساس ID
    const sortedTransactions = [...transactions].sort((a, b) => {
        // اول بر اساس تاریخ مقایسه کن
        const dateCompare = comparePersianDates(a.transaction_date, b.transaction_date);
        if (dateCompare !== 0) return dateCompare;
        
        // اگر تاریخ یکسان بود، بر اساس ID (ترتیب ثبت) مرتب کن
        return a.id - b.id;
    });
    
    let runningBalance = 0;
    let runningVendorInvoice = 0;
    let runningCostSent = 0;
    let hasAddedInitialBalance = false;
    
    // اگر این کوچکترین سال مالی است و اطلاعات دفتر وجود دارد، مانده اولیه اضافه کن
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
    sortedTransactions.forEach(transaction => {
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

// تابع مقایسه تاریخ‌های شمسی
function comparePersianDates(date1, date2) {
    try {
        // تبدیل تاریخ‌ها به فرمت قابل مقایسه: YYYYMMDD
        const convertToComparable = (dateStr) => {
            const parts = dateStr.split('/');
            if (parts.length !== 3) return 0;
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]);
            const day = parseInt(parts[2]);
            return year * 10000 + month * 100 + day;
        };
        
        const date1Num = convertToComparable(date1);
        const date2Num = convertToComparable(date2);
        
        return date1Num - date2Num;
    } catch (error) {
        console.error('Error comparing persian dates:', error);
        return 0;
    }
}