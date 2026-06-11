# LeadForge AI

Local-first lead discovery, website audit, outreach drafting, and pipeline tracker for IT services.

## What it does

- Creates sector and market search runs for Tricity, Australia, USA, or any target market.
- Stores leads locally in SQLite at `data/leadforge.sqlite`.
- Imports real business leads from the official Google Places API with cheap discovery mode and optional enrichment.
- Saves manually researched Google Maps leads without scraping Maps pages.
- Crawls websites with Playwright to inspect contact paths, forms, CTAs, social links, and page-level SEO signals.
- Audits websites from the Node backend and detects common website, SEO, trust, contact, and automation problems.
- Scores leads by commercial opportunity.
- Drafts human-approved cold email, call opener, LinkedIn note, and contact-form message.
- Tracks each lead through `New`, `Qualified`, `Drafted`, `Contacted`, follow-ups, meeting, proposal, won, or lost.
- Imports pasted CSV rows and exports the full pipeline to CSV.

## Run locally

```bash
cd leadforge-ai
npm run dev
```

Open:

```text
http://localhost:3020
```

## Google Places setup

Create `.env.local`:

```bash
cp .env.example .env.local
```

Add your server-side API key:

```text
GOOGLE_PLACES_API_KEY=your_key_here
```

The app uses the official Places API Text Search endpoint. It does not scrape Google Maps pages.

Recommended flow:

1. Run `Discovery` first to save business name, address, Maps URL, and Google place ID.
2. Open only promising leads and click `Enrich place` to fetch website, phone, rating, and richer fields.
3. Run website audit or crawler only after enrichment finds a website.

Use `Enriched` import when you intentionally want website/phone for every result in that search. That costs more than discovery.

Manual Maps capture is for leads you personally find in Google Maps. Paste or type the business details, parse the paste, then save the lead. Do not automate browser scraping of Google Maps results.

## Lead acquisition channels

The Source Engine offers several legal acquisition channels:

- **Google Places** (official API, paid per call) — discovery + enrichment.
- **OpenStreetMap import** (free, no key) — business search by type + city worldwide via Overpass. Data © OpenStreetMap contributors (ODbL). Public servers are rate-limited; keep imports small.
- **Manual Capture** (paste-parse-save) — for Google Maps, Justdial, IndiaMART, Sulekha, Yellow Pages, exhibitor lists, tender portals. No scraping; you paste what you found manually.
- **New-Domain Finder** (crt.sh, free) — searches certificate-transparency logs for newly registered domains matching a keyword. Use narrow keywords; the free service rejects broad ones.
- **ABN Lookup** (Australia, official) — needs a free GUID from abr.business.gov.au/Tools/WebServices in `.env.local` as `ABN_LOOKUP_GUID`.

## Google PageSpeed setup

The `PageSpeed` button in the lead detail panel runs Google PageSpeed Insights for mobile and desktop. It works without a key at low volume, but a key avoids rate limits:

1. Enable "PageSpeed Insights API" in Google Cloud (can be the same project/key as Places).
2. Add `PAGESPEED_API_KEY=your_key` to `.env.local` (falls back to `GOOGLE_PLACES_API_KEY`).

Results (performance, SEO, best practices, accessibility, LCP/FCP/TBT/CLS) are stored on the lead's audit and feed the opportunity score automatically.

## Import format

Each row can be:

```text
Business, https://site.com, City, Country, Sector, Phone, Email, Google Maps, Website; SEO, Notes
```

One website URL per line also works.

## Windows path

This app is built as a normal Next.js and Node.js app first. That keeps development fast. Later we can wrap the same UI/backend in Electron for a Windows installer.

Recommended next stack:

- UI: Next.js App Router
- Backend: Next.js route handlers on Node.js
- Browser work: Playwright/Crawlee worker
- Local database: SQLite
- Desktop packaging: Electron

## Desktop app

Run the desktop shell locally:

```bash
npm run desktop
```

Create an unpacked desktop build for local testing:

```bash
npm run desktop:pack
```

Run the desktop smoke test before creating an installer:

```bash
npm run desktop:smoke
```

`desktop:pack` and `desktop:dist` rebuild the packaged standalone SQLite module for Electron automatically. If the desktop window is blank, run `npm run desktop:smoke` first; it will fail with the real startup error instead of creating a bad installer.

Create installers:

```bash
npm run desktop:dist
```

Platform-specific installers:

```bash
npm run desktop:dist:mac
npm run desktop:dist:win
```

The packaged app seeds its first database from the current `data/leadforge.sqlite`.
After installation, user data is stored outside the app bundle:

- macOS: `~/Library/Application Support/LeadForge AI/data/leadforge.sqlite`
- Windows: `%APPDATA%\LeadForge AI\data\leadforge.sqlite`

This means a future app update should not overwrite the user's live leads.

## Local files

- SQLite database: `data/leadforge.sqlite`
- Legacy JSON migration source: `data/leadforge-db.json`
- Google Places key: `.env.local`

If Playwright browser binaries are missing on a fresh machine, run:

```bash
npx playwright install chromium
```

## Safety rule

The tool is designed for research, scoring, drafts, and tracking. It should not auto-message, auto-apply, or scrape behind logged-in areas on platforms such as Upwork, LinkedIn, Facebook, or Google services. Keep final outreach human-approved.
