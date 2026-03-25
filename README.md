# Hoffman Lenses — Browser Extension

**Making the invisible visible.**

An open-source browser extension that overlays real-time annotations on social media feeds, exposing behavioral manipulation systems as they operate on you.

Named for the glasses in John Carpenter's 1988 film *They Live* — once you see what the machine is doing to you, you cannot unsee it.

**Homepage:** https://hoffmanlenses.org  
**White Paper:** https://hoffmanlenses.org/whitepaper  
**License:** MIT

---

## Phase 1 — Current

- Platform: Facebook
- Detection: Sponsored content, algorithmic insertion, not-in-network posts, artificially surfaced old content, engagement bait
- Browser: Firefox

## What it detects

| Flag | Severity | Method |
|------|----------|--------|
| Sponsored content | Amber | Label detection |
| Algorithmically inserted post | Red | Label detection |
| Not in your network | Red | Follow button detection |
| Old content artificially surfaced | Amber | Timestamp parsing |
| Engagement bait | Red | Text pattern matching |

## Privacy

This extension:
- Sends **no data anywhere**
- Makes **no network requests**
- Stores nothing outside your browser
- Has no analytics, no telemetry, no tracking of any kind

All processing happens locally on your device.

## Installing for development (Firefox)

1. Clone this repository
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" → "Load Temporary Add-on"
4. Navigate to the repository folder and select `manifest.json`
5. Open Facebook — the session bar should appear at the top of the page

## Project structure

```
├── manifest.json              Extension configuration
├── background/
│   └── worker.js              Session state manager
├── content/
│   ├── core.js                Detection engine (platform-agnostic)
│   ├── overlay.js             Annotation renderer
│   └── platforms/
│       └── facebook.js        Facebook adapter
├── popup/
│   ├── popup.html             Extension popup panel
│   ├── popup.js
│   └── popup.css
├── styles/
│   └── overlay.css            Annotation visual styles
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Contributing

Platform adapters for Instagram, X, TikTok, and YouTube are the highest priority.  
See CONTRIBUTING.md for guidelines.

When a platform changes their layout and breaks detection, please open an issue immediately.  
The community is the maintenance team.

## Roadmap

- **Phase 1** (current): Firefox, Facebook, Tier 1 detection
- **Phase 2**: Instagram, X, Tier 2 behavioral detection
- **Phase 3**: TikTok, YouTube, session escalation scoring
- **Phase 4**: Chrome Web Store submission, public launch
- **Phase 5**: Local AI content classification

## Contact

- General: contact@hoffmanlenses.org  
- Press: press@hoffmanlenses.org
