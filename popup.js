// ═══════════════════════════════════════════════════════
// HOFFMAN LENSES — Popup Script
// Reads session state from background worker and renders it.
// ═══════════════════════════════════════════════════════

function updateUI(response) {
  if (!response) return;
  const { session, escalationLevel, networkRatio, insertedRatio, duration } = response;
  if (!session) return;

  // Time
  const timeEl = document.getElementById('stat-time');
  if (timeEl) timeEl.textContent = duration || '0:00';

  // Posts
  const postsEl = document.getElementById('stat-posts');
  if (postsEl) postsEl.textContent = session.postsScanned || 0;

  // Platform
  const platformEl = document.getElementById('platform-name');
  if (platformEl) {
    platformEl.textContent = session.platform
      ? session.platform.charAt(0).toUpperCase() + session.platform.slice(1)
      : '—';
  }

  // Network ratio
  const networkEl = document.getElementById('stat-network');
  if (networkEl) {
    networkEl.textContent = networkRatio !== undefined ? `${networkRatio}%` : '—';
    networkEl.className = 'stat-val ' + (
      networkRatio > 50 ? 'stat-good' :
      networkRatio > 20 ? 'stat-warn' : 'stat-danger'
    );
  }

  // Inserted ratio
  const insertedEl = document.getElementById('stat-inserted');
  if (insertedEl) {
    insertedEl.textContent = insertedRatio !== undefined ? `${insertedRatio}%` : '—';
    insertedEl.className = 'stat-val ' + (
      insertedRatio < 30 ? 'stat-good' :
      insertedRatio < 60 ? 'stat-warn' : 'stat-danger'
    );
  }

  // Escalation
  const score = session.escalationScore || 0;
  const level = escalationLevel || 'low';

  const escValEl = document.getElementById('escalation-val');
  if (escValEl) {
    escValEl.textContent = `${score}/100`;
    escValEl.className = 'escalation-val esc-' + level;
  }

  const escFillEl = document.getElementById('escalation-fill');
  if (escFillEl) {
    escFillEl.style.width = `${score}%`;
    escFillEl.className = 'escalation-fill esc-fill-' + level;
  }

  const escDescEl = document.getElementById('escalation-desc');
  if (escDescEl) {
    const descs = {
      low:    'Feed composition looks relatively normal.',
      medium: 'Moderate algorithmic manipulation detected.',
      high:   'Heavy manipulation detected. Most content is algorithmically inserted.'
    };
    escDescEl.textContent = descs[level] || '';
  }

  // Flag counts
  const flags = session.flagsByType || {};
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || 0;
  };
  set('flag-sponsored', flags.sponsored);
  set('flag-inserted',  flags.inserted);
  set('flag-old',       flags.old_content);
  set('flag-bait',      flags.engagement_bait);
  set('flag-network',   flags.not_in_network);

  // Toggle state
  const toggle = document.getElementById('toggle-active');
  if (toggle) toggle.checked = session.active !== false;
}

// ── Load session state ────────────────────────────────────
chrome.runtime.sendMessage({ type: 'GET_SESSION' }, updateUI);

// ── Toggle handler ────────────────────────────────────────
document.getElementById('toggle-active').addEventListener('change', function () {
  chrome.runtime.sendMessage({
    type: 'TOGGLE_ACTIVE',
    data: { active: this.checked }
  });
});

// ── Reset handler ─────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', function () {
  chrome.runtime.sendMessage({ type: 'RESET_SESSION' }, () => {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, updateUI);
  });
});

// ── Refresh every 5 seconds while popup is open ───────────
setInterval(() => {
  chrome.runtime.sendMessage({ type: 'GET_SESSION' }, updateUI);
}, 5000);
