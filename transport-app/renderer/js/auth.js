/**
 * auth.js – Supabase-powered Authentication
 * Dhillon Roadlines TMS
 */

// Wait for supabase client to be available
if (!window._supabase) {
    console.error('FATAL: _supabase is not defined. Check supabase-client.js');
}

const sb = window._supabase;
const toEmail = window._usernameToEmail;

const authAlert = document.getElementById('authAlert');
const loginArea = document.getElementById('loginArea');
const registerArea = document.getElementById('registerArea');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

function showAlert(msg, type = 'error') {
    authAlert.textContent = msg;
    authAlert.className = `alert alert-${type}`;
    authAlert.style.display = 'block';
    setTimeout(() => { authAlert.style.display = 'none'; }, 6000);
}

// Toggle Forms
showRegister.onclick = (e) => {
    e.preventDefault();
    loginArea.style.display = 'none';
    registerArea.style.display = 'block';
    checkFirstUser();
};

showLogin.onclick = (e) => {
    e.preventDefault();
    registerArea.style.display = 'none';
    loginArea.style.display = 'block';
};

// Check if this is the very first user
async function checkFirstUser() {
    try {
        const { count } = await sb
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        const bootstrapMessage = document.getElementById('bootstrapMessage');
        if (bootstrapMessage) {
            bootstrapMessage.style.display = (count === 0) ? 'block' : 'none';
        }
    } catch (err) {
        console.warn('checkFirstUser error:', err.message);
    }
}

// ── LOGIN ──
document.getElementById('loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!username || !password) return showAlert('Username and password required.', 'error');

    try {
        const email = toEmail(username);
        console.log('Login attempt with email:', email);

        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('Login error from Supabase:', error);
            return showAlert('Invalid username or password.', 'error');
        }

        const { data: profile } = await sb
            .from('profiles')
            .select('username, role')
            .eq('id', data.user.id)
            .single();

        localStorage.setItem('user', JSON.stringify({
            id: data.user.id,
            username: profile?.username || username,
            role: profile?.role || 'staff'
        }));

        window.location.href = 'dashboard.html';
    } catch (err) {
        console.error('Login catch error:', err);
        showAlert('Login failed: ' + err.message, 'error');
    }
};

// ── REGISTER ──
document.getElementById('registerForm').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;

    console.log('Register attempt - username:', username);

    if (!username) return showAlert('Username is required.', 'error');
    if (password.length < 6) return showAlert('Password must be at least 6 characters.', 'error');
    if (password !== confirmPassword) return showAlert('Passwords do not match.', 'error');

    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
        // Check if username taken
        const { data: existing, error: checkErr } = await sb
            .from('profiles')
            .select('id')
            .eq('username', username.toLowerCase())
            .maybeSingle();

        if (checkErr) console.warn('Username check error (non-fatal):', checkErr.message);
        if (existing) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
            return showAlert('Username already taken. Choose another.', 'error');
        }

        // Determine role: first user → superadmin
        const { count: totalUsers, error: countErr } = await sb
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (countErr) console.warn('Count error (non-fatal):', countErr.message);
        const role = (!totalUsers || totalUsers === 0) ? 'superadmin' : 'staff';

        const email = toEmail(username);
        console.log('Signing up with email:', email, '| role will be:', role);

        // Supabase Auth signup
        const { data, error: signUpError } = await sb.auth.signUp({ email, password });

        if (signUpError) {
            console.error('SignUp error:', signUpError);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
            return showAlert('Sign up failed: ' + signUpError.message, 'error');
        }

        console.log('SignUp success. User:', data.user?.id, '| Session:', !!data.session);

        if (data.user) {
            const { error: profileErr } = await sb.from('profiles').insert({
                id: data.user.id,
                username: username.toLowerCase(),
                role,
                status: 'ACTIVE'
            });

            if (profileErr) {
                console.error('Profile insert error:', profileErr);
                // Not fatal if user was created — show partial success
                showAlert('Account created but profile setup failed. Please sign in.', 'error');
            } else {
                showAlert(
                    role === 'superadmin'
                        ? '✅ Super Admin account created! Sign in now.'
                        : '✅ Account created! Sign in now.',
                    'success'
                );
                setTimeout(() => showLogin.click(), 1500);
            }
        } else {
            showAlert('Account created! Please sign in.', 'success');
            setTimeout(() => showLogin.click(), 1500);
        }
    } catch (err) {
        console.error('Register catch error:', err);
        showAlert('Failed: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
    }
};

// ── SESSION CHECK on page load ──
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const { data: { session } } = await sb.auth.getSession();
        if (session) {
            window.location.href = 'dashboard.html';
        }
        checkFirstUser();
    } catch (err) {
        console.error('Session check error:', err);
    }
});
