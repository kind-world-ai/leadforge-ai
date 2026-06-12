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

Two terminals — that's the whole setup:

```bash
# Terminal 1 — the app
npm run dev          # http://localhost:3020

# Terminal 2 — the crawler worker (Playwright lives here)
npm run worker
```

The app handles login, leads, imports, audits, PageSpeed, and drafts. The worker
processes queued "Full diagnosis" / "Crawl site" jobs from Supabase. Teammates
just need the app URL (or run the app themselves) — only this machine runs the worker.

First time on a machine: `npm install && npx playwright install chromium`.

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

## Shared online mode (Supabase) + crawler worker

The app supports two backends, switched with `DATA_BACKEND` in `.env.local`:

- `sqlite` (default) — local-first, single user, works offline. No login.
- `supabase` — shared Postgres online with login/register, team RLS, and a job queue
  so Playwright only runs on one worker machine (keeps desktop builds small).

### Setup (one time)

1. Create a free project at supabase.com.
2. Open Dashboard → SQL → New query, paste and run `supabase/migrations/001_init.sql`.
3. In `.env.local` set:

```text
DATA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   (Dashboard -> Settings -> API)
SUPABASE_SERVICE_ROLE_KEY=...       (same page; keep secret, server/worker only)
```

4. Restart the app. You'll be redirected to `/login` — register; a team is created
   automatically (signup trigger). Teammates who register can be added to your team
   via the `team_members` table.

### Crawler worker (one machine only)

In supabase mode, "Full diagnosis" and "Crawl site" enqueue jobs in `crawl_jobs`
instead of running Playwright locally. On the one machine that should do the heavy
work (needs the same `.env.local` values plus Playwright browsers):

```bash
npx playwright install chromium
npm run worker
```

The worker polls the queue, runs crawl → PageSpeed → rescore → outreach draft, and
writes results to Supabase. Everyone's app sees updated leads on refresh.
Light features (Places/OSM import, basic audit, PageSpeed button, drafts) still run
inside the app — only browser automation moves to the worker.

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

## Architecture

```
App (Next.js, npm run dev / deploy to Vercel)
  -> Login/Register (Supabase Auth)
  -> Leads, imports, audits, PageSpeed, drafts, pipeline, schedule

Supabase Postgres (shared online database)
  -> leads, search_runs, crawl_jobs, outreach_logs, teams, profiles

Worker (npm run worker, ONE machine with Playwright)
  -> Polls crawl_jobs, runs crawl -> PageSpeed -> rescore -> outreach
  -> Writes results back to Supabase
```

Electron packaging was removed — the app runs as a normal Next.js app.

## Deploy online

### App → Vercel (free)

1. Push the repo to GitHub (make sure `.env.local` is NOT committed — it's gitignored).
2. vercel.com → New Project → import the repo. Framework auto-detects Next.js.
3. Add environment variables (Project → Settings → Environment Variables):
   `DATA_BACKEND=supabase`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PLACES_API_KEY`, `PAGESPEED_API_KEY` (optional),
   `ABN_LOOKUP_GUID` (optional).
4. Deploy. Teammates open the URL, register, and you add them in the Team view.

All API-based features run on Vercel. "Full diagnosis" / "Crawl site" enqueue jobs
for the worker — Vercel never runs Playwright.

### Worker → your PC or a small VPS (~$5/mo)

On your PC: `npm run worker` (jobs queue while it's off).

On a VPS / Railway / any Docker host (always-on):

```bash
docker build -f worker/Dockerfile -t leadforge-worker .
docker run -d --restart=always \
  -e NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=sb_secret_... \
  -e PAGESPEED_API_KEY=... \
  leadforge-worker
```

Without Docker on a VPS: clone repo, `npm install`, `npx playwright install chromium`,
copy `.env.local`, then `npm run worker` under pm2 (`pm2 start "npm run worker" --name leadforge-worker`).

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
