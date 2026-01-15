document.addEventListener('DOMContentLoaded', async () => {
    // Check Config
    if (!isConfigured()) {
        alert('Supabase is not configured! Please see SUPABASE_SETUP.md');
        return;
    }

    // Check if user is already logged in (Supabase session)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = 'dashboard.html';
        return;
    }

    const loginCard = document.getElementById('login-card');
    const signupCard = document.getElementById('signup-card');
    const showSignupBtn = document.getElementById('show-signup');
    const showLoginBtn = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    // Toggle Forms
    showSignupBtn.addEventListener('click', () => {
        loginCard.classList.add('hidden');
        signupCard.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', () => {
        signupCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    });

    // Handle Signup
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        if (typeof supabase === 'undefined' || !supabase) {
            alert("Supabase client not initialized. Page may be broken.");
            return;
        }

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'Creating account...';

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                alert("Signup Failed: " + error.message);
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
            } else {
                if (data.session) {
                    alert("Account created and logged in!");
                    window.location.href = 'dashboard.html';
                } else {
                    alert("Account created! Please CHECK YOUR EMAIL to confirm your account before logging in.");
                    signupCard.classList.add('hidden');
                    loginCard.classList.remove('hidden');
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                }
            }
        } catch (err) {
            alert("An unexpected error occurred: " + err.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    });

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.disabled = true;
        submitBtn.innerText = 'Signing in...';

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert(error.message);
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        } else {
            window.location.href = 'dashboard.html';
        }
    });

    // Handle Forgot Password
    document.getElementById('forgot-password').addEventListener('click', async (e) => {
        e.preventDefault();
        const email = prompt("Please enter your email address to reset password:");
        if (!email) return;

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/update-password.html',
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Password reset link sent! Check your email.');
        }
    });
});
