// DOM Elements - Wrapped in a getter to ensure they are found when called
const getEl = (id) => document.getElementById(id);
const getAll = (sel) => document.querySelectorAll(sel);
// Variable declarations
let currentUser = null;
let transactions = [];
let categories = [];
let currentType = 'expense';
let budgetSettings = JSON.parse(localStorage.getItem('budgetSettings')) || {
    totalBudget: 0,
    categoryBudgets: {},
    alerts: { at80: true, at100: true },
    alertsShown: { at80: false, at100: false }
};

const defaultCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Health', 'Bills'];

// Formatters
const formatCurrency = (amount) => {
    return 'Rs. ' + Math.floor(Math.abs(amount || 0)).toLocaleString();
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

// Icons Mapping
const getCategoryIcon = (category) => {
    const lower = (category || '').toLowerCase();
    if (lower.includes('food') || lower.includes('coffee') || lower.includes('eat')) return 'fa-utensils';
    if (lower.includes('transport') || lower.includes('car') || lower.includes('fuel') || lower.includes('bus')) return 'fa-car';
    if (lower.includes('shop') || lower.includes('store') || lower.includes('buy')) return 'fa-shopping-bag';
    if (lower.includes('bill') || lower.includes('rent') || lower.includes('utility')) return 'fa-file-invoice-dollar';
    if (lower.includes('entertainment') || lower.includes('movie') || lower.includes('game')) return 'fa-gamepad';
    if (lower.includes('health') || lower.includes('medical') || lower.includes('doctor')) return 'fa-heartbeat';
    if (lower.includes('salary') || lower.includes('paycheck') || lower.includes('wage')) return 'fa-money-bill-wave';
    if (lower.includes('invest') || lower.includes('stock')) return 'fa-chart-line';
    return 'fa-tag';
};

// --- Initialization ---

async function init() {
    console.log("Initializing App...");

    if (!isConfigured()) {
        const header = document.querySelector('.header-content');
        if (header) header.innerHTML = `<h1>Supabase Not Configured</h1><p>Please fix your config.</p>`;
        return;
    }

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;

    // Inject User Profile
    const emailName = currentUser.email.split('@')[0];
    const isAdmin = currentUser.email === 'ishoracharya977@gmail.com';
    const profileHTML = `
        <div class="user-profile">
            <div class="user-avatar">${emailName.charAt(0).toUpperCase()}</div>
            <div class="user-detail">
                <div class="user-name">${emailName}</div>
                ${isAdmin ? '<a href="admin.html" class="user-admin-link"><i class="fas fa-user-shield"></i> Admin Panel</a>' : ''}
            </div>
            <button class="logout-btn-icon" id="logout-btn" title="Logout"><i class="fas fa-power-off"></i></button>
        </div>
    `;
    const headerContent = document.querySelector('.header-content');
    if (headerContent && !document.querySelector('.user-profile')) {
        headerContent.insertAdjacentHTML('afterbegin', profileHTML);
    }

    const logoutBtn = getEl('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }

    // Load Data
    try {
        categories = await CategoryService.getAll();
        transactions = await TransactionService.getAll();
    } catch (err) {
        console.error("Data load error:", err);
    }

    if (!categories || categories.length === 0) {
        categories = [...defaultCategories, 'Salary', 'Investment'];
    }

    renderCategories();
    updateUI();
}

function updateUI() {
    console.log("Updating UI...");
    const balanceEl = getEl('total-balance');
    const incomeEl = getEl('total-income');
    const expenseEl = getEl('total-expense');
    const list = getEl('transaction-list');
    const emptyState = getEl('empty-state');

    if (!balanceEl || !incomeEl || !expenseEl || !list) return;

    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const total = amounts.reduce((acc, item) => acc + item, 0);
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    balanceEl.innerText = (total < 0 ? '-' : '') + formatCurrency(total);
    incomeEl.innerText = `+${formatCurrency(income)}`;
    expenseEl.innerText = `-${formatCurrency(expense)}`;

    updateBudgetTracker(expense);

    list.innerHTML = '';
    if (transactions.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        list.appendChild(emptyState);
    } else {
        if (emptyState) emptyState.classList.add('hidden');
        transactions.forEach(t => {
            const li = document.createElement('li');
            li.className = 'transaction-item';
            const icon = getCategoryIcon(t.category);
            const amtClass = t.type === 'income' ? 'amount-income' : 'amount-expense';
            const sign = t.type === 'income' ? '+' : '-';

            li.innerHTML = `
                <div class="t-left">
                    <div class="t-icon"><i class="fas ${icon}"></i></div>
                    <div class="t-info">
                        <span class="t-category">${t.category}</span>
                        <span class="t-note">${t.note || t.type}</span>
                    </div>
                </div>
                <div class="t-right">
                    <span class="t-amount ${amtClass}">${sign}${formatCurrency(t.amount).replace('Rs.', '')}</span>
                    <span class="t-date">${formatDate(t.date)}</span>
                </div>
            `;

            const delBtn = document.createElement('button');
            delBtn.className = 't-delete';
            delBtn.innerHTML = '<i class="fas fa-times"></i>';
            delBtn.onclick = () => deleteTransaction(t.id);
            li.querySelector('.t-right').appendChild(delBtn);
            list.appendChild(li);
        });
    }
}

function renderCategories() {
    const sel = getEl('category');
    if (!sel) return;
    sel.innerHTML = '<option value="" disabled selected>Select Category</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        sel.appendChild(opt);
    });
}

