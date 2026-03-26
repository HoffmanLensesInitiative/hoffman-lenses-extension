// Hoffman Lenses - Background Worker
// Tracks session state across all tabs.

var sessions = {};

var DEFAULT_SESSION = {
  active: true,
  startTime: null,
  hostname: null,
  blocksScanned: 0,
  blocksFlagged: 0,
  escalationScore: 0,
  patternCounts: {},
  sessionDurationSeconds: 0
};

function getSession(tabId) {
  if (!sessions[tabId]) {
    sessions[tabId] = JSON.parse(JSON.stringify(DEFAULT_SESSION));
    sessions[tabId].startTime = Date.now();
  }
  return sessions[tabId];
}

function calcEscalation(session) {
  if (session.blocksScanned === 0) return 0;
  var ratio = session.blocksFlagged / session.blocksScanned;
  return Math.min(100, Math.round(ratio * 100));
}

function escalationLevel(score) {
  if (score < 30) return 'low';
  if (score < 60) return 'medium';
  return 'high';
}

function formatDuration(seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  return m + ':' + (s < 10 ? '0' : '') + s;
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  var tabId = sender.tab ? sender.tab.id : null;

  if (message.type === 'REPORT_SITE') {
    if (tabId) {
      var s = getSession(tabId);
      s.hostname = message.data.hostname;
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'REPORT_SCAN') {
    if (tabId) {
      var s = getSession(tabId);
      s.blocksScanned += message.data.totalBlocks || 0;
      s.blocksFlagged += message.data.flaggedBlocks || 0;
      var patterns = message.data.patterns || {};
      Object.keys(patterns).forEach(function(k) {
        s.patternCounts[k] = (s.patternCounts[k] || 0) + patterns[k];
      });
      s.escalationScore = calcEscalation(s);
      s.sessionDurationSeconds = Math.floor((Date.now() - s.startTime) / 1000);
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === 'GET_SESSION') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        var s = getSession(tabs[0].id);
        s.sessionDurationSeconds = Math.floor((Date.now() - s.startTime) / 1000);
        s.escalationScore = calcEscalation(s);
        var score = s.escalationScore;
        sendResponse({
          session: s,
          escalationLevel: escalationLevel(score),
          duration: formatDuration(s.sessionDurationSeconds)
        });
      } else {
        sendResponse({ session: DEFAULT_SESSION });
      }
    });
    return true;
  }

  if (message.type === 'GET_STATE') {
    if (tabId) {
      sendResponse({ active: getSession(tabId).active });
    } else {
      sendResponse({ active: true });
    }
    return true;
  }

  if (message.type === 'TOGGLE') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        var s = getSession(tabs[0].id);
        s.active = message.data.active;
        sendResponse({ active: s.active });
      }
    });
    return true;
  }

  if (message.type === 'RESET') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs[0]) {
        sessions[tabs[0].id] = JSON.parse(JSON.stringify(DEFAULT_SESSION));
        sessions[tabs[0].id].startTime = Date.now();
        sendResponse({ ok: true });
      }
    });
    return true;
  }
});

chrome.tabs.onRemoved.addListener(function(tabId) {
  delete sessions[tabId];
});

chrome.alarms.create('tick', { periodInMinutes: 1/6 });
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'tick') {
    Object.keys(sessions).forEach(function(tabId) {
      if (sessions[tabId].startTime) {
        sessions[tabId].sessionDurationSeconds =
          Math.floor((Date.now() - sessions[tabId].startTime) / 1000);
      }
    });
  }
});
