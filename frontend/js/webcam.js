let mediaStream = null;
let autoDetectTimer = null;
let isAutoDetecting = false;

// ─── Camera Controls ──────────────────────────────────────────
async function startCamera() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    const video = document.getElementById('webcam-video');
    video.srcObject = mediaStream;

    document.getElementById('camera-placeholder').style.display = 'none';
    document.getElementById('camera-container').style.display = 'block';
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('stop-btn').style.display = 'inline-flex';
    document.getElementById('capture-btn').disabled = false;
    document.getElementById('auto-btn').disabled = false;
    document.getElementById('live-badge').style.display = 'inline-flex';
  } catch (err) {
    showAlert('webcam-alert', '❌ Camera access denied. Please allow camera permissions.', 'error');
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (autoDetectTimer) {
    clearInterval(autoDetectTimer);
    autoDetectTimer = null;
    isAutoDetecting = false;
    document.getElementById('auto-btn').textContent = '🔄 Start Auto-Detect';
  }
  document.getElementById('camera-placeholder').style.display = 'flex';
  document.getElementById('camera-container').style.display = 'none';
  document.getElementById('start-btn').style.display = 'inline-flex';
  document.getElementById('stop-btn').style.display = 'none';
  document.getElementById('capture-btn').disabled = true;
  document.getElementById('auto-btn').disabled = true;
  document.getElementById('live-badge').style.display = 'none';
}

function toggleAutoDetect() {
  if (isAutoDetecting) {
    clearInterval(autoDetectTimer);
    autoDetectTimer = null;
    isAutoDetecting = false;
    document.getElementById('auto-btn').textContent = '🔄 Start Auto-Detect';
  } else {
    const interval = parseInt(document.getElementById('auto-interval').value);
    autoDetectTimer = setInterval(captureAndDetect, interval);
    isAutoDetecting = true;
    document.getElementById('auto-btn').textContent = '⏸️ Stop Auto-Detect';
    captureAndDetect();
  }
}

// ─── Capture & Detect ──────────────────────────────────────────
async function captureAndDetect() {
  const video = document.getElementById('webcam-video');
  const canvas = document.getElementById('capture-canvas');
  if (!video || !mediaStream) return;

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.scale(-1, 1);
  ctx.drawImage(video, -canvas.width, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const base64 = canvas.toDataURL('image/jpeg', 0.85);
  const captureBtn = document.getElementById('capture-btn');
  captureBtn.disabled = true;
  captureBtn.innerHTML = '<span class="spinner"></span> Analyzing...';

  try {
    const result = await apiPost('/emotion/detect-webcam', {
      image_base64: base64
    });
    if (result) {
      displayResults(result);
    }
  } catch (err) {
    showAlert('webcam-alert', '❌ Detection failed: ' + err.message, 'error');
  } finally {
    captureBtn.disabled = false;
    captureBtn.innerHTML = '📸 Detect Emotion';
  }
}

// ─── Display Results ──────────────────────────────────────────
function displayResults(result) {
  const emotion = result.dominant_emotion;
  const confidence = result.confidence * 100;

  document.getElementById('result-emoji').textContent = EMOTION_EMOJIS[emotion] || '😐';
  document.getElementById('result-emotion').textContent = emotion;

  // Show confidence with quality indicator
  let confText = `${confidence.toFixed(1)}%`;
  let confClass = 'confidence-high';

  if (confidence < 30) {
    confText += ' (Low confidence - results may be uncertain)';
    confClass = 'confidence-low';
  } else if (confidence < 60) {
    confText += ' (Moderate confidence)';
    confClass = 'confidence-medium';
  } else {
    confText += ' (High confidence)';
    confClass = 'confidence-high';
  }

  document.getElementById('result-conf').textContent = `Confidence: ${confText}`;
  document.getElementById('result-conf').className = `result-confidence ${confClass}`;

  // Confidence bars
  const barsContainer = document.getElementById('emotion-bars');
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

  // Show tips
  if (result.tips) renderTipsCard('webcam-tips', result.tips, emotion);
}

// ─── Tips Renderer ───────────────────────────────────────────
function renderTipsCard(containerId, tips, emotion) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.style.display = 'block';
  container.innerHTML = `
    <div class="tips-card card" style="border-color:${EMOTION_COLORS[emotion] || 'var(--border-color)'}22;">
      <div class="tips-header">
        <span class="tips-emoji">${tips.emoji || EMOTION_EMOJIS[emotion]}</span>
        <div>
          <div class="tips-title" style="color:${EMOTION_COLORS[emotion] || 'var(--text-primary)'}">${tips.message}</div>
        </div>
      </div>
      <ul class="tips-list">
        ${(tips.tips || []).slice(0, 3).map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>
  `;
}
