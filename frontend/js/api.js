// ─── API Client for Health Monitoring ──────────────────────
// All requests include JWT auth token automatically

const HealthAPI = {

    _headers() {
        const headers = { 'Content-Type': 'application/json' };
        const token = getAuthToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        return headers;
    },

    async _fetch(url, options = {}) {
        if (!options.headers) options.headers = this._headers();
        const res = await fetch(API_BASE + url, options);
        if (res.status === 401) {
            // Token expired / invalid — redirect to login
            clearAuth();
            showAuthPage();
            throw new Error('Session expired. Please sign in again.');
        }
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(err.detail || 'Request failed');
        }
        return res.json();
    },

    // ─── Detection History ─────────────────────────────────
    async getDetections(params = {}) {
        const query = new URLSearchParams();
        if (params.limit) query.set('limit', params.limit);
        if (params.offset) query.set('offset', params.offset);
        if (params.emotion) query.set('emotion', params.emotion);
        if (params.date_from) query.set('date_from', params.date_from);
        if (params.date_to) query.set('date_to', params.date_to);
        return this._fetch(`/detections?${query.toString()}`);
    },

    async getStats() {
        return this._fetch('/detections/stats');
    },

    async deleteDetection(id) {
        return this._fetch(`/detections/${id}`, {
            method: 'DELETE',
            headers: this._headers()
        });
    },

    async clearDetections() {
        return this._fetch('/detections', {
            method: 'DELETE',
            headers: this._headers()
        });
    },

    async exportDetections() {
        return this._fetch('/detections/export');
    },

    // ─── Profile ───────────────────────────────────────────
    async getProfile() {
        return this._fetch('/profile');
    },

    async updateProfile(data) {
        return this._fetch('/profile', {
            method: 'PUT',
            headers: this._headers(),
            body: JSON.stringify(data)
        });
    }
};
