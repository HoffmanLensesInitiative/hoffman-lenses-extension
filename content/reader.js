// Hoffman Lenses - Universal Page Reader
// Extracts readable text blocks from any webpage.
// Feeds them to hl-detect. Annotates what it finds.
// No platform knowledge. No DOM structure assumptions.
// Reads what you read.

(function() {

  if (typeof window.hlDetect === 'undefined') {
    console.warn('[Hoffman Lenses] hl-detect not loaded');
    return;
  }

  // Report current site to background worker
  try {
    chrome.runtime.sendMessage({
      type: 'REPORT_SITE',
      data: { hostname: location.hostname }
    });
  } catch(e) {}

  // Nodes we have already processed
  var processedNodes = new WeakSet();

  // Sites where we skip annotation (banking, medical, etc.)
  var SKIP_HOSTNAMES = [
    'mail.google.com', 'outlook.live.com', 'outlook.office.com',
    'onlinebanking', 'chase.com', 'bankofamerica.com', 'wellsfargo.com',
    'paypal.com', 'accounts.google.com', 'login.', 'signin.'
  ];

  function shouldSkipPage() {
    var h = location.hostname.toLowerCase();
    return SKIP_HOSTNAMES.some(function(skip) { return h.includes(skip); });
  }

  // Find readable text blocks on the page.
  // A text block is a leaf-ish element containing at least 40 chars
  // of visible text that isn't a script, style, or input element.
  function findTextBlocks() {
    var blocks = [];
    var seen = new WeakSet();

    // Priority selectors -- elements most likely to contain
    // manipulative content worth annotating
    var selectors = [
      // Social media post containers
      '[role="article"]',
      '[data-testid*="tweet"]',
      '[data-testid*="post"]',
      // News and article content
      'article',
      '[class*="article"]',
      '[class*="post"]',
      '[class*="story"]',
      '[class*="feed-item"]',
      '[class*="card"]',
      // Generic content blocks
      'h1', 'h2', 'h3',
      'p'
    ];

    selectors.forEach(function(selector) {
      try {
        document.querySelectorAll(selector).forEach(function(el) {
          if (seen.has(el) || processedNodes.has(el)) return;
          if (!isVisible(el)) return;
          var text = getCleanText(el);
          if (text.length >= 40 && text.length <= 5000) {
            // Skip if a parent is already in our list
            var parent = el.parentElement;
            var parentCaptured = false;
            while (parent) {
              if (seen.has(parent)) { parentCaptured = true; break; }
              parent = parent.parentElement;
            }
            if (!parentCaptured) {
              blocks.push(el);
              seen.add(el);
            }
          }
        });
      } catch(e) {}
    });

    return blocks;
  }

  function isVisible(el) {
    if (!el.offsetParent && el.tagName !== 'BODY') return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none') return false;
    if (style.visibility === 'hidden') return false;
    if (parseFloat(style.opacity) === 0) return false;
    return true;
  }

  function getCleanText(el) {
    // Get visible text, skip aria-hidden content
    var clone = el.cloneNode(true);
    // Remove hidden elements
    clone.querySelectorAll('[aria-hidden="true"], script, style, noscript').forEach(function(n) {
      n.remove();
    });
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  // Process a single text block
  function processBlock(el) {
    if (processedNodes.has(el)) return null;
    processedNodes.add(el);

    var text = getCleanText(el);
    if (!text || text.length < 40) return null;

    var result = window.hlDetect.detect(text);

    if (result.flagged) {
      window.HLOverlay.annotate(el, result);
    }

    return result;
  }

  // Scan all visible text blocks on the current page
  function scanPage() {
    if (shouldSkipPage()) return;

    // Check if extension is active
    try {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, function(response) {
        if (response && response.active === false) return;
        doScan();
      });
    } catch(e) {
      doScan();
    }
  }

  function doScan() {
    var blocks = findTextBlocks();
    if (blocks.length === 0) return;

    var results = [];
    blocks.forEach(function(el) {
      var r = processBlock(el);
      if (r) results.push(r);
    });

    if (results.length > 0) {
      var flagged = results.filter(function(r) { return r.flagged; });
      var report = {
        url: location.hostname,
        totalBlocks: results.length,
        flaggedBlocks: flagged.length,
        patterns: {}
      };
      flagged.forEach(function(r) {
        r.patterns.forEach(function(p) {
          report.patterns[p.type] = (report.patterns[p.type] || 0) + 1;
        });
      });

      try {
        chrome.runtime.sendMessage({ type: 'REPORT_SCAN', data: report });
        chrome.runtime.sendMessage({ type: 'GET_SESSION' }, function(response) {
          if (response) window.HLOverlay.updateBar(response);
        });
      } catch(e) {}
    }
  }

  // Watch for new content (infinite scroll, dynamic loading)
  var scanTimer = null;
  var observer = new MutationObserver(function(mutations) {
    var hasNew = mutations.some(function(m) { return m.addedNodes.length > 0; });
    if (hasNew) {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(doScan, 800);
    }
  });

  function start() {
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    setTimeout(scanPage, 500);
  }

  // Handle SPA navigation (URL changes without page reload)
  var lastUrl = location.href;
  new MutationObserver(function() {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(function() {
        processedNodes = new WeakSet();
        scanPage();
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }

  console.log('[Hoffman Lenses] reader.js ready -- universal mode');

})();
