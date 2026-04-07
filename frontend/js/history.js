// ─── History Module ──────────────────────────────────────
// Renders detection history table with filters, pagination, export

let historyCurrentPage = 1;
const HISTORY_PER_PAGE = 15;
let historyFilters = { emotion: '', date_from: '', date_to: '' };

async function loadHistory() {
    try {
        await renderHistoryTable();
    } catch (err) {
        console.error('Failed to load history:', err);
    }
}

async function renderHistoryTable() {
    const container = document.getElementById('history-table-body');
    const paginationEl = document.getElementById('history-pagination');
    if (!container) return;

    container.innerHTML = `
        <tr><td colspan="6" style="text-align:center;padding:2rem;">
            <span class="spinner"></span> Loading...
        </td></tr>
    `;

    try {
        const offset = (historyCurrentPage - 1) * HISTORY_PER_PAGE;
        const params = {
            limit: HISTORY_PER_PAGE,
            offset: offset
        };
        if (historyFilters.emotion) params.emotion = historyFilters.emotion;
        if (historyFilters.date_from) params.date_from = historyFilters.date_from;
        if (historyFilters.date_to) params.date_to = historyFilters.date_to;

        const data = await HealthAPI.getDetections(params);

        if (!data.detections || data.detections.length === 0) {
            container.innerHTML = `
                <tr><td colspan="6" class="empty-state" style="padding:3rem;text-align:center;">
                    <span class="empty-icon" style="font-size:2rem;">📭</span>
                    <p>No detections found</p>
                </td></tr>
            `;
            if (paginationEl) paginationEl.innerHTML = '';
            return;
        }

        container.innerHTML = data.detections.map(d => {
            const time = new Date(d.timestamp).toLocaleString();
            const conf = (d.confidence * 100).toFixed(1);
            return `
                <tr>
                    <td>
                        <span style="margin-right:6px;">${EMOTION_EMOJIS[d.dominant_emotion] || '😐'}</span>
                        <span class="emotion-badge emotion-${d.dominant_emotion}">${d.dominant_emotion}</span>
                    </td>
                    <td>${conf}%</td>
                    <td><span class="source-badge source-${d.source || 'webcam'}">${d.source === 'upload' ? '📤 Upload' : '📷 Webcam'}</span></td>
                    <td>${time}</td>
                    <td>
                        ${d.emotions ? Object.entries(d.emotions)
                            .sort((a,b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([e, v]) => `<span class="mini-badge">${EMOTION_EMOJIS[e] || ''} ${(v*100).toFixed(0)}%</span>`)
                            .join(' ') : '—'}
                    </td>
                    <td>
                        <button class="btn-icon" onclick="deleteHistoryItem(${d.id})" title="Delete">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        // Render pagination
        const totalPages = Math.ceil(data.total / HISTORY_PER_PAGE);
        renderHistoryPagination(totalPages, data.total);

    } catch (err) {
        container.innerHTML = `
            <tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--accent-red);">
                ❌ Failed to load history
            </td></tr>
        `;
    }
}

function renderHistoryPagination(totalPages, totalItems) {
    const el = document.getElementById('history-pagination');
    if (!el) return;

    if (totalPages <= 1) {
        el.innerHTML = `<span class="pagination-info">${totalItems} total result${totalItems !== 1 ? 's' : ''}</span>`;
        return;
    }

    let html = `<span class="pagination-info">${totalItems} results</span>`;
    html += `<div class="pagination-buttons">`;

    if (historyCurrentPage > 1) {
        html += `<button class="btn btn-sm btn-secondary" onclick="changeHistoryPage(${historyCurrentPage - 1})">← Prev</button>`;
    }

    // Show page numbers
    const start = Math.max(1, historyCurrentPage - 2);
    const end = Math.min(totalPages, historyCurrentPage + 2);

    for (let i = start; i <= end; i++) {
        const active = i === historyCurrentPage ? 'btn-primary' : 'btn-secondary';
        html += `<button class="btn btn-sm ${active}" onclick="changeHistoryPage(${i})">${i}</button>`;
    }

    if (historyCurrentPage < totalPages) {
        html += `<button class="btn btn-sm btn-secondary" onclick="changeHistoryPage(${historyCurrentPage + 1})">Next →</button>`;
    }

    html += `</div>`;
    el.innerHTML = html;
}

function changeHistoryPage(page) {
    historyCurrentPage = page;
    renderHistoryTable();
}

function applyHistoryFilters() {
    const emotionSelect = document.getElementById('history-filter-emotion');
    const dateFrom = document.getElementById('history-filter-from');
    const dateTo = document.getElementById('history-filter-to');

    historyFilters.emotion = emotionSelect ? emotionSelect.value : '';
    historyFilters.date_from = dateFrom ? dateFrom.value : '';
    historyFilters.date_to = dateTo ? dateTo.value : '';
    historyCurrentPage = 1;

    renderHistoryTable();
}

function clearHistoryFilters() {
    historyFilters = { emotion: '', date_from: '', date_to: '' };
    historyCurrentPage = 1;

    const emotionSelect = document.getElementById('history-filter-emotion');
    const dateFrom = document.getElementById('history-filter-from');
    const dateTo = document.getElementById('history-filter-to');
    if (emotionSelect) emotionSelect.value = '';
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';

    renderHistoryTable();
}

async function deleteHistoryItem(id) {
    if (!confirm('Delete this detection record?')) return;
    try {
        await HealthAPI.deleteDetection(id);
        renderHistoryTable();
    } catch (err) {
        alert('Failed to delete: ' + err.message);
    }
}

async function clearAllHistory() {
    if (!confirm('⚠️ This will permanently delete ALL detection history. Continue?')) return;
    if (!confirm('Are you sure? This cannot be undone.')) return;

    try {
        const result = await HealthAPI.clearDetections();
        renderHistoryTable();
        showAlert('history-alert', `✅ ${result.message}`, 'success');
    } catch (err) {
        showAlert('history-alert', '❌ Failed to clear history', 'error');
    }
}

async function exportHistory() {
    try {
        const data = await HealthAPI.exportDetections();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emotion_history_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('history-alert', '✅ History exported successfully!', 'success');
    } catch (err) {
        showAlert('history-alert', '❌ Failed to export: ' + err.message, 'error');
    }
}

async function exportHistoryCSV() {
    try {
        const data = await HealthAPI.exportDetections();
        if (data.length === 0) {
            showAlert('history-alert', '⚠️ No data to export', 'warning');
            return;
        }

        let csv = 'ID,Timestamp,Dominant Emotion,Confidence,Angry,Disgust,Fear,Happy,Sad,Surprise,Neutral\n';
        data.forEach(d => {
            const e = d.emotions || {};
            csv += `${d.id},"${d.timestamp}","${d.dominant_emotion}",${d.confidence},` +
                `${e.angry || 0},${e.disgust || 0},${e.fear || 0},${e.happy || 0},` +
                `${e.sad || 0},${e.surprise || 0},${e.neutral || 0}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `emotion_history_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showAlert('history-alert', '✅ CSV exported successfully!', 'success');
    } catch (err) {
        showAlert('history-alert', '❌ Failed to export CSV: ' + err.message, 'error');
    }
}
