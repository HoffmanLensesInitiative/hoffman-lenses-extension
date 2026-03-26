// Hoffman Lenses - Overlay Renderer v0.2.3
// Icon-based ambient annotation. Fixed-position popup on click.

(function() {

  var currentIndex = -1;
  var activePopup = null;

  var SEV = {
    danger: { color: '#E04040', bg: 'rgba(224,64,64,0.12)', border: 'rgba(224,64,64,0.5)', symbol: '!' },
    warn:   { color: '#D08030', bg: 'rgba(208,128,48,0.12)', border: 'rgba(208,128,48,0.5)', symbol: '?' },
    info:   { color: '#4A80D0', bg: 'rgba(74,128,208,0.12)', border: 'rgba(74,128,208,0.5)', symbol: 'i' }
  };

  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // -- Session bar ------------------------------------------
  function createBar() {
    if (document.getElementById('hl-bar')) return;
    var bar = document.createElement('div');
    bar.id = 'hl-bar';
    bar.innerHTML =
      '<div class="hl-bar-inner">' +
        '<span class="hl-bar-logo">o HOFFMAN LENSES</span>' +
        '<div class="hl-bar-stats">' +
          '<span class="hl-bar-stat"><span class="hl-bar-label">Scanned</span><span class="hl-bar-val" id="hl-scanned">0</span></span>' +
          '<span class="hl-bar-sep"></span>' +
          '<span class="hl-bar-stat"><span class="hl-bar-label">Flagged</span><span class="hl-bar-val hl-danger hl-clickable" id="hl-flagged" title="Click to navigate flags">0</span></span>' +
          '<span class="hl-bar-sep"></span>' +
          '<span class="hl-bar-stat"><span class="hl-bar-label">Escalation</span><span class="hl-bar-val" id="hl-escalation">--</span></span>' +
          '<span class="hl-bar-sep"></span>' +
          '<span class="hl-bar-stat"><span class="hl-bar-label">Site</span><span class="hl-bar-val hl-muted" id="hl-site">' + location.hostname + '</span></span>' +
        '</div>' +
        '<button class="hl-bar-btn" id="hl-toggle">ON</button>' +
      '</div>';
    document.body.appendChild(bar);

    document.getElementById('hl-toggle').addEventListener('click', function() {
      var btn = document.getElementById('hl-toggle');
      var isOn = btn.textContent === 'ON';
      btn.textContent = isOn ? 'OFF' : 'ON';
      btn.classList.toggle('hl-off', isOn);
      document.querySelectorAll('.hl-icon-wrap').forEach(function(el) {
        el.style.display = isOn ? 'none' : '';
      });
      closePopup();
      try { chrome.runtime.sendMessage({ type: 'TOGGLE', data: { active: !isOn } }); } catch(e) {}
    });

    document.getElementById('hl-flagged').addEventListener('click', function() {
      toggleNavigator();
    });
  }

  function updateBar(response) {
    if (!response || !response.session) return;
    var s = response.session;
    var scanned = document.getElementById('hl-scanned');
    var flagged = document.getElementById('hl-flagged');
    var esc_el  = document.getElementById('hl-escalation');
    if (scanned) scanned.textContent = s.blocksScanned || 0;
    if (flagged) {
      var count = document.querySelectorAll('.hl-icon-wrap').length;
      flagged.textContent = count;
      flagged.className = 'hl-bar-val hl-clickable ' + (count > 0 ? 'hl-danger' : 'hl-good');
    }
    if (esc_el) {
      var level = response.escalationLevel || 'low';
      esc_el.textContent = level.toUpperCase() + ' (' + (s.escalationScore || 0) + ')';
      esc_el.className = 'hl-bar-val hl-' + (level === 'low' ? 'good' : level === 'medium' ? 'warn' : 'danger');
    }
  }

  // -- Popup (fixed position, appended to body) -------------
  function openPopup(result, patternIdx, iconEl) {
    closePopup();

    var pattern = result.patterns[patternIdx];
    if (!pattern) return;
    var style = SEV[pattern.severity] || SEV.warn;

    // Position relative to clicked icon, fixed to viewport
    var rect = iconEl.getBoundingClientRect();
    var top = rect.bottom + 8;
    var left = rect.left;
    var popupWidth = 300;

    // Keep on screen
    if (left + popupWidth > window.innerWidth - 16) {
      left = window.innerWidth - popupWidth - 16;
    }
    if (left < 8) left = 8;

    // If popup would go below fold, open above icon instead
    var estimatedHeight = 180;
    if (top + estimatedHeight > window.innerHeight - 50) {
      top = rect.top - estimatedHeight - 8;
    }

    // Other patterns
    var othersHtml = '';
    if (result.patterns.length > 1) {
      othersHtml = '<div style="margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,0.08)">';
      result.patterns.forEach(function(p, i) {
        if (i === patternIdx) return;
        var ps = SEV[p.severity] || SEV.warn;
        othersHtml +=
          '<div style="display:flex;align-items:center;gap:7px;padding:3px 0">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + ps.color + ';flex-shrink:0;display:inline-block"></span>' +
          '<span style="font-size:10px;color:#6A8090">' + esc(p.label) + '</span>' +
          '</div>';
      });
      othersHtml += '</div>';
    }

    var conf = pattern.confidence < 0.9
      ? '<span style="font-size:9px;color:#3A5060;margin-left:5px;font-weight:400">(' + Math.round(pattern.confidence * 100) + '%)</span>'
      : '';

    var popup = document.createElement('div');
    popup.id = 'hl-popup';
    popup.setAttribute('style',
      'position:fixed !important;' +
      'top:' + top + 'px !important;' +
      'left:' + left + 'px !important;' +
      'width:' + popupWidth + 'px !important;' +
      'z-index:2147483647 !important;' +
      'background:#060A10 !important;' +
      'border:1px solid rgba(255,255,255,0.1) !important;' +
      'border-left:3px solid ' + style.color + ' !important;' +
      'border-radius:4px !important;' +
      'padding:12px 14px !important;' +
      'font-family:ui-monospace,monospace !important;' +
      'font-size:11px !important;' +
      'line-height:1.5 !important;' +
      'box-shadow:0 8px 32px rgba(0,0,0,0.7) !important;' +
      'color:#C0D0E0 !important;' +
      'display:block !important;' +
      'visibility:visible !important;' +
      'opacity:1 !important;' +
      'overflow:visible !important;' +
      'height:auto !important;' +
      'max-height:none !important;' +
      'pointer-events:auto !important;'
    );

    popup.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,0.08)">' +
        '<span style="font-size:8px;font-weight:700;letter-spacing:0.15em;color:#3A5060;text-transform:uppercase">o HOFFMAN LENSES</span>' +
        '<button id="hl-popup-close" style="background:none;border:none;color:#5A7080;cursor:pointer;font-size:14px;padding:0;line-height:1;font-family:monospace">x</button>' +
      '</div>' +
      '<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:' + style.color + ';display:block;visibility:visible;opacity:1">' +
        esc(pattern.label) + conf +
      '</div>' +
      '<div style="font-size:10px;color:#8AACAC;line-height:1.75;display:block;visibility:visible;opacity:1">' +
        esc(pattern.explanation) +
      '</div>' +
      othersHtml;

    document.body.appendChild(popup);
    activePopup = popup;

    popup.querySelector('#hl-popup-close').addEventListener('click', function(e) {
      e.stopPropagation();
      closePopup();
    });
  }

  function closePopup() {
    if (activePopup && activePopup.parentNode) {
      activePopup.parentNode.removeChild(activePopup);
    }
    activePopup = null;
  }

  // Close when clicking outside
  document.addEventListener('click', function(e) {
    if (activePopup && !activePopup.contains(e.target) && !e.target.classList.contains('hl-icon')) {
      closePopup();
    }
  });

  // -- Annotate: inject icon strip after flagged element ----
  function annotate(el, result) {
    if (el.nextSibling && el.nextSibling.classList && el.nextSibling.classList.contains('hl-icon-wrap')) return;

    var hasDanger = result.patterns.some(function(p) { return p.severity === 'danger'; });
    var hasWarn   = result.patterns.some(function(p) { return p.severity === 'warn'; });
    var overallSev = hasDanger ? 'danger' : hasWarn ? 'warn' : 'info';

    var wrap = document.createElement('div');
    wrap.className = 'hl-icon-wrap';
    wrap.setAttribute('style',
      'display:inline-flex !important;' +
      'align-items:center !important;' +
      'gap:4px !important;' +
      'margin:3px 0 5px 0 !important;' +
      'position:relative !important;'
    );

    result.patterns.forEach(function(p, idx) {
      var style = SEV[p.severity] || SEV.warn;
      var icon = document.createElement('button');
      icon.className = 'hl-icon hl-icon-' + p.severity;
      icon.setAttribute('title', p.label + ' -- click for details');
      icon.setAttribute('style',
        'display:inline-flex !important;' +
        'align-items:center !important;' +
        'justify-content:center !important;' +
        'width:20px !important;' +
        'height:20px !important;' +
        'border-radius:50% !important;' +
        'font-family:ui-monospace,monospace !important;' +
        'font-size:11px !important;' +
        'font-weight:900 !important;' +
        'cursor:pointer !important;' +
        'border:1.5px solid ' + style.border + ' !important;' +
        'background:' + style.bg + ' !important;' +
        'color:' + style.color + ' !important;' +
        'line-height:1 !important;' +
        'padding:0 !important;' +
        'flex-shrink:0 !important;' +
        'visibility:visible !important;' +
        'opacity:1 !important;'
      );
      icon.textContent = style.symbol;

      // Capture idx and result for closure
      (function(capturedIdx, capturedResult) {
        icon.addEventListener('click', function(e) {
          e.stopPropagation();
          e.preventDefault();
          if (activePopup) {
            var openIdx = activePopup.getAttribute('data-idx');
            closePopup();
            if (openIdx === String(capturedIdx) && activePopup === null) return;
          }
          activePopup = { getAttribute: function() { return String(capturedIdx); } };
          openPopup(capturedResult, capturedIdx, icon);
          if (activePopup && activePopup.setAttribute) {
            activePopup.setAttribute('data-idx', String(capturedIdx));
          }
        });
      })(idx, result);

      wrap.appendChild(icon);
    });

    el.classList.add('hl-flagged', 'hl-flagged-' + overallSev);

    if (el.parentNode) {
      el.parentNode.insertBefore(wrap, el.nextSibling);
    }
  }

  // -- Flag navigator ---------------------------------------
  function toggleNavigator() {
    var existing = document.getElementById('hl-navigator');
    if (existing) { existing.remove(); currentIndex = -1; return; }
    var all = document.querySelectorAll('.hl-icon-wrap');
    if (all.length === 0) return;
    createNavigator();
    navigateTo(0);
  }

  function createNavigator() {
    var total = document.querySelectorAll('.hl-icon-wrap').length;
    var nav = document.createElement('div');
    nav.id = 'hl-navigator';
    nav.innerHTML =
      '<div class="hl-nav-inner">' +
        '<span class="hl-nav-label">FLAG NAVIGATOR</span>' +
        '<span class="hl-nav-counter"><span id="hl-nav-current">1</span> of <span id="hl-nav-total">' + total + '</span></span>' +
        '<div class="hl-nav-controls">' +
          '<button class="hl-nav-btn" id="hl-nav-prev">&#8593;</button>' +
          '<button class="hl-nav-btn" id="hl-nav-next">&#8595;</button>' +
          '<button class="hl-nav-close" id="hl-nav-close">x</button>' +
        '</div>' +
        '<div class="hl-nav-preview" id="hl-nav-preview"></div>' +
      '</div>';
    document.body.appendChild(nav);
    document.getElementById('hl-nav-prev').addEventListener('click', function() { navigateTo(currentIndex - 1); });
    document.getElementById('hl-nav-next').addEventListener('click', function() { navigateTo(currentIndex + 1); });
    document.getElementById('hl-nav-close').addEventListener('click', function() {
      nav.remove();
      document.querySelectorAll('.hl-icon-wrap-active').forEach(function(el) { el.classList.remove('hl-icon-wrap-active'); });
      currentIndex = -1;
    });
  }

  function navigateTo(index) {
    var all = Array.from(document.querySelectorAll('.hl-icon-wrap'));
    if (all.length === 0) return;
    if (index < 0) index = all.length - 1;
    if (index >= all.length) index = 0;
    currentIndex = index;
    var counter = document.getElementById('hl-nav-current');
    var total = document.getElementById('hl-nav-total');
    if (counter) counter.textContent = currentIndex + 1;
    if (total) total.textContent = all.length;
    document.querySelectorAll('.hl-icon-wrap-active').forEach(function(el) { el.classList.remove('hl-icon-wrap-active'); });
    var target = all[currentIndex];
    if (!target) return;
    target.classList.add('hl-icon-wrap-active');
    var rect = target.getBoundingClientRect();
    window.scrollTo({ top: window.pageYOffset + rect.top - (window.innerHeight / 2), behavior: 'smooth' });
    var preview = document.getElementById('hl-nav-preview');
    if (preview) {
      var firstIcon = target.querySelector('.hl-icon');
      var iconCount = target.querySelectorAll('.hl-icon').length;
      var title = firstIcon ? firstIcon.getAttribute('title').replace(' -- click for details', '') : 'Flag';
      preview.innerHTML =
        '<span class="hl-nav-flag-label">' + esc(title) + '</span>' +
        (iconCount > 1 ? '<span class="hl-nav-more"> +' + (iconCount - 1) + ' more</span>' : '') +
        '<span class="hl-nav-pos"> -- ' + (currentIndex + 1) + ' of ' + all.length + '</span>';
    }
  }

  // -- Init -------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createBar);
  } else {
    createBar();
  }

  window.HLOverlay = { annotate: annotate, updateBar: updateBar };
  console.log('[Hoffman Lenses] overlay.js ready -- fixed popup mode');

})();
