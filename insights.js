
let transactions = [];
let expenseChart = null;
let flowChart = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Load Data
    transactions = await TransactionService.getAll();

    // Initial Render
    renderInsights();

    // Event Listeners
    document.getElementById('time-range').addEventListener('change', renderInsights);
});

function renderInsights() {
    const range = document.getElementById('time-range').value;
    const filtered = getFilteredTransactions(range);

    // 1. Summaries
    const income = filtered.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = filtered.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const net = income - expense;

    document.getElementById('sum-income').innerText = formatCurrency(income);
    document.getElementById('sum-expense').innerText = formatCurrency(expense);
    document.getElementById('sum-net').innerText = formatCurrency(net);
    document.getElementById('sum-net').style.color = net >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

    // 2. Charts
    updateExpenseChart(filtered);
    updateFlowChart(income, expense);

    // 3. Category Breakdown
    renderCategoryBreakdown(filtered);
}

function updateExpenseChart(data) {
    const expenses = data.filter(t => t.type === 'expense');
    const categories = {};
    expenses.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categories);
    const values = Object.values(categories);
    const colors = ['#4361ee', '#4cc9f0', '#4895ef', '#3f37c9', '#560bad', '#7209b7', '#b5179e', '#f72585'];

    const ctx = document.getElementById('expenseChart').getContext('2d');
    if (expenseChart) expenseChart.destroy();

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#fff', font: { family: 'Outfit' } } } }
        }
    });
}

function updateFlowChart(income, expense) {
    const ctx = document.getElementById('flowChart').getContext('2d');
    if (flowChart) flowChart.destroy();

    flowChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Income', 'Expenses'],
            datasets: [{
                label: 'Cash Flow',
                data: [income, expense],
                backgroundColor: ['#00f5d4', '#f72585'],
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#aaa' } },
                x: { grid: { display: false }, ticks: { color: '#fff' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderCategoryBreakdown(data) {
    const expenses = data.filter(t => t.type === 'expense');
    const categories = {};
    expenses.forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    const container = document.getElementById('category-details');
    container.innerHTML = '';

    Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, val]) => {
            const percent = ((val / total) * 100).toFixed(1);
            const div = document.createElement('div');
            div.classList.add('detail-item');
            div.innerHTML = `
                <div class="detail-label">
                    <span style="font-weight: 600;">${cat}</span>
                    <span style="font-size: 12px; color: var(--text-secondary);">${percent}% of spending</span>
                </div>
                <div class="detail-value">${formatCurrency(val)}</div>
            `;
            container.appendChild(div);
        });

    if (expenses.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No actions recorded in this period.</p>';
    }
}

function getFilteredTransactions(range) {
    const now = new Date();
    let startDate = new Date();

    if (range === 'weekly') startDate.setDate(now.getDate() - 7);
    else if (range === 'monthly') startDate.setMonth(now.getMonth() - 1);
    else if (range === 'quarterly') startDate.setMonth(now.getMonth() - 3);
    else if (range === 'yearly') startDate.setFullYear(now.getFullYear() - 1);

    return transactions.filter(t => new Date(t.date) >= startDate);
}

function formatCurrency(amount) {
    return 'Rs. ' + Math.floor(Math.abs(amount || 0)).toLocaleString();
}
