# Contributing to Hoffman Lenses

Thank you for contributing. This extension exists to expose behavioral manipulation systems — your work directly supports that mission.

## How to contribute

### Highest priority: Platform adapters

The most impactful contribution is a new platform adapter. We currently support Facebook. We need:

- `content/platforms/instagram.js`
- `content/platforms/x.js`
- `content/platforms/tiktok.js`
- `content/platforms/youtube.js`

An adapter must implement these functions:

```javascript
// Find all unprocessed post elements in the feed
findFeedPosts() → HTMLElement[]

// Extract visible data from a post element
buildPostData(postEl, feedPosition) → PostData

// Detect sponsored label
detectSponsored(postEl) → boolean

// Detect suggested/inserted label
detectSuggested(postEl) → boolean

// Detect follow button (user is not following this account)
detectFollowButton(postEl) → boolean

// Extract timestamp text ("3 days ago", "2h", etc.)
extractTimestamp(postEl) → string | null
```

See `content/platforms/facebook.js` for a complete reference implementation.

### Reporting broken detection

When a platform updates their layout and breaks detection, open an issue immediately with:
- Which platform
- What stopped working (which detection type)
- Any visible DOM changes you noticed

### Improving detection patterns

The engagement bait patterns are in `content/core.js` in the `ENGAGEMENT_BAIT_PATTERNS` array.  
New patterns are welcome. Please include:
- The pattern (as a regex)
- Example text that triggers it
- Why it qualifies as engagement manipulation

### Design improvements

The overlay visual design is in `styles/overlay.css` and `content/overlay.js`.  
The popup design is in `popup/popup.css` and `popup/popup.html`.

### Icon

We need a proper icon based on the They Live sunglasses — the distinctive flat-top rectangular frames with the inverted V nose bridge. Should work at 16px, 48px, and 128px. SVG source preferred.

## Guidelines

- This extension sends no data anywhere. Any contribution that introduces network requests will not be merged.
- Detection should err on the side of false negatives over false positives — it is better to miss a flag than to incorrectly flag clean content.
- Confidence scores must be included for any non-100% reliable detection.
- All code must be readable. This is a public interest project — the code is the documentation.

## Code style

- Plain JavaScript — no build step, no transpilation, no frameworks
- No external dependencies
- Comments explain *why*, not *what*
- Function names are verbs

## License

By contributing, you agree your contributions are licensed under the MIT License.
