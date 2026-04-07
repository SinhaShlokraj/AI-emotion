// ─── Settings Module ──────────────────────────────────────
// Profile management, preferences, and data export/clear

const AVATAR_OPTIONS = ['😊', '🧠', '🎯', '💡', '🌟', '🔬', '🎭', '👤', '🦊', '🐱', '🐼', '🦉', '🌸', '🔥', '⚡', '🌈'];

async function loadSettings() {
    try {
        const profile = await HealthAPI.getProfile();
        populateSettingsForm(profile);
        renderAvatarPicker(profile.avatar_emoji);
    } catch (err) {
        console.error('Failed to load settings:', err);
    }
}

function populateSettingsForm(profile) {
    const usernameInput = document.getElementById('settings-username');
    const emailInput = document.getElementById('settings-email');
    const autoSaveToggle = document.getElementById('settings-auto-save');
    const intervalSelect = document.getElementById('settings-interval');
    const themeSelect = document.getElementById('settings-theme');

    if (usernameInput) usernameInput.value = profile.username || 'User';
    if (emailInput) emailInput.value = profile.email || '';
    if (autoSaveToggle) autoSaveToggle.checked = profile.auto_save !== false;
    if (intervalSelect) intervalSelect.value = profile.default_interval || 5000;
    if (themeSelect) themeSelect.value = profile.theme || 'dark';
}

function renderAvatarPicker(currentAvatar) {
    const container = document.getElementById('avatar-picker');
    if (!container) return;

    container.innerHTML = AVATAR_OPTIONS.map(emoji => `
        <button class="avatar-option ${emoji === currentAvatar ? 'active' : ''}"
                onclick="selectAvatar('${emoji}')" type="button">
            ${emoji}
        </button>
    `).join('');

    const display = document.getElementById('current-avatar');
    if (display) display.textContent = currentAvatar || '😊';
}

function selectAvatar(emoji) {
    document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');

    const display = document.getElementById('current-avatar');
    if (display) display.textContent = emoji;

    // Update sidebar avatar too
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (sidebarAvatar) sidebarAvatar.textContent = emoji;
}

async function saveSettings() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Saving...';
    }

    try {
        const data = {
            avatar_emoji: document.getElementById('current-avatar')?.textContent || '😊',
            auto_save: document.getElementById('settings-auto-save')?.checked ?? true,
            default_interval: parseInt(document.getElementById('settings-interval')?.value || 5000),
            theme: document.getElementById('settings-theme')?.value || 'dark'
        };

        const profile = await HealthAPI.updateProfile(data);

        // Apply theme
        applyTheme(profile.theme);

        // Update sidebar user info
        const sidebarName = document.getElementById('sidebar-name');
        if (sidebarName) sidebarName.textContent = profile.username;
        const sidebarAvatar = document.getElementById('sidebar-avatar');
        if (sidebarAvatar) sidebarAvatar.textContent = profile.avatar_emoji;

        // Update auto-detect interval on webcam page
        const intervalSelect = document.getElementById('auto-interval');
        if (intervalSelect) intervalSelect.value = profile.default_interval;

        showAlert('settings-alert', '✅ Settings saved successfully!', 'success');
    } catch (err) {
        showAlert('settings-alert', '❌ Failed to save: ' + err.message, 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '💾 Save Settings';
        }
    }
}

async function exportAllData() {
    try {
        const [detections, profile] = await Promise.all([
            HealthAPI.exportDetections(),
            HealthAPI.getProfile()
        ]);

        const exportData = {
            exported_at: new Date().toISOString(),
            profile: profile,
            detections: detections,
            total_detections: detections.length
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai_emotion_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showAlert('settings-alert', '✅ Full backup exported!', 'success');
    } catch (err) {
        showAlert('settings-alert', '❌ Export failed: ' + err.message, 'error');
    }
}

async function clearAllData() {
    if (!confirm('⚠️ This will permanently delete ALL your detection history. Your profile settings will be kept. Continue?')) return;
    if (!confirm('Final confirmation: Delete all detection data?')) return;

    try {
        await HealthAPI.clearDetections();
        showAlert('settings-alert', '✅ All detection data cleared!', 'success');
    } catch (err) {
        showAlert('settings-alert', '❌ Failed to clear data: ' + err.message, 'error');
    }
}
