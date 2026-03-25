// ═══════════════════════════════════════════════════════
// HOFFMAN LENSES — Overlay Renderer
// Draws annotation callouts on flagged posts.
// Manages the session bar at the top of the feed.
// Receives flags from core.js via platform adapters.
// Knows nothing about detection logic.
// ═══════════════════════════════════════════════════════

(function () {

  const NS = 'hl'; // namespace prefix for all our DOM elements

  // ── Session bar ───────────────────────────────────────────
  // A persistent bar showing session stats, injected into the page
  let sessionBar = null;

  function createSessionBar() {
    if (document.getElementById('hl-session-bar')) return;

    sessionBar = document.createElement('div');
    sessionBar.id = 'hl-session-bar';
    sessionBar.className = 'hl-session-bar';
    sessionBar.innerHTML = `
      <div class="hl-sb-inner">
        <div class="hl-sb-logo">
          <span class="hl-sb-logo-icon">◎</span>
          <span class="hl-sb-logo-text">HOFFMAN LENSES</span>
        </div>
        <div class="hl-sb-stats">
          <div class="hl-sb-stat">
            <span class="hl-sb-stat-label">Session</span>
            <span class="hl-sb-stat-val" id="hl-stat-time">0:00</span>
          </div>
          <div class="hl-sb-sep"></div>
          <div class="hl-sb-stat">
            <span class="hl-sb-stat-label">Posts scanned</span>
            <span class="hl-sb-stat-val" id="hl-stat-posts">0</span>
          </div>
          <div class="hl-sb-sep"></div>
          <div class="hl-sb-stat">
            <span class="hl-sb-stat-label">From your network</span>
            <span class="hl-sb-stat-val hl-stat-good" id="hl-stat-network">—</span>
          </div>
          <div class="hl-sb-sep"></div>
          <div class="hl-sb-stat">
            <span class="hl-sb-stat-label">Algorithmically inserted</span>
            <span class="hl-sb-stat-val hl-stat-danger" id="hl-stat-inserted">—</span>
          </div>
          <div class="hl-sb-sep"></div>
          <div class="hl-sb-stat">
            <span class="hl-sb-stat-label">Escalation</span>
            <span class="hl-sb-stat-val" id="hl-stat-escalation">—</span>
          </div>
        </div>
        <button class="hl-sb-toggle" id="hl-sb-toggle" title="Toggle Hoffman Lenses">ON</button>
      </div>
    `;

    // Insert at the top of the body
    document.body.insertAdjacentElement('afterbegin', sessionBar);

    // Toggle button handler
    document.getElementById('hl-sb-toggle').addEventListener('click', () => {
      const btn = document.getElementById('hl-sb-toggle');
      const isOn = btn.textContent === 'ON';
      btn.textContent = isOn ? 'OFF' : 'ON';
      btn.classList.toggle('hl-sb-toggle-off', isOn);
      chrome.runtime.sendMessage({
        type: 'TOGGLE_ACTIVE',
        data: { active: !isOn }
      });
      // Hide/show all annotations
      document.querySelectorAll('.hl-annotation-wrap').forEach(el => {
        el.style.display = isOn ? 'none' : '';
      });
    });
  }

  function updateSessionBar(response) {
    if (!response) return;

    const timeEl = document.getElementById('hl-stat-time');
    const postsEl = document.getElementById('hl-stat-posts');
    const networkEl = document.getElementById('hl-stat-network');
    const insertedEl = document.getElementById('hl-stat-inserted');
    const escalationEl = document.getElementById('hl-stat-escalation');

    if (timeEl) timeEl.textContent = response.duration || '0:00';
    if (postsEl) postsEl.textContent = response.session?.postsScanned || 0;

    if (networkEl) {
      const nr = response.networkRatio;
      networkEl.textContent = nr !== undefined ? `${nr}%` : '—';
      networkEl.className = 'hl-sb-stat-val ' + (nr > 50 ? 'hl-stat-good' : nr > 20 ? 'hl-stat-warn' : 'hl-stat-danger');
    }

    if (insertedEl) {
      const ir = response.insertedRatio;
      insertedEl.textContent = ir !== undefined ? `${ir}%` : '—';
      insertedEl.className = 'hl-sb-stat-val ' + (ir < 30 ? 'hl-stat-good' : ir < 60 ? 'hl-stat-warn' : 'hl-stat-danger');
    }

    if (escalationEl) {
      const level = response.escalationLevel || 'low';
      const score = response.session?.escalationScore || 0;
      escalationEl.textContent = `${level.toUpperCase()} (${score})`;
      escalationEl.className = 'hl-sb-stat-val hl-stat-' + (level === 'low' ? 'good' : level === 'medium' ? 'warn' : 'danger');
    }
  }

  // ── Annotation builder ────────────────────────────────────
  function buildAnnotation(flags, postData) {
    const wrap = document.createElement('div');
    wrap.className = 'hl-annotation-wrap';

    // Determine overall severity — worst flag wins
    const hasDanger = flags.some(f => f.severity === 'danger');
    const hasWarn = flags.some(f => f.severity === 'warn');
    const overallSeverity = hasDanger ? 'danger' : hasWarn ? 'warn' : 'info';

    // Build each flag line
    const flagsHtml = flags.map(flag => {
      const dotClass = `hl-dot hl-dot-${flag.severity}`;
      const confidenceNote = flag.confidence < 0.9
        ? ` <span class="hl-confidence">(${Math.round(flag.confidence * 100)}% confidence)</span>`
        : '';
      return `
        <div class="hl-flag hl-flag-${flag.severity}">
          <div class="${dotClass}"></div>
          <div class="hl-flag-body">
            <div class="hl-flag-label">${escapeHtml(flag.label)}${confidenceNote}</div>
            <div class="hl-flag-detail">${escapeHtml(flag.detail)}</div>
          </div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = `
      <div class="hl-annotation hl-annotation-${overallSeverity}">
        <div class="hl-annotation-header">
          <span class="hl-annotation-logo">◎ Hoffman Lenses</span>
          <span class="hl-flag-count">${flags.length} flag${flags.length > 1 ? 's' : ''}</span>
        </div>
        <div class="hl-flags">
          ${flagsHtml}
        </div>
      </div>
    `;

    return wrap;
  }

  // ── Mark a post as clean ──────────────────────────────────
  function markClean(postEl) {
    // Add a very subtle clean indicator — minimal, not intrusive
    if (postEl.querySelector('.hl-clean-mark')) return;
    const mark = document.createElement('div');
    mark.className = 'hl-clean-mark';
    mark.title = 'Hoffman Lenses: No manipulation detected';
    postEl.style.position = 'relative';
    postEl.appendChild(mark);
  }

  // ── Annotate a flagged post ───────────────────────────────
  function annotate(postEl, flags, postData) {
    if (postEl.querySelector('.hl-annotation-wrap')) return; // already annotated

    const annotation = buildAnnotation(flags, postData);

    // Position relative to the post
    postEl.style.position = 'relative';
    postEl.appendChild(annotation);

    // Add severity class to the post itself for border highlighting
    const hasDanger = flags.some(f => f.severity === 'danger');
    const hasWarn = flags.some(f => f.severity === 'warn');
    if (hasDanger) postEl.classList.add('hl-post-danger');
    else if (hasWarn) postEl.classList.add('hl-post-warn');
  }

  // ── Utility ───────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Init session bar when DOM is ready ────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSessionBar);
  } else {
    createSessionBar();
  }

  // ── Expose public API ─────────────────────────────────────
  window.HLOverlay = {
    annotate,
    markClean,
    updateSessionBar,
    createSessionBar
  };

})();