async function addTransaction(e) {
    e.preventDefault();
    const amt = getEl('amount');
    const cat = getEl('category');
    const note = getEl('note');
    const sub = getEl('submit-btn');

    if (!amt.value || !cat.value) {
        alert('Please fill Amount and Category');
        return;
    }

    sub.disabled = true;
    sub.innerText = 'Saving...';

    const tx = {
        type: currentType,
        amount: +amt.value,
        category: cat.value,
        note: note.value,
        date: new Date().toISOString()
    };

    const saved = await TransactionService.add(tx);
    if (saved) {
        transactions.unshift(saved);
        updateUI();
        amt.value = '';
        note.value = '';
        cat.value = '';
    } else {
        alert('Failed to save');
    }
    sub.disabled = false;
    sub.innerText = currentType === 'income' ? 'Add Income' : 'Add Expense';
}

async function deleteTransaction(id) {
    if (!confirm('Are you sure?')) return;
    if (await TransactionService.delete(id)) {
        transactions = transactions.filter(t => t.id !== id);
        updateUI();
    }
}

// --- Event Listeners ---

function setupEventListeners() {
    console.log("Setting up Event Listeners...");
    const tabs = getAll('.tab-btn');
    const form = getEl('transaction-form');
    const addCat = getEl('add-category-btn');
    const saveCat = getEl('save-category-btn');
    const cancelCat = getEl('cancel-category-btn');
    const clearBtn = getEl('clear-data-btn');

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentType = btn.getAttribute('data-type');
            const sub = getEl('submit-btn');
            if (sub) {
                sub.innerText = currentType === 'income' ? 'Add Income' : 'Add Expense';
                sub.style.background = currentType === 'income' ? 'var(--success-color)' : 'var(--danger-color)';
            }
        });
    });

    if (form) form.addEventListener('submit', addTransaction);
    if (clearBtn) clearBtn.style.display = 'none';

    if (addCat) {
        addCat.addEventListener('click', () => {
            getEl('category-group').classList.add('hidden');
            getEl('new-category-input-group').classList.remove('hidden');
            getEl('new-category-name').focus();
        });
    }

    if (cancelCat) {
        cancelCat.addEventListener('click', () => {
            getEl('new-category-input-group').classList.add('hidden');
            getEl('category-group').classList.remove('hidden');
        });
    }

    if (saveCat) {
        saveCat.addEventListener('click', async () => {
            const input = getEl('new-category-name');
            const val = input.value.trim();
            if (val && !categories.includes(val)) {
                if (await CategoryService.add(val)) {
                    categories.push(val);
                    renderCategories();
                    getEl('category').value = val;
                }
            }
            getEl('new-category-input-group').classList.add('hidden');
            getEl('category-group').classList.remove('hidden');
            input.value = '';
        });
    }
}

// --- Budget Management ---

