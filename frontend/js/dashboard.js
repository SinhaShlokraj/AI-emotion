// ─── Dashboard Module ──────────────────────────────────────
// Renders stats, charts, recent detections, and health insights

let emotionChart = null;
let weeklyChart = null;

async function loadDashboard() {
    try {
        const stats = await HealthAPI.getStats();
        renderStatsCards(stats);
        renderEmotionChart(stats.emotion_distribution);
        renderWeeklyChart(stats.weekly_trend);
        renderRecentDetections(stats.recent_detections);
        renderHealthInsights(stats);
    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

function renderStatsCards(stats) {
    document.getElementById('stat-total').textContent = stats.total_scans;
    document.getElementById('stat-today').textContent = stats.today_scans;
    document.getElementById('stat-emotion').textContent = stats.most_frequent_emotion || '—';
    document.getElementById('stat-emotion-emoji').textContent = EMOTION_EMOJIS[stats.most_frequent_emotion] || '😐';
    document.getElementById('stat-confidence').textContent =
        stats.avg_confidence ? `${(stats.avg_confidence * 100).toFixed(1)}%` : '—';
    document.getElementById('stat-streak').textContent = stats.mood_streak || 0;
}

function renderEmotionChart(distribution) {
    const ctx = document.getElementById('emotion-pie-chart');
    if (!ctx) return;

    if (emotionChart) emotionChart.destroy();

    const labels = Object.keys(distribution);
    const data = Object.values(distribution);
    const colors = labels.map(e => EMOTION_COLORS[e] || '#95A5A6');

    if (labels.length === 0) {
        emotionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{ data: [1], backgroundColor: ['#2a3a4a'], borderWidth: 0 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                cutout: '70%'
            }
        });
        return;
    }

    emotionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: 'rgba(0,0,0,0.2)',
                hoverBorderColor: '#fff',
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-secondary').trim() || '#aaa',
                        padding: 16,
                        usePointStyle: true,
                        pointStyleWidth: 12,
                        font: { family: 'Inter', size: 12, weight: 500 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', weight: 600 },
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = ((ctx.raw / total) * 100).toFixed(1);
                            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                duration: 800,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderWeeklyChart(trend) {
    const ctx = document.getElementById('weekly-bar-chart');
    if (!ctx) return;

    if (weeklyChart) weeklyChart.destroy();

    const labels = trend.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    });
    const data = trend.map(d => d.count);
    const colors = trend.map(d => {
        if (!d.dominant_emotion) return 'rgba(42, 58, 74, 0.5)';
        return EMOTION_COLORS[d.dominant_emotion] || '#95A5A6';
    });

    weeklyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Scans',
                data: data,
                backgroundColor: colors.map(c => c + '88'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { family: 'Inter', weight: 600 },
                    bodyFont: { family: 'Inter' },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        afterLabel: (ctx) => {
                            const item = trend[ctx.dataIndex];
                            if (item.dominant_emotion) {
                                return `Mood: ${EMOTION_EMOJIS[item.dominant_emotion] || ''} ${item.dominant_emotion}`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-muted').trim() || '#666',
                        font: { family: 'Inter', size: 11 }
                    },
                    grid: {
                        color: 'rgba(255,255,255,0.06)'
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.documentElement)
                            .getPropertyValue('--text-muted').trim() || '#666',
                        font: { family: 'Inter', size: 11, weight: 500 }
                    },
                    grid: { display: false }
                }
            },
            animation: {
                duration: 600,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderRecentDetections(recent) {
    const container = document.getElementById('recent-detections');
    if (!container) return;

    if (!recent || recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:2rem;">
                <span class="empty-icon">📷</span>
                <p>No detections yet. Start scanning!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recent.map(d => {
        const time = new Date(d.timestamp).toLocaleString();
        const conf = (d.confidence * 100).toFixed(1);
        return `
            <div class="recent-item">
                <div class="recent-item-emoji">${EMOTION_EMOJIS[d.dominant_emotion] || '😐'}</div>
                <div class="recent-item-info">
                    <div class="recent-item-emotion">${d.dominant_emotion}</div>
                    <div class="recent-item-time">${time}</div>
                </div>
                <div class="recent-item-conf">${conf}%</div>
            </div>
        `;
    }).join('');
}

function renderHealthInsights(stats) {
    const container = document.getElementById('health-insights');
    if (!container) return;

    const insights = [];

    if (stats.total_scans === 0) {
        insights.push({ icon: '💡', text: 'Start your first emotion scan to begin tracking your mood!' });
    } else {
        const emotion = stats.most_frequent_emotion;
        const positive = ['happy', 'surprise', 'neutral'];

        if (positive.includes(emotion)) {
            insights.push({ icon: '🌟', text: `Your most common mood is <strong>${emotion}</strong> — great mental health indicator!` });
        } else {
            insights.push({ icon: '💙', text: `Your most common mood is <strong>${emotion}</strong>. Consider checking the wellness tips for support.` });
        }

        if (stats.mood_streak >= 3) {
            insights.push({ icon: '🔥', text: `You have a <strong>${stats.mood_streak}-day</strong> positive mood streak! Keep it up!` });
        }

        if (stats.today_scans >= 5) {
            insights.push({ icon: '📊', text: `You've done <strong>${stats.today_scans} scans</strong> today. Great for tracking!` });
        }

        if (stats.avg_confidence < 0.4) {
            insights.push({ icon: '💡', text: 'Tip: Better lighting improves detection accuracy.' });
        }

        if (stats.total_scans >= 10) {
            const topEmotions = Object.entries(stats.emotion_distribution).slice(0, 2);
            if (topEmotions.length >= 2) {
                insights.push({
                    icon: '📈',
                    text: `Top emotions: <strong>${topEmotions[0][0]}</strong> (${topEmotions[0][1]}×) and <strong>${topEmotions[1][0]}</strong> (${topEmotions[1][1]}×)`
                });
            }
        }
    }

    container.innerHTML = insights.map(i => `
        <div class="insight-item">
            <span class="insight-icon">${i.icon}</span>
            <span class="insight-text">${i.text}</span>
        </div>
    `).join('');
}
