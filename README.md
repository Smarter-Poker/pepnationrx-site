# ARCHIVED -- This repository is superseded

**This repository is superseded by
[`Smarter-Software-PIQ/pepnationrx`](https://github.com/Smarter-Software-PIQ/pepnationrx)
(private).**

All canonical PepNationRX work has been migrated to the new monorepo as of
**2026-05-26**. This repo remains as historical reference and will receive
**no further updates**. The live site at <https://pepnationrx.com> is
served from the new monorepo via Vercel.

## What was migrated

The high-value, design-agnostic content from this repo was ported into
the new monorepo via a feature branch PR:

- 13-step intake questionnaire (data + evaluator + validator)
- Product catalog (23 SKUs across 5 categories, with pharmacy routing)
- Cookie consent banner + preferences modal (vanilla JS)
- Legal-document structural index + counsel-placeholder inventory
- Pharmacy routing rule, Stripe charge-on-approval spec, SteadyMD payload
  spec, Order state machine

The Cowork build's UI styling (`pnrx-design-system.css`, `app.css`,
`app.js`, 27 hand-authored HTML pages) was **not** migrated; the new
monorepo uses a different aesthetic (futuristic-metal black/neon) and a
different runtime (Web Components vs plain HTML).

## What was in this repo

Static HTML/CSS/JS marketing site for PepNationRX, built on the `pnrx`
design system. Pages: `index.html`, `browse.html`, `product.html`,
`intake.html`, `signin.html`, `dashboard.html`, `404.html`, plus 22
product pages and 7 legal documents (Terms, Privacy, Legal Notices,
Telehealth Consent, HIPAA Notice of Privacy Practices, Consumer Health
Data Privacy / MHMDA, Do Not Sell or Share).

## Original README

The original README content from this repo is preserved in this commit's
history. See the [diff for this commit](../../commits/main) on the main
branch, or browse the file at any earlier commit on the branch.

---

For all current development, go to
<https://github.com/Smarter-Software-PIQ/pepnationrx>.
