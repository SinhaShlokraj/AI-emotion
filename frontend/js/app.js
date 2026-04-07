// ─── API Base ────────────────────────────────────────────────────
const API_BASE = '';

// ─── Emotion Constants ───────────────────────────────────────────
const EMOTION_EMOJIS = {
    happy: '😊', sad: '😢', angry: '😠',
    fear: '😨', disgust: '🤢', surprise: '😲', neutral: '😐'
};

const EMOTION_COLORS = {
    happy: '#FFD700', sad: '#6495ED', angry: '#EF4444',
    fear: '#9B59B6', disgust: '#27AE60', surprise: '#F39C12', neutral: '#95A5A6'
};

// ─── Current Page State ──────────────────────────────────────────
let currentPage = 'dashboard';

// ─── Theme (light/dark) ──────────────────────────────────────────
const THEME_KEY = 'ms_theme';

function getTheme() {
    return localStorage.getItem(THEME_KEY) ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    const toggle = document.getElementById('theme-toggle');
    if (toggle) toggle.checked = theme === 'dark';
    const themeSelect = document.getElementById('settings-theme');
    if (themeSelect) themeSelect.value = theme;
}

function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// ─── SPA Navigation ──────────────────────────────────────────────
function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page-section').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('page-active');
    });

    // Show requested page
    const target = document.getElementById(`page-${page}`);
    if (target) {
        target.style.display = 'block';
        requestAnimationFrame(() => {
            target.classList.add('page-active');
        });
    }

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
    });
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');

    currentPage = page;

    // Load page data
    switch (page) {
        case 'dashboard':
            if (typeof loadDashboard === 'function') loadDashboard();
            break;
        case 'detection':
            break;
        case 'upload':
            if (typeof initUploadZone === 'function') initUploadZone();
            break;
        case 'history':
            if (typeof loadHistory === 'function') loadHistory();
            break;
        case 'settings':
            if (typeof loadSettings === 'function') loadSettings();
            break;
    }
}

// ─── API Helper (with auth) ──────────────────────────────────────
async function apiPost(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });
    if (res.status === 401) {
        clearAuth();
        showAuthPage();
        throw new Error('Session expired. Please sign in again.');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

// ─── Show alert helper ───────────────────────────────────────────
function showAlert(alertId, message, type = 'error') {
    const el = document.getElementById(alertId);
    if (!el) return;
    el.className = `alert alert-${type}`;
    el.innerHTML = message;
    el.style.display = 'flex';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ─── Init on page load ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    // Apply theme
    applyTheme(getTheme());

    // Theme toggle in sidebar
    const toggle = document.getElementById('theme-toggle');
    if (toggle) {
        toggle.checked = getTheme() === 'dark';
        toggle.addEventListener('change', () => toggleTheme());
    }

    // Setup nav click handlers
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) navigateTo(page);
        });
    });

    // Setup auth form handlers
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const registerForm = document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    // Check auth state
    if (isLoggedIn()) {
        showAppPage();
        initAppAfterAuth();
    } else {
        showAuthPage();
    }
});
