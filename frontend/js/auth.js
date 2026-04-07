// ─── Auth Module ──────────────────────────────────────────
// Login, Register, Token management, Auth state

const AUTH_TOKEN_KEY = 'ai_emotion_token';
const AUTH_USER_KEY = 'ai_emotion_user';

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function getAuthUser() {
    const data = localStorage.getItem(AUTH_USER_KEY);
    return data ? JSON.parse(data) : null;
}

function setAuth(token, user) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

function clearAuth() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
}

function isLoggedIn() {
    return !!getAuthToken();
}

// ─── Auth UI Logic ────────────────────────────────────────

function showAuthPage() {
    document.getElementById('auth-page').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
    showLoginForm();
}

function showAppPage() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app-layout').style.display = 'flex';
}

function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-tab-login').classList.add('active');
    document.getElementById('auth-tab-register').classList.remove('active');
    clearAuthAlerts();
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('auth-tab-login').classList.remove('active');
    document.getElementById('auth-tab-register').classList.add('active');
    clearAuthAlerts();
}

function clearAuthAlerts() {
    const alert = document.getElementById('auth-alert');
    if (alert) alert.style.display = 'none';
}

function showAuthAlert(message, type = 'error') {
    const alert = document.getElementById('auth-alert');
    if (!alert) return;
    alert.className = `alert alert-${type}`;
    alert.innerHTML = message;
    alert.style.display = 'flex';
}

// ─── Login ────────────────────────────────────────────────

async function handleLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Signing in...';

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
        showAuthAlert('Please fill in all fields', 'warning');
        btn.disabled = false;
        btn.textContent = 'Sign In';
        return;
    }

    try {
        const res = await fetch(API_BASE + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Login failed');

        setAuth(data.token, {
            user_id: data.user_id,
            username: data.username,
            email: data.email,
            avatar_emoji: data.avatar_emoji || '😊'
        });

        showAppPage();
        initAppAfterAuth();
    } catch (err) {
        showAuthAlert('❌ ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Sign In';
    }
}

// ─── Register ─────────────────────────────────────────────

async function handleRegister(e) {
    e.preventDefault();
    const btn = document.getElementById('register-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Creating account...';

    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (!username || !email || !password || !confirm) {
        showAuthAlert('Please fill in all fields', 'warning');
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
    }

    if (password !== confirm) {
        showAuthAlert('Passwords do not match', 'error');
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
    }

    if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters', 'warning');
        btn.disabled = false;
        btn.textContent = 'Create Account';
        return;
    }

    try {
        const res = await fetch(API_BASE + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Registration failed');

        setAuth(data.token, {
            user_id: data.user_id,
            username: data.username,
            email: data.email,
            avatar_emoji: '😊'
        });

        showAppPage();
        initAppAfterAuth();
    } catch (err) {
        showAuthAlert('❌ ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Account';
    }
}

// ─── Logout ───────────────────────────────────────────────

function handleLogout() {
    if (!confirm('Are you sure you want to sign out?')) return;
    clearAuth();
    showAuthPage();
    // Stop camera if running
    if (typeof stopCamera === 'function') stopCamera();
}

// ─── Init After Auth ──────────────────────────────────────

async function initAppAfterAuth() {
    const user = getAuthUser();
    if (!user) return;

    // Update sidebar
    const sidebarName = document.getElementById('sidebar-name');
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarName) sidebarName.textContent = user.username;
    if (sidebarAvatar) sidebarAvatar.textContent = user.avatar_emoji || '😊';

    // Load profile for theme
    try {
        const profile = await HealthAPI.getProfile();
        if (profile.theme) applyTheme(profile.theme);
    } catch (err) {
        console.warn('Could not load profile:', err);
    }

    navigateTo('dashboard');
}
