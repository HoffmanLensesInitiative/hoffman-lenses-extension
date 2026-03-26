function update(response) {
  if (!response || !response.session) return;
  var s = response.session;

  var dur = document.getElementById('duration');
  var scanned = document.getElementById('scanned');
  var flagged = document.getElementById('flagged');
  var esc = document.getElementById('escalation');
  var site = document.getElementById('site');
  var patterns = document.getElementById('patterns');

  if (dur) dur.textContent = response.duration || '0:00';
  if (scanned) scanned.textContent = s.blocksScanned || 0;
  if (site) site.textContent = s.hostname || '--';

  if (flagged) {
    flagged.textContent = s.blocksFlagged || 0;
    flagged.className = 'stat-val ' + (s.blocksFlagged > 0 ? 'danger' : 'good');
  }

  if (esc) {
    var level = response.escalationLevel || 'low';
    esc.textContent = level.toUpperCase() + ' (' + (s.escalationScore || 0) + ')';
    esc.className = 'stat-val ' + (level === 'low' ? 'good' : level === 'medium' ? 'warn' : 'danger');
  }

  if (patterns) {
    var counts = s.patternCounts || {};
    var keys = Object.keys(counts);
    if (keys.length === 0) {
      patterns.innerHTML = '<div class="pattern-empty">No flags this session.</div>';
    } else {
      var labels = {
        suppression_framing: 'Suppression framing',
        false_urgency: 'False urgency',
        incomplete_hook: 'Incomplete hook',
        outrage_engineering: 'Outrage engineering',
        false_authority: 'Unnamed authority',
        tribal_activation: 'Tribal activation',
        engagement_directive: 'Engagement directive'
      };
      var html = keys
        .sort(function(a,b){ return counts[b] - counts[a]; })
        .map(function(k) {
          return '<div class="pattern-row">' +
            '<span class="pattern-name">' + (labels[k] || k) + '</span>' +
            '<span class="pattern-count">' + counts[k] + '</span>' +
          '</div>';
        }).join('');
      patterns.innerHTML = html;
    }
  }

  var toggle = document.getElementById('active');
  if (toggle) toggle.checked = s.active !== false;
}

chrome.runtime.sendMessage({ type: 'GET_SESSION' }, update);

document.getElementById('active').addEventListener('change', function() {
  chrome.runtime.sendMessage({ type: 'TOGGLE', data: { active: this.checked } });
});

document.getElementById('reset').addEventListener('click', function() {
  chrome.runtime.sendMessage({ type: 'RESET' }, function() {
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, update);
  });
});

setInterval(function() {
  chrome.runtime.sendMessage({ type: 'GET_SESSION' }, update);
}, 5000);
