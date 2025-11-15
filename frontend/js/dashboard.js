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
    setupEventListeners();
    
    // مقداردهی datepicker ها بعد از بارگذاری کامل صفحه
    setTimeout(() => {
        initializePersianDatePickers();
    }, 100);
});

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
        const button = document.createElement('button');
        button.className = 'list-group-item list-group-item-action ledger-item';
        
        // استفاده از تاریخ میلادی به صورت ساده
        const createdDate = new Date(ledger.created_at).toLocaleDateString('fa-IR');
        
        button.innerHTML = `
            <div class="d-flex justify-content-between align-items-start">
                <strong>${ledger.title}</strong>
                <small class="text-muted">${createdDate}</small>
            </div>
            <small class="text-muted">مانده: ${parseFloat(ledger.initial_debt).toLocaleString()} ریال</small>
        `;
        button.onclick = () => selectLedger(ledger);
        ledgersList.appendChild(button);
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
    event.currentTarget.classList.add('active');
    
    document.getElementById('currentLedgerTitle').textContent = ledger.title;
    document.getElementById('noLedgerSelected').style.display = 'none';
    document.getElementById('ledgerContent').style.display = 'block';
    
    // بارگذاری سال‌های مالی
    await loadFiscalYears(ledger.id);
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
        initial_debt: document.getElementById('initialDebt').value,
        initial_cash: document.getElementById('initialCash').value,
        initial_pending_cost: document.getElementById('initialPendingCost').value,
        initial_vendor_invoice: document.getElementById('initialVendorInvoice').value
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
    alert('ویرایش سال مالی در نسخه بعدی پیاده‌سازی می‌شود');
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
    
    const transactionData = {
        fiscal_year_id: document.getElementById('transactionFiscalYearId').value,
        transaction_date: document.getElementById('transactionDate').value, // تاریخ شمسی
        transaction_type: document.getElementById('transactionType').value,
        title: document.getElementById('transactionTitle').value,
        amount: document.getElementById('transactionAmount').value,
        description: document.getElementById('transactionDescription').value
    };
    
    console.log('📤 ارسال داده‌های تراکنش:', transactionData);
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/transactions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transactionData)
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
    
    // مرتب‌سازی تراکنش‌ها بر اساس تاریخ (صعودی)
    transactions.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
    
    let runningBalance = 0;
    let hasAddedInitialBalance = false;
    
    // اگر این کوچکترین سال مالی است و اطلاعات دفتر وجود دارد، مانده اولیه اضافه کن
    if (currentLedgerData && shouldAddInitialBalance()) {
        const initialBalanceRow = document.createElement('tr');
        initialBalanceRow.className = 'initial-balance-row';
        
        // مانده اولیه نقدی
        const initialCash = parseFloat(currentLedgerData.initial_cash) || 0;
        // هزینه ارسال نشده اولیه
        const initialPendingCost = parseFloat(currentLedgerData.initial_pending_cost) || 0;
        
        runningBalance += initialCash;
        
        initialBalanceRow.innerHTML = `
            <td>${getFiscalYearStartDate()}</td>
            <td><strong>مانده اولیه</strong></td>
            <td><strong>موجودی نقد و هزینه ارسال نشده اولیه</strong></td>
            <td><strong>${initialCash.toLocaleString()}</strong></td>
            <td></td>
            <td><strong>${runningBalance.toLocaleString()}</strong></td>
            <td><strong>${initialPendingCost.toLocaleString()}</strong></td>
            <td></td>
            <td></td>
            <td></td>
        `;
        tbody.appendChild(initialBalanceRow);
        hasAddedInitialBalance = true;
    }
    
    // نمایش تراکنش‌ها
    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        
        // محاسبه مقادیر برای هر ستون بر اساس نوع تراکنش
        const amounts = calculateTransactionAmounts(transaction, runningBalance);
        runningBalance = amounts.balance;
        
        row.innerHTML = `
            <td>${transaction.transaction_date}</td>
            <td>${transaction.transaction_type}</td>
            <td>${transaction.title}</td>
            <td>${amounts.received ? amounts.received.toLocaleString() : ''}</td>
            <td>${amounts.paid ? amounts.paid.toLocaleString() : ''}</td>
            <td>${amounts.balance.toLocaleString()}</td>
            <td>${amounts.cost_received ? amounts.cost_received.toLocaleString() : ''}</td>
            <td>${amounts.cost_sent ? amounts.cost_sent.toLocaleString() : ''}</td>
            <td>${amounts.cost_recalled ? amounts.cost_recalled.toLocaleString() : ''}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="editTransaction(${transaction.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteTransaction(${transaction.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
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

// محاسبه مقادیر مالی بر اساس نوع تراکنش
function calculateTransactionAmounts(transaction, currentBalance) {
    const amounts = {
        received: 0,
        paid: 0,
        balance: currentBalance,
        cost_received: 0,
        cost_sent: 0,
        cost_recalled: 0
    };
    
    const amount = parseFloat(transaction.amount);
    
    switch(transaction.transaction_type) {
        case 'دریافت وجه':
            amounts.received = amount;
            amounts.balance += amount;
            break;
        case 'پرداخت وجه بدون فاکتور':
        case 'پرداخت وجه با فاکتور':
            amounts.paid = amount;
            amounts.balance -= amount;
            break;
        case 'دریافت هزینه':
            amounts.cost_received = amount;
            break;
        case 'ارسال هزینه':
            amounts.cost_sent = amount;
            break;
        case 'واخواهی هزینه':
            amounts.cost_recalled = amount;
            break;
        case 'عودت مبلغ دریافتی':
            amounts.paid = amount;
            amounts.balance -= amount;
            break;
    }
    
    return amounts;
}

// محاسبه خلاصه مالی
function calculateFinancialSummary(transactions) {
    let totalReceived = 0;
    let totalPaid = 0;
    let totalBalance = 0;
    let totalCostReceived = 0;
    let totalCostSent = 0;
    let totalCostRecalled = 0;
    
    // اگر مانده اولیه وجود دارد، آن را اضافه کن
    if (currentLedgerData && shouldAddInitialBalance()) {
        totalReceived += parseFloat(currentLedgerData.initial_cash) || 0;
        totalCostReceived += parseFloat(currentLedgerData.initial_pending_cost) || 0;
        totalBalance = totalReceived - totalPaid;
    }
    
    transactions.forEach(transaction => {
        const amounts = calculateTransactionAmounts(transaction, 0);
        totalReceived += amounts.received;
        totalPaid += amounts.paid;
        totalBalance = totalReceived - totalPaid;
        totalCostReceived += amounts.cost_received;
        totalCostSent += amounts.cost_sent;
        totalCostRecalled += amounts.cost_recalled;
    });
    
    document.getElementById('totalReceived').textContent = totalReceived.toLocaleString();
    document.getElementById('totalPaid').textContent = totalPaid.toLocaleString();
    document.getElementById('totalBalance').textContent = totalBalance.toLocaleString();
    document.getElementById('totalCostReceived').textContent = totalCostReceived.toLocaleString();
    document.getElementById('totalCostSent').textContent = totalCostSent.toLocaleString();
    document.getElementById('totalCostRecalled').textContent = totalCostRecalled.toLocaleString();
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
    document.getElementById('editTransactionAmount').value = transaction.amount;
    document.getElementById('editTransactionDescription').value = transaction.description || '';
    document.getElementById('editTransactionType').value = transaction.transaction_type;
    
    // استفاده از تاریخ شمسی
    document.getElementById('editTransactionDate').value = transaction.transaction_date;
    
    modal.show();
}

// بروزرسانی تراکنش
async function updateTransaction() {
    const form = document.getElementById('editTransactionForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const transactionData = {
        transaction_date: document.getElementById('editTransactionDate').value, // تاریخ شمسی
        transaction_type: document.getElementById('editTransactionType').value,
        title: document.getElementById('editTransactionTitle').value,
        amount: document.getElementById('editTransactionAmount').value,
        description: document.getElementById('editTransactionDescription').value
    };
    
    const transactionId = document.getElementById('editTransactionId').value;
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/transactions/${transactionId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(transactionData)
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