# PassForge 🔐

A secure, beautiful password generator built with vanilla HTML, CSS, and JavaScript. No frameworks, no backend, no nonsense — just clean frontend code that works.

---

## What it does

- Generates cryptographically secure passwords using `window.crypto.getRandomValues()` — not `Math.random()`
- Live strength meter that updates as you adjust settings
- Customize length (4–32 characters) and character types — uppercase, lowercase, numbers, symbols
- One-click copy with a toast notification
- Keeps a history of your last 5 generated passwords (in-memory, resets on refresh — intentional)
- Scramble-reveal animation when a new password generates
- Fully responsive — works on mobile and desktop

---

## Why I built it

I wanted a project that was actually useful day-to-day and showed attention to detail in both code and design. Most password generators are either ugly or bloated — this one tries to be neither.

---

## Tech

- HTML, CSS, JavaScript — that's it
- `window.crypto.getRandomValues()` for secure randomness
- Google Fonts — DM Sans + JetBrains Mono
- Lucide Icons via CDN

---

## Run it locally

No setup needed. Just clone the repo and open `index.html` in your browser.

```bash
git clone https://github.com/alviramehndiratta-sys/passforge.git
cd passforge
```

Then open `index.html` — done.

---

## Live Demo

[View Live →](https://your-vercel-link-here.vercel.app)

---

Built by [Alvira Mehndiratta](https://github.com/alviramehndiratta-sys)
