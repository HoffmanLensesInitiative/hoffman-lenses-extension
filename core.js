// ═══════════════════════════════════════════════════════
// HOFFMAN LENSES — Core Detection Engine
// Platform-agnostic BMS pattern matcher.
// Takes a PostData object, returns an array of flags.
// Knows nothing about the DOM — that's the platform adapter's job.
// ═══════════════════════════════════════════════════════

// ── Flag types ───────────────────────────────────────────
const FLAG_TYPES = {
  SPONSORED:        'sponsored',
  INSERTED:         'inserted',
  OLD_CONTENT:      'old_content',
  ENGAGEMENT_BAIT:  'engagement_bait',
  NOT_IN_NETWORK:   'not_in_network',
  COORDINATED:      'coordinated'
};

// ── Severity levels ──────────────────────────────────────
const SEVERITY = {
  INFO:   'info',    // green  — informational, no manipulation
  WARN:   'warn',    // amber  — manipulative but lower harm
  DANGER: 'danger'   // red    — algorithmic insertion, outrage engineering
};

// ── Engagement bait phrase patterns ──────────────────────
// These are phrases consistently used to engineer clicks and shares
// through emotional manipulation rather than informational value.
const ENGAGEMENT_BAIT_PATTERNS = [
  // suppression conspiracy framing
  /share before (this gets |it gets )?taken down/i,
  /before (they |this gets |it gets )?deleted/i,
  /they don'?t want you to (see|know|share)/i,
  /banned from (facebook|instagram|social media)/i,
  /watch before it disappears/i,
  /censored (video|post|content)/i,
  /what (the )?media (won'?t|isn'?t) (tell|showing) you/i,
  /mainstream media (won'?t|isn'?t|is not) (covering|reporting)/i,

  // incomplete headline bait
  /you won'?t believe/i,
  /what happened next/i,
  /the reason will (shock|surprise|amaze|horrify)/i,
  /this is why/i,
  /nobody is talking about this/i,
  /this changes everything/i,

  // outrage engineering
  /this needs to (stop|end)/i,
  /i'?m (so |absolutely )?(disgusted|outraged|furious|sick)/i,
  /how (dare|is this) (they|this|he|she)/i,
  /this is (absolutely |completely )?(disgusting|unacceptable|outrageous)/i,

  // false urgency
  /only [0-9]+ (left|remaining|available)/i,
  /offer (ends|expires) (soon|today|tonight|midnight)/i,
  /limited time/i,
  /act now/i,

  // social proof pressure
  /everyone is (talking about|sharing)/i,
  /[0-9,]+ people (can'?t be wrong|agree)/i,
  /going viral/i,
  /the post (they|facebook|instagram|tiktok) (tried to |)delete/i
];

// ── Timestamp parsing ─────────────────────────────────────
// Returns age in hours, or null if unparseable
function parseTimestampAge(timestampText) {
  if (!timestampText) return null;
  const t = timestampText.toLowerCase().trim();

  // "just now", "now"
  if (/^(just now|now)$/.test(t)) return 0;

  // "Xm" or "X minutes ago"
  const mins = t.match(/^(\d+)\s*m(in(utes?)?)?\s*(ago)?$/);
  if (mins) return parseInt(mins[1]) / 60;

  // "Xh" or "X hours ago"
  const hrs = t.match(/^(\d+)\s*h(ours?)?\s*(ago)?$/);
  if (hrs) return parseInt(hrs[1]);

  // "X days ago" or "Xd"
  const days = t.match(/^(\d+)\s*d(ays?)?\s*(ago)?$/);
  if (days) return parseInt(days[1]) * 24;

  // "X weeks ago" or "Xw"
  const weeks = t.match(/^(\d+)\s*w(eeks?)?\s*(ago)?$/);
  if (weeks) return parseInt(weeks[1]) * 168;

  // "X months ago"
  const months = t.match(/^(\d+)\s*month(s)?\s*ago$/);
  if (months) return parseInt(months[1]) * 720;

  // "Yesterday"
  if (/^yesterday$/i.test(t)) return 30;

  // Absolute date formats (e.g., "March 15" or "15 March") — treat as old
  if (/^(january|february|march|april|may|june|july|august|september|october|november|december)/i.test(t)) {
    return 720; // at least a month old
  }

  return null;
}

// ── Main detection function ───────────────────────────────
// postData shape:
// {
//   text: string,           — visible post text
//   timestamp: string,      — raw timestamp text ("3 days ago")
//   isSponsored: bool,      — platform adapter detected sponsored label
//   isSuggested: bool,      — platform adapter detected suggested label
//   hasFollowButton: bool,  — "Follow" button present (not in network)
//   feedPosition: number,   — position in feed (0-indexed)
//   authorName: string,
//   engagementText: string  — visible comment/share counts if available
// }

function detectFlags(postData) {
  const flags = [];

  // ── 1. SPONSORED CONTENT ────────────────────────────────
  if (postData.isSponsored) {
    flags.push({
      type: FLAG_TYPES.SPONSORED,
      severity: SEVERITY.WARN,
      label: 'Paid advertisement',
      detail: 'This post is sponsored content — the platform is paid to show it to you regardless of your choices.',
      confidence: 1.0
    });
  }

  // ── 2. SUGGESTED / INSERTED CONTENT ─────────────────────
  if (postData.isSuggested && !postData.isSponsored) {
    flags.push({
      type: FLAG_TYPES.INSERTED,
      severity: SEVERITY.DANGER,
      label: 'Algorithmically inserted',
      detail: 'This post is not from anyone you follow. The algorithm placed it here to test your engagement.',
      confidence: 1.0
    });
  }

  // ── 3. NOT IN NETWORK ────────────────────────────────────
  if (postData.hasFollowButton && !postData.isSponsored && !postData.isSuggested) {
    flags.push({
      type: FLAG_TYPES.NOT_IN_NETWORK,
      severity: SEVERITY.DANGER,
      label: 'Not in your network',
      detail: 'You do not follow this account. This post was inserted by the algorithm without your direction.',
      confidence: 0.98
    });
  }

  // ── 4. ARTIFICIALLY SURFACED OLD CONTENT ─────────────────
  const ageHours = parseTimestampAge(postData.timestamp);
  if (ageHours !== null && ageHours >= 48) {
    const ageDays = Math.round(ageHours / 24);
    const ageLabel = ageHours >= 720
      ? `${Math.round(ageHours / 720)} month${Math.round(ageHours / 720) > 1 ? 's' : ''} old`
      : ageHours >= 168
        ? `${Math.round(ageHours / 168)} week${Math.round(ageHours / 168) > 1 ? 's' : ''} old`
        : `${ageDays} day${ageDays > 1 ? 's' : ''} old`;

    flags.push({
      type: FLAG_TYPES.OLD_CONTENT,
      severity: SEVERITY.WARN,
      label: `Old content artificially surfaced`,
      detail: `This post is ${ageLabel}. The algorithm promoted it now — not because it is new, but because it predicts you will engage with it.`,
      confidence: 0.95
    });
  }

  // ── 5. ENGAGEMENT BAIT ───────────────────────────────────
  const fullText = [postData.text, postData.engagementText].filter(Boolean).join(' ');
  const matchedPatterns = ENGAGEMENT_BAIT_PATTERNS.filter(pattern => pattern.test(fullText));

  if (matchedPatterns.length > 0) {
    // Confidence scales with number of matched patterns
    const confidence = Math.min(0.95, 0.65 + (matchedPatterns.length * 0.1));

    let detail = 'This post uses language patterns associated with engagement manipulation — designed to trigger an emotional reaction rather than inform.';
    if (matchedPatterns.length >= 2) {
      detail = `This post contains ${matchedPatterns.length} engagement manipulation patterns — language engineered to provoke sharing, outrage, or fear rather than to inform.`;
    }

    flags.push({
      type: FLAG_TYPES.ENGAGEMENT_BAIT,
      severity: SEVERITY.DANGER,
      label: 'Engagement bait',
      detail,
      confidence
    });
  }

  return flags;
}

// ── Session reporting helper ──────────────────────────────
// Tallies flags and reports to background worker
function buildReport(results) {
  const report = {
    postsScanned: results.length,
    postsFromNetwork: 0,
    postsInserted: 0,
    postsSponsored: 0,
    flagsTotal: 0,
    flagsByType: {
      sponsored: 0,
      inserted: 0,
      old_content: 0,
      engagement_bait: 0,
      not_in_network: 0,
      coordinated: 0
    }
  };

  results.forEach(({ flags, postData }) => {
    if (flags.length === 0) {
      report.postsFromNetwork++;
    }

    flags.forEach(flag => {
      report.flagsTotal++;
      if (report.flagsByType.hasOwnProperty(flag.type)) {
        report.flagsByType[flag.type]++;
      }
      if (flag.type === FLAG_TYPES.SPONSORED) report.postsSponsored++;
      if (flag.type === FLAG_TYPES.INSERTED || flag.type === FLAG_TYPES.NOT_IN_NETWORK) {
        report.postsInserted++;
      }
    });
  });

  return report;
}

// ── Exports for use by platform adapters and overlay ─────
// (In MV3 content scripts we use globals since modules
//  behave differently in content script context)
window.HLCore = {
  detectFlags,
  buildReport,
  FLAG_TYPES,
  SEVERITY,
  parseTimestampAge
};
