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
}

function toggleTheme() {
  applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// ─── API Helper (no auth) ────────────────────────────────────────
async function apiPost(path, body) {
  const res = await fetch(API_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
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
  el.textContent = message;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ─── Init on page load ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getTheme());
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.checked = getTheme() === 'dark';
    toggle.addEventListener('change', () => toggleTheme());
  }
});