function setupBudgetManager() {
    console.log("Setting up Budget Manager...");
    const btn = getEl('budget-manager-btn');
    const modal = getEl('budget-modal');
    const close = getEl('close-budget-modal');
    const cancel = getEl('cancel-budget');
    const save = getEl('save-budget');

    if (!btn || !modal) {
        console.warn("Budget elements not found");
        return;
    }

    btn.addEventListener('click', () => {
        modal.classList.add('active');
        loadBudgetModal();
    });

    const closeModal = () => modal.classList.remove('active');
    [close, cancel].forEach(el => el && el.addEventListener('click', closeModal));

    const backdrop = document.querySelector('.budget-modal-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeModal);

    if (save) {
        save.addEventListener('click', () => {
            const input = getEl('total-budget-input');
            const val = parseFloat(input.value) || 0;
            if (val <= 0) return alert('Enter a valid amount');

            budgetSettings.totalBudget = val;
            const catInputs = getAll('.category-budget-input');
            catInputs.forEach(i => {
                budgetSettings.categoryBudgets[i.dataset.category] = parseFloat(i.value) || 0;
            });

            budgetSettings.alerts.at80 = getEl('alert-80').checked;
            budgetSettings.alerts.at100 = getEl('alert-100').checked;
            budgetSettings.alertsShown = { at80: false, at100: false };

            localStorage.setItem('budgetSettings', JSON.stringify(budgetSettings));
            closeModal();
            updateUI();
            alert('Saved!');
        });
    }
}

function loadBudgetModal() {
    const totalInput = getEl('total-budget-input');
    const container = getEl('category-budgets');
    if (getEl('alert-80')) getEl('alert-80').checked = budgetSettings.alerts.at80;
    if (getEl('alert-100')) getEl('alert-100').checked = budgetSettings.alerts.at100;

    const allCats = new Set([...defaultCategories, ...categories]);
    const spending = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        spending[t.category] = (spending[t.category] || 0) + t.amount;
    });

    if (container) {
        container.innerHTML = '';
        allCats.forEach(cat => {
            const spent = spending[cat] || 0;
            const budget = budgetSettings.categoryBudgets[cat] || 0;
            const item = document.createElement('div');
            item.className = 'category-budget-item';

            if (budget > 0) {
                const ratio = spent / budget;
                if (ratio >= 1) item.classList.add('danger');
                else if (ratio >= 0.8) item.classList.add('warning');
                else item.classList.add('safe');
            }

            item.innerHTML = `
                <div class="category-icon"><i class="fas ${getCategoryIcon(cat)}"></i></div>
                <div class="category-info">
                    <div class="category-name">${cat}</div>
                    <div class="category-spent">Spent: Rs. ${Math.floor(spent).toLocaleString()}</div>
                </div>
                <input type="number" class="category-budget-input" data-category="${cat}" value="${budget || ''}">
            `;
            container.appendChild(item);
        });

        // Dynamic sum calculation
        const updateSum = () => {
            const sum = Array.from(getAll('.category-budget-input')).reduce((acc, i) => acc + (parseFloat(i.value) || 0), 0);
            if (totalInput) totalInput.value = sum || '';
        };

        getAll('.category-budget-input').forEach(i => i.addEventListener('input', updateSum));
        updateSum(); // Initial calculate
    }
}

function updateBudgetTracker(expense) {
    const spentEl = getEl('budget-spent');
    const totalEl = getEl('budget-total');
    const percentEl = getEl('budget-percent');
    const statusEl = getEl('budget-status');
    const circle = getEl('budget-progress-circle');

    if (!spentEl || !circle) return;

    const total = budgetSettings.totalBudget;
    if (!total) {
        spentEl.innerText = formatCurrency(expense);
        totalEl.innerText = 'No budget set';
        percentEl.innerText = '--';
        circle.style.strokeDashoffset = 339.292;
        return;
    }

    const percentage = Math.min((expense / total) * 100, 100);
    const offset = 339.292 - (percentage / 100) * 339.292;

    spentEl.innerText = formatCurrency(expense);
    totalEl.innerText = `of ${formatCurrency(total)}`;
    percentEl.innerText = `${Math.round(percentage)}%`;
    circle.style.strokeDashoffset = offset;

    circle.className.baseVal = 'budget-fill'; // Reset classes
    percentEl.className = 'budget-percent';
    statusEl.className = 'budget-status';

    if (percentage >= 100) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Exceeded!</span>';
        circle.classList.add('danger');
        percentEl.classList.add('danger');
        statusEl.classList.add('danger');
        if (budgetSettings.alerts.at100 && !budgetSettings.alertsShown.at100) {
            alert("Budget Exceeded!");
            budgetSettings.alertsShown.at100 = true;
            localStorage.setItem('budgetSettings', JSON.stringify(budgetSettings));
        }
    } else if (percentage >= 80) {
        statusEl.innerHTML = '<i class="fas fa-exclamation-circle"></i><span>Warning</span>';
        circle.classList.add('warning');
        percentEl.classList.add('warning');
        statusEl.classList.add('warning');
        if (budgetSettings.alerts.at80 && !budgetSettings.alertsShown.at80) {
            alert("Nearing Budget Limit (80%)");
            budgetSettings.alertsShown.at80 = true;
            localStorage.setItem('budgetSettings', JSON.stringify(budgetSettings));
        }
    } else {
        statusEl.innerHTML = '<i class="fas fa-check-circle"></i><span>On Track</span>';
        percentEl.classList.add('safe');
    }
}

// --- Start App ---
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupBudgetManager();
    init();
});


