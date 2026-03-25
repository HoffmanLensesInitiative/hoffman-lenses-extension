// ═══════════════════════════════════════════════════════
// HOFFMAN LENSES — Background Service Worker
// Manages session state across all tabs and page loads.
// Content scripts report to this. Popup reads from this.
// No page access. No network access. Local only.
// ═══════════════════════════════════════════════════════

// ── Default session state ────────────────────────────────
const DEFAULT_SESSION = {
  active: true,               // extension on/off
  startTime: null,            // when user arrived on platform
  platform: null,             // which platform we're on
  postsScanned: 0,            // total posts examined
  postsFromNetwork: 0,        // posts from accounts user follows
  postsInserted: 0,           // algorithmically inserted posts
  postsSponsored: 0,          // paid/sponsored posts
  flagsTotal: 0,              // total manipulation flags raised
  flagsByType: {
    sponsored: 0,
    inserted: 0,
    old_content: 0,
    engagement_bait: 0,
    not_in_network: 0,
    coordinated: 0
  },
  escalationScore: 0,         // 0-100, rises with red flags
  lastFlagTime: null,
  sessionDurationSeconds: 0
};

// ── In-memory state ──────────────────────────────────────
// Keyed by tabId so multiple tabs tracked independently
const sessions = {};

// ── Helpers ──────────────────────────────────────────────
function getSession(tabId) {
  if (!sessions[tabId]) {
    sessions[tabId] = {
      ...DEFAULT_SESSION,
      startTime: Date.now()
    };
  }
  return sessions[tabId];
}

function calculateEscalation(session) {
  if (session.postsScanned === 0) return 0;
  const redFlagRatio = (session.postsInserted + session.postsSponsored) / session.postsScanned;
  const baitRatio = session.flagsByType.engagement_bait / Math.max(session.postsScanned, 1);
  const score = Math.min(100, Math.round((redFlagRatio * 70) + (baitRatio * 30)));
  return score;
}

function getEscalationLevel(score) {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  return 'high';
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Message handler ──────────────────────────────────────
// Content scripts send messages here to report what they found.
// Popup sends messages here to read current state.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  const tabId = sender.tab ? sender.tab.id : null;

  // ── REPORT: content script found a flagged post ──
  if (message.type === 'REPORT_FLAGS') {
    if (!tabId) return;
    const session = getSession(tabId);

    session.postsScanned += message.data.postsScanned || 0;
    session.postsFromNetwork += message.data.postsFromNetwork || 0;
    session.postsInserted += message.data.postsInserted || 0;
    session.postsSponsored += message.data.postsSponsored || 0;
    session.flagsTotal += message.data.flagsTotal || 0;
    session.lastFlagTime = Date.now();

    // tally individual flag types
    const incoming = message.data.flagsByType || {};
    Object.keys(incoming).forEach(key => {
      if (session.flagsByType.hasOwnProperty(key)) {
        session.flagsByType[key] += incoming[key];
      }
    });

    session.escalationScore = calculateEscalation(session);
    session.sessionDurationSeconds = Math.floor((Date.now() - session.startTime) / 1000);

    sendResponse({ ok: true });
    return true;
  }

  // ── GET: popup or content script requests current state ──
  if (message.type === 'GET_SESSION') {
    if (!tabId) {
      // popup doesn't have a sender.tab — it queries active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          const session = getSession(tabs[0].id);
          session.sessionDurationSeconds = Math.floor((Date.now() - session.startTime) / 1000);
          session.escalationScore = calculateEscalation(session);
          sendResponse({
            session,
            escalationLevel: getEscalationLevel(session.escalationScore),
            networkRatio: session.postsScanned > 0
              ? Math.round((session.postsFromNetwork / session.postsScanned) * 100)
              : 0,
            insertedRatio: session.postsScanned > 0
              ? Math.round((session.postsInserted + session.postsSponsored) / session.postsScanned * 100)
              : 0,
            duration: formatDuration(session.sessionDurationSeconds)
          });
        } else {
          sendResponse({ session: DEFAULT_SESSION });
        }
      });
      return true; // async
    }

    const session = getSession(tabId);
    session.sessionDurationSeconds = Math.floor((Date.now() - session.startTime) / 1000);
    sendResponse({
      session,
      escalationLevel: getEscalationLevel(session.escalationScore),
      networkRatio: session.postsScanned > 0
        ? Math.round((session.postsFromNetwork / session.postsScanned) * 100)
        : 0,
      insertedRatio: session.postsScanned > 0
        ? Math.round(((session.postsInserted + session.postsSponsored) / session.postsScanned) * 100)
        : 0,
      duration: formatDuration(session.sessionDurationSeconds)
    });
    return true;
  }

  // ── TOGGLE: turn extension on or off ──
  if (message.type === 'TOGGLE_ACTIVE') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const session = getSession(tabs[0].id);
        session.active = message.data.active;
        sendResponse({ active: session.active });
      }
    });
    return true;
  }

  // ── RESET: clear session for current tab ──
  if (message.type === 'RESET_SESSION') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sessions[tabs[0].id] = {
          ...DEFAULT_SESSION,
          startTime: Date.now()
        };
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  // ── PLATFORM: content script reports which platform it's on ──
  if (message.type === 'REPORT_PLATFORM') {
    if (tabId) {
      const session = getSession(tabId);
      session.platform = message.data.platform;
    }
    sendResponse({ ok: true });
    return true;
  }

});

// ── Clean up sessions when tab closes ────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  delete sessions[tabId];
});

// ── Session timer tick ───────────────────────────────────
// Update duration every 10 seconds using alarms
chrome.alarms.create('session-tick', { periodInMinutes: 1/6 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'session-tick') {
    Object.keys(sessions).forEach(tabId => {
      if (sessions[tabId].startTime) {
        sessions[tabId].sessionDurationSeconds =
          Math.floor((Date.now() - sessions[tabId].startTime) / 1000);
      }
    });
  }
});
