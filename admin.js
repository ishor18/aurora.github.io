
// Admin Logic

const ADMIN_EMAIL = 'ishoracharya977@gmail.com';

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be ready
    const checkSupabase = setInterval(async () => {
        if (window.supabase) {
            clearInterval(checkSupabase);
            await verifyAdmin();
        }
    }, 100);

    // Timeout if Supabase never loads
    setTimeout(() => {
        clearInterval(checkSupabase);
        if (!window.supabase) {
            alert("Error: Supabase failed to load. Please check your connection.");
        }
    }, 5000);
});

async function verifyAdmin() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
            console.error("Auth error:", error);
            alert('Access Denied. Please sign in first.');
            window.location.href = 'auth.html';
            return;
        }

        if (user.email !== ADMIN_EMAIL) {
            alert(`Access Denied. Current user (${user.email}) is not authorized as an Admin.`);
            window.location.href = 'index.html';
            return;
        }

        // authorized - continue
        setupAdmin();
    } catch (err) {
        console.error("Verification crashed:", err);
        alert("An error occurred during authorization check.");
    }
}

function setupAdmin() {
    // 2. Setup Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'auth.html';
        });
    }

    // 3. Load Data
    loadDashboard();

    // 4. Modal Close
    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            document.getElementById('user-modal').classList.remove('active');
        });
    }
}

async function loadDashboard() {
    // Fetch all profiles (Users)
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');

    if (profileError) {
        console.error('Error fetching profiles:', profileError);
        alert('Error loading users. Make sure you ran the ADMIN_SETUP.sql script!');
        return;
    }

    // Fetch all transactions (global)
    const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*');

    if (transError) {
        console.error('Error fetching transactions:', transError);
    }

    // Update Stats
    document.getElementById('total-users').innerText = profiles.length;
    document.getElementById('total-transactions').innerText = transactions ? transactions.length : 0;

    const totalIncome = transactions
        ? transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0)
        : 0;
    const totalExpense = transactions
        ? transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0)
        : 0;

    document.getElementById('system-income').innerText = 'Rs.' + Math.floor(totalIncome).toLocaleString();
    document.getElementById('system-expense').innerText = 'Rs.' + Math.floor(totalExpense).toLocaleString();
    document.getElementById('system-volume').innerText = 'Rs.' + Math.floor(totalIncome - totalExpense).toLocaleString();

    // Render Users
    const userList = document.getElementById('user-list');
    userList.innerHTML = '';

    profiles.forEach(profile => {
        const userTrans = transactions ? transactions.filter(t => t.user_id === profile.id) : [];
        const li = document.createElement('li');
        li.classList.add('user-item');
        li.innerHTML = `
            <div class="user-info">
                <h3>${profile.email}</h3>
                <p>Joined: ${new Date(profile.created_at).toLocaleDateString()} • Items: ${userTrans.length}</p>
            </div>
            <div class="user-actions">
                <button class="btn-view" onclick="viewUser('${profile.id}', '${profile.email}')">View Data</button>
                <button class="btn-delete" onclick="deleteUser('${profile.id}')">Delete Data</button>
            </div>
        `;
        userList.appendChild(li);
    });

    // Fetch Inquiries
    const { data: inquiries, error: inqError } = await supabase
        .from('sales_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

    if (inqError) {
        console.error('Error fetching inquiries:', inqError);
    } else {
        renderInquiries(inquiries);
    }
}

function renderInquiries(inquiries) {
    const list = document.getElementById('inquiry-list');
    list.innerHTML = '';

    if (!inquiries || inquiries.length === 0) {
        list.innerHTML = '<p style="color: #666; font-style: italic; padding: 20px;">No inquiries found yet.</p>';
        return;
    }

    inquiries.forEach(inq => {
        const item = document.createElement('div');
        item.classList.add('user-item');
        item.style.borderLeft = "4px solid var(--accent-color)";
        item.style.marginBottom = "15px";
        item.innerHTML = `
            <div class="user-info">
                <h3 style="color: white;">${inq.first_name} ${inq.last_name} <span style="font-size: 11px; opacity: 0.6; margin-left:10px;">• ${inq.company}</span></h3>
                <p>${inq.email} • Plan: <strong style="color: var(--accent-color)">${inq.plan.toUpperCase()}</strong></p>
                <p style="margin-top: 8px; color: #ddd; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">${inq.message}</p>
                <p style="font-size: 10px; margin-top: 5px; opacity: 0.5;">${new Date(inq.created_at).toLocaleString()}</p>
            </div>
        `;
        list.appendChild(item);
    });
}

// Exposed to window for onclick
window.viewUser = async (userId, email) => {
    const modal = document.getElementById('user-modal');
    const modalList = document.getElementById('modal-transactions');
    const modalStats = document.getElementById('modal-user-stats');

    document.getElementById('modal-user-email').innerText = email;
    modalList.innerHTML = '<p style="text-align:center;">Loading...</p>';
    modal.classList.add('active');

    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    // Calculate Stats
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

    modalStats.innerHTML = `
        <div class="stat-item income">
            <i class="fas fa-arrow-down"></i>
            <div><span>Income</span><span>Rs.${income.toLocaleString()}</span></div>
        </div>
        <div class="stat-item expense">
            <i class="fas fa-arrow-up"></i>
            <div><span>Expense</span><span>Rs.${expense.toLocaleString()}</span></div>
        </div>
    `;

    // List
    modalList.innerHTML = '';
    if (transactions.length === 0) {
        modalList.innerHTML = '<p style="text-align:center; color: #aaa;">No transactions found.</p>';
    } else {
        transactions.forEach(t => {
            const li = document.createElement('li');
            li.classList.add('transaction-item');
            li.style.padding = "10px";
            const color = t.type === 'income' ? 'var(--success-color)' : 'var(--danger-color)';
            li.innerHTML = `
                <div class="t-left">
                    <span class="t-category">${t.category}</span>
                </div>
                <div class="t-right">
                    <span style="color: ${color}; font-weight: bold;">${t.amount}</span>
                    <span class="t-date">${new Date(t.date).toLocaleDateString()}</span>
                </div>
            `;
            modalList.appendChild(li);
        });
    }
};

window.deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete ALL data for this user? This cannot be undone.')) return;

    await supabase.from('transactions').delete().eq('user_id', userId);
    await supabase.from('categories').delete().eq('user_id', userId);
    await supabase.from('profiles').delete().eq('id', userId);

    alert('User data deleted successfully.');
    loadDashboard();
};
