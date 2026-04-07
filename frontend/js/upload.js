// ─── Upload Module ──────────────────────────────────────
// Image upload for emotion detection

let uploadedFile = null;

function initUploadZone() {
    const dropZone = document.getElementById('upload-drop-zone');
    const fileInput = document.getElementById('upload-file-input');
    if (!dropZone || !fileInput) return;

    // Click to browse
    dropZone.addEventListener('click', () => fileInput.click());

    // Drag & drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) handleUploadFile(files[0]);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) handleUploadFile(e.target.files[0]);
    });
}

function handleUploadFile(file) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
    if (!allowed.includes(file.type)) {
        showAlert('upload-alert', '❌ Invalid file type. Use JPEG, PNG, WebP, GIF, or BMP.', 'error');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        showAlert('upload-alert', '❌ File too large. Maximum 10MB.', 'error');
        return;
    }

    uploadedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('upload-preview');
        const placeholder = document.getElementById('upload-placeholder');
        const previewImg = document.getElementById('upload-preview-img');
        const fileName = document.getElementById('upload-file-name');

        if (previewImg) previewImg.src = e.target.result;
        if (preview) preview.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
        if (fileName) fileName.textContent = file.name;
    };
    reader.readAsDataURL(file);

    // Enable detect button
    const detectBtn = document.getElementById('upload-detect-btn');
    if (detectBtn) detectBtn.disabled = false;
}

function clearUpload() {
    uploadedFile = null;
    const preview = document.getElementById('upload-preview');
    const placeholder = document.getElementById('upload-placeholder');
    const detectBtn = document.getElementById('upload-detect-btn');
    const resultSection = document.getElementById('upload-results');
    const fileInput = document.getElementById('upload-file-input');

    if (preview) preview.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    if (detectBtn) detectBtn.disabled = true;
    if (resultSection) resultSection.style.display = 'none';
    if (fileInput) fileInput.value = '';
}

async function detectFromUpload() {
    if (!uploadedFile) return;

    const detectBtn = document.getElementById('upload-detect-btn');
    detectBtn.disabled = true;
    detectBtn.innerHTML = '<span class="spinner" style="width:16px;height:16px;"></span> Analyzing...';

    try {
        const formData = new FormData();
        formData.append('file', uploadedFile);

        const token = getAuthToken();
        const res = await fetch(API_BASE + '/emotion/detect-upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Upload detection failed' }));
            throw new Error(err.detail || 'Detection failed');
        }

        const result = await res.json();
        displayUploadResults(result);
    } catch (err) {
        showAlert('upload-alert', '❌ ' + err.message, 'error');
    } finally {
        detectBtn.disabled = false;
        detectBtn.innerHTML = '🔍 Detect Emotion';
    }
}

function displayUploadResults(result) {
    const resultSection = document.getElementById('upload-results');
    if (!resultSection) return;
    resultSection.style.display = 'block';

    const emotion = result.dominant_emotion;
    const confidence = result.confidence * 100;

    // Emoji & emotion
    document.getElementById('upload-result-emoji').textContent = EMOTION_EMOJIS[emotion] || '😐';
    document.getElementById('upload-result-emotion').textContent = emotion;

    // Confidence
    let confText = `${confidence.toFixed(1)}%`;
    let confClass = 'confidence-high';
    if (confidence < 30) { confText += ' (Low)'; confClass = 'confidence-low'; }
    else if (confidence < 60) { confText += ' (Moderate)'; confClass = 'confidence-medium'; }
    else { confText += ' (High)'; confClass = 'confidence-high'; }
    document.getElementById('upload-result-conf').textContent = `Confidence: ${confText}`;
    document.getElementById('upload-result-conf').className = `result-confidence ${confClass}`;

    // Bars
    const barsContainer = document.getElementById('upload-emotion-bars');
    const emotions = result.emotions;
    barsContainer.innerHTML = Object.entries(emotions)
        .sort((a, b) => b[1] - a[1])
        .map(([e, v]) => `
            <div class="emotion-bar-item">
                <div class="emotion-bar-label">${EMOTION_EMOJIS[e] || ''} ${e}</div>
                <div class="emotion-bar-track">
                    <div class="emotion-bar-fill" style="width:${(v * 100).toFixed(1)}%;background:${EMOTION_COLORS[e] || 'var(--gradient-main)'}"></div>
                </div>
                <div class="emotion-bar-value">${(v * 100).toFixed(1)}%</div>
            </div>
        `).join('');

    // Tips
    if (result.tips) renderTipsCard('upload-tips', result.tips, emotion);

    // Save indicator
    if (result.saved_id) {
        showAlert('upload-alert', '✅ Result saved to your history!', 'success');
    }
}
