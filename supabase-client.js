// Credentials are now pulled from config.js
const SUPABASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_URL : 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = typeof CONFIG !== 'undefined' ? CONFIG.SUPABASE_ANON_KEY : 'YOUR_SUPABASE_ANON_KEY_HERE';

// Check if the user has actually configured the keys
const isConfigured = () => {
    return SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE';
};

// Initialize Supabase Client
function initializeSupabase() {
    try {
        const library = window.supabase || window.supabasejs;
        const creator = window.createClient || (library ? library.createClient : null);

        if (creator) {
            window.supabase = creator(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log("Supabase initialized successfully.");
            return true;
        }
    } catch (e) {
        console.error("Initialization error:", e);
    }
    return false;
}

// Immediate attempt
if (isConfigured()) {
    if (!initializeSupabase()) {
        // If it failed (maybe library still loading), try again when DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            if (!initializeSupabase()) {
                console.error('Supabase failed to load after DOMContentLoaded');
            }
        });
    }
} else {
    console.warn("Supabase project URL or Key is missing.");
}

// Data Service
const TransactionService = {
    async getAll() {
        if (!isConfigured()) return [];
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false });

        if (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
        return data;
    },

    async add(transaction) {
        if (!isConfigured()) return null;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('transactions')
            .insert([{
                ...transaction,
                user_id: user.id
            }])
            .select();

        if (error) {
            console.error('Error adding transaction:', error);
            return null;
        }
        return data[0];
    },

    async delete(id) {
        if (!isConfigured()) return false;
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        return !error;
    }
};

const CategoryService = {
    async getAll() {
        if (!isConfigured()) return [];
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];

        const { data, error } = await supabase
            .from('categories')
            .select('*')
            .eq('user_id', user.id);

        if (error) return [];
        return data.map(c => c.name);
    },

    async add(categoryName) {
        if (!isConfigured()) return null;
        const { data: { user } } = await supabase.auth.getUser();

        const { error } = await supabase
            .from('categories')
            .insert([{
                name: categoryName,
                user_id: user.id
            }]);

        return !error;
    }
};

const SalesService = {
    async submitInquiry(inquiryData) {
        if (!isConfigured()) return { error: 'Supabase not configured' };

        const { data, error } = await supabase
            .from('sales_inquiries')
            .insert([{
                ...inquiryData,
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.error('Error submitting inquiry:', error);
            return { error: error.message };
        }
        return { success: true };
    }
};
