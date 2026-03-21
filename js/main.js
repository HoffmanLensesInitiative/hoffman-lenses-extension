// ═══════════════════════════════════════
// HOFFMAN LENSES INITIATIVE
// main.js
// ═══════════════════════════════════════

// ── NAV scroll behaviour ──────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });

// ── Mobile hamburger ──────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.querySelector('.nav-links');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display = open ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '64px';
    navLinks.style.left = '0';
    navLinks.style.right = '0';
    navLinks.style.background = 'rgba(8,12,16,0.98)';
    navLinks.style.padding = '20px 24px';
    navLinks.style.gap = '20px';
    navLinks.style.borderBottom = '1px solid rgba(26,58,92,0.4)';
    if (open) navLinks.style.display = 'none';
  });
}

// ── Scroll reveal ─────────────────────
const revealEls = document.querySelectorAll(
  '.section-label, .section-title, .section-title-sm, ' +
  '.case-main, .case-pillars, .case-quote, ' +
  '.ext-description, .ext-mockup, ' +
  '.knew-item, .rname, .act-card, ' +
  '.about-text, .about-links, ' +
  '.remembrance-intro, .remembrance-names'
);

revealEls.forEach(el => el.classList.add('reveal'));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      // stagger siblings slightly
      const siblings = [...entry.target.parentElement.querySelectorAll('.reveal')];
      const idx = siblings.indexOf(entry.target);
      setTimeout(() => {
        entry.target.classList.add('revealed');
      }, idx * 60);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => observer.observe(el));

// ── Smooth anchor scrolling ───────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      // close mobile nav if open
      if (navLinks) navLinks.style.display = 'none';
    }
  });
});

// ── Mockup annotation pulse ───────────
// Cycle through annotations to simulate live detection
const annotations = document.querySelectorAll('.mockup-annotation');
if (annotations.length) {
  let current = 0;
  annotations.forEach((ann, i) => {
    if (i > 0) ann.style.opacity = '0.4';
  });
  setInterval(() => {
    annotations.forEach((ann, i) => {
      ann.style.transition = 'opacity 0.5s';
      ann.style.opacity = i === current ? '1' : '0.4';
    });
    current = (current + 1) % annotations.length;
  }, 2400);
}
