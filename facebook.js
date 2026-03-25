// ═══════════════════════════════════════════════════════
// HOFFMAN LENSES — Facebook Platform Adapter
// Knows how to find posts in Facebook's feed and extract
// the visible text data that core.js needs.
// When Facebook changes their layout, only this file needs updating.
// ═══════════════════════════════════════════════════════

(function () {

  // Guard: only run if core and overlay are loaded
  if (!window.HLCore || !window.HLOverlay) {
    console.warn('[Hoffman Lenses] Core or Overlay not loaded. Aborting Facebook adapter.');
    return;
  }

  // Report platform to background worker
  chrome.runtime.sendMessage({
    type: 'REPORT_PLATFORM',
    data: { platform: 'facebook' }
  });

  // ── Already-processed post tracking ──────────────────────
  // We mark processed posts so we don't re-scan them on scroll
  const PROCESSED_ATTR = 'data-hl-processed';
  const processedPosts = new WeakSet();

  // ── Facebook post selectors ───────────────────────────────
  // Facebook uses dynamic class names that change constantly.
  // We rely on structural and ARIA attributes which are more stable.
  //
  // Primary feed post container: role="article" within the main feed
  // This is stable because it's an accessibility attribute Facebook
  // must maintain for screen reader compliance.

  function findFeedPosts() {
    return Array.from(document.querySelectorAll('[role="feed"] [role="article"]'))
      .filter(el => !processedPosts.has(el));
  }

  // ── Extract visible text from a post element ──────────────
  function extractPostText(postEl) {
    // Get all visible text nodes, excluding aria-hidden elements
    const textNodes = [];
    const walker = document.createTreeWalker(
      postEl,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip hidden elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest('[aria-hidden="true"]')) return NodeFilter.FILTER_REJECT;
          if (parent.closest('[style*="display: none"]')) return NodeFilter.FILTER_REJECT;
          const text = node.textContent.trim();
          if (text.length < 2) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node.textContent.trim());
    }

    return textNodes.join(' ');
  }

  // ── Detect sponsored label ────────────────────────────────
  function detectSponsored(postEl) {
    const fullText = extractPostText(postEl);

    // Facebook uses "Sponsored" as a visible label
    // It also appears as an aria-label in some contexts
    const sponsoredPatterns = [
      /\bSponsored\b/,
      /\bPromoted\b/
    ];

    // Check visible text
    if (sponsoredPatterns.some(p => p.test(fullText))) return true;

    // Check aria-labels throughout the post
    const ariaEls = postEl.querySelectorAll('[aria-label]');
    for (const el of ariaEls) {
      const label = el.getAttribute('aria-label') || '';
      if (sponsoredPatterns.some(p => p.test(label))) return true;
    }

    return false;
  }

  // ── Detect suggested / recommended label ─────────────────
  function detectSuggested(postEl) {
    const fullText = extractPostText(postEl);
    const suggestedPatterns = [
      /Suggested for you/i,
      /Suggested post/i,
      /Recommended for you/i,
      /People also like/i,
      /You might like/i,
      /Suggested group/i,
      /Suggested page/i
    ];
    return suggestedPatterns.some(p => p.test(fullText));
  }

  // ── Detect follow button (not in user's network) ──────────
  function detectFollowButton(postEl) {
    // "Follow" buttons are present when the user does not follow the poster
    // We look for visible buttons or links with follow-related text
    const buttons = postEl.querySelectorAll('[role="button"], button, a');
    for (const btn of buttons) {
      const text = (btn.textContent || '').trim();
      const ariaLabel = (btn.getAttribute('aria-label') || '').trim();
      const combined = `${text} ${ariaLabel}`;
      if (/^follow$/i.test(text) || /\bfollow\b/i.test(ariaLabel)) {
        // Make sure it's not a "Following" (already following) button
        if (!/following/i.test(combined) && !/unfollow/i.test(combined)) {
          return true;
        }
      }
    }
    return false;
  }

  // ── Extract timestamp text ────────────────────────────────
  function extractTimestamp(postEl) {
    // Facebook timestamps are typically in <abbr> or <a> elements
    // with title attributes containing the full date,
    // and visible text showing relative time ("3 days ago", "2h", etc.)

    // Try abbr with title first (most reliable)
    const abbr = postEl.querySelector('abbr[data-utime], abbr[title]');
    if (abbr) {
      return abbr.textContent.trim();
    }

    // Look for timestamp-like links (Facebook wraps timestamps in links to the post)
    const links = postEl.querySelectorAll('a[href*="/posts/"], a[href*="/permalink/"], a[href*="?story_fbid"]');
    for (const link of links) {
      const text = link.textContent.trim();
      // Match time patterns
      if (/^(\d+\s*(m|h|d|w)|just now|yesterday|\w+ \d+)/i.test(text)) {
        return text;
      }
    }

    // Fallback: scan all text for time patterns
    const allText = extractPostText(postEl);
    const timeMatch = allText.match(/\b(\d+\s*(minutes?|hours?|days?|weeks?|months?)\s*ago|just now|yesterday)\b/i);
    if (timeMatch) return timeMatch[0];

    return null;
  }

  // ── Extract author name ───────────────────────────────────
  function extractAuthorName(postEl) {
    // Author name is typically the first prominent link or h2/h3 in the post header
    const nameEl = postEl.querySelector('h2 a, h3 a, h4 a, strong a, [data-testid="story-subtitle"] a');
    if (nameEl) return nameEl.textContent.trim();

    // Fallback: first bold/strong text
    const strong = postEl.querySelector('strong');
    if (strong) return strong.textContent.trim();

    return '';
  }

  // ── Build PostData object ─────────────────────────────────
  function buildPostData(postEl, feedPosition) {
    return {
      text: extractPostText(postEl),
      timestamp: extractTimestamp(postEl),
      isSponsored: detectSponsored(postEl),
      isSuggested: detectSuggested(postEl),
      hasFollowButton: detectFollowButton(postEl),
      feedPosition,
      authorName: extractAuthorName(postEl),
      engagementText: ''
    };
  }

  // ── Process a single post ─────────────────────────────────
  function processPost(postEl, feedPosition) {
    if (processedPosts.has(postEl)) return null;
    processedPosts.add(postEl);
    postEl.setAttribute(PROCESSED_ATTR, 'true');

    const postData = buildPostData(postEl, feedPosition);
    const flags = window.HLCore.detectFlags(postData);

    // Hand off to overlay renderer
    if (flags.length > 0) {
      window.HLOverlay.annotate(postEl, flags, postData);
    } else {
      window.HLOverlay.markClean(postEl);
    }

    return { flags, postData };
  }

  // ── Scan the feed ─────────────────────────────────────────
  function scanFeed() {
    // Check if extension is active
    chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response) => {
      if (response && response.session && !response.session.active) return;
    });

    const posts = findFeedPosts();
    if (posts.length === 0) return;

    const results = [];
    posts.forEach((postEl, i) => {
      const result = processPost(postEl, i);
      if (result) results.push(result);
    });

    if (results.length > 0) {
      const report = window.HLCore.buildReport(results);
      chrome.runtime.sendMessage({
        type: 'REPORT_FLAGS',
        data: report
      });

      // Update the session bar on the page
      chrome.runtime.sendMessage({ type: 'GET_SESSION' }, (response) => {
        if (response) {
          window.HLOverlay.updateSessionBar(response);
        }
      });
    }
  }

  // ── Observe the feed for new posts (infinite scroll) ─────
  // Facebook loads new posts as you scroll — we watch for DOM changes
  const feedObserver = new MutationObserver((mutations) => {
    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        break;
      }
    }
    if (hasNewNodes) {
      // Debounce — wait for DOM to settle before scanning
      clearTimeout(window._hlScanTimer);
      window._hlScanTimer = setTimeout(scanFeed, 600);
    }
  });

  // Start observing once the feed is present
  function startObserving() {
    const feed = document.querySelector('[role="feed"]');
    if (feed) {
      feedObserver.observe(feed, {
        childList: true,
        subtree: true
      });
      scanFeed(); // initial scan
    } else {
      // Feed not yet loaded — retry
      setTimeout(startObserving, 1000);
    }
  }

  // ── Init ──────────────────────────────────────────────────
  // Wait for page to be interactive, then start
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    startObserving();
  } else {
    document.addEventListener('DOMContentLoaded', startObserving);
  }

  // Also re-scan when navigating within Facebook (SPA navigation)
  // Facebook uses History API for navigation — watch for URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Reset and re-scan on navigation
      setTimeout(() => {
        startObserving();
      }, 1500);
    }
  }).observe(document, { subtree: true, childList: true });

})();
