# Pep Nation Rx — Website

Redesigned, production-ready telehealth marketing site. Static HTML/CSS/JS,
no build step, built on the `pnrx` design system.

## Pages
`index.html` · `browse.html` · `product.html` · `intake.html` ·
`signin.html` · `dashboard.html` · `404.html`

## Assets
- `pnrx-design-system.css` — design tokens + component library
- `app.css` — page layout (header, footer, hero, per-page composition)
- `app.js` — progressive enhancement (nav, filters, selection state)
- `favicon.svg` — brand mark
- `vercel.json` — clean-URL config · `.vercelignore` — excludes screenshots

## Deploy

This is a zero-config static site. To publish:

### Option A — Vercel (recommended, ~60 seconds)
1. Go to https://vercel.com/new
2. Import this repository (`Smarter-Poker/pepnationrx-site`)
3. Click **Deploy** — Vercel auto-detects the static site and `vercel.json`

Every later push to `main` then auto-deploys.

### Option B — Vercel CLI
```
npx vercel deploy --prod
```
Run from the repo root; it prompts for a one-time login.

## Notes
- All seven pages are render-verified: design tokens resolve, no JS errors,
  no horizontal overflow on desktop or mobile.
- Sign-in and intake forms are front-end only — wire them to your backend
  before production use.
