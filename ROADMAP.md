# LeadForge — Long-Term Feature Roadmap

*Researched 2026-06-12. Plan only — nothing here is built yet.*

---

## 1. Where the tool stands today

LeadForge already does the **hunting** well: 5 legal acquisition channels, audits
(health + crawl + PageSpeed), transparent scoring, pipeline, schedule, team accounts,
and a worker that does heavy lifting for the whole team. What it does NOT yet do well
is the part that makes money: **getting replies and closing**. The current outreach
drafts are templates; there is no proof asset to send, no reply tracking, and no
"why now" trigger on any lead.

## 2. The business lens (funnel math)

Your funnel: **Hunt → Qualify → Contact → Reply → Meeting → Won.**

Research benchmarks (sources at bottom):
- Average cold email reply rate: **3.4%** (only 8.5% get *any* reply per a
  12-million-email study).
- **Signal-based personalized campaigns: 15–25% reply — a 5x multiplier.**
- Agencies that send a **free branded audit PDF up front** ("reverse lead magnet")
  instead of asking for a call report **2–5x more positive replies**.
- Deliverability reality: ~1 in 6 legitimate emails never reaches the inbox;
  Gmail/Yahoo now require SPF/DKIM/DMARC; safe volume is 50–100 emails/mailbox/day.
- Key market gap: intent-data platforms (Bombora, ZoomInfo, 6sense) **don't cover
  local SMBs** — nobody indexes whether a Parramatta real estate agency is "in market".
  Whoever detects local buying signals first-party owns an advantage the big tools can't sell.

**Conclusion:** every high-priority feature below attacks one number: the reply rate.
Hunting more leads with a 3% reply rate is a treadmill. Same effort at 15–25% is a business.

---

## 3. Priority 0 — Reply-rate multipliers (build first)

### F1. Branded PDF Audit Report — the "reverse lead magnet" ⭐ highest ROI
**What:** One click on a diagnosed lead → a beautiful 2-page client-facing PDF:
their mobile/desktop scores as dials, what each problem costs them in plain language
("7-second load ≈ X% of visitors gone before your listings appear"), the 3 priority
fixes, your logo and contact. Attach to the first email.
**Why:** This is the single most validated conversion tactic for agencies (2–5x
positive replies). You stop asking for their time and start giving value first. It
also makes every outreach feel premium and impossible to mistake for spam.
**Have already:** all the data (audit, PSI, crawl). Need: PDF generator on the worker,
report template, "Generate report" button.

### F2. AI Outreach Writer (Claude API)
**What:** Replace template drafts with what we built manually for Hunters Agency:
a per-lead pack — email (3 subject options), WhatsApp, LinkedIn note, and the
reply-intent playbook — written by AI from the lead's actual audit numbers, sector,
city, and trigger signals. Human approves before sending (keeps your safety rule).
**Why:** Signal-based personalization is the 15–25% reply bracket. Writing these
manually took us ~20 minutes; AI does it in 10 seconds per lead, so every lead gets
Hunters-quality outreach, not just the special ones.
**Need:** ANTHROPIC_API_KEY, one route + prompt built from lead JSON, UI tab in
outreach section. Cost ≈ ₹1–2 per lead.

### F3. Intent Trigger Engine ("why now" signals)
**What:** First-party buying signals attached to every lead, shown as badges and
scored:
- **Runs ads** (link-out checks to Google Ads Transparency Center + Meta Ad Library;
  click to verify, one checkbox to record) → has marketing budget *right now*
- **Hiring** (Search button: site:seek.com.au / indeed query per lead) → growth + budget
- **Review momentum** (rating + review count already available from Places enrich;
  flag "high reviews + bad website" = winning offline, losing online)
- **New domain / website refresh in progress** (already have crt.sh)
- **Tech signal** (already detect WordPress/Wix/etc. — flag old stacks)
**Why:** This is the exact gap the intent-data industry leaves open for local SMBs.
A lead with budget signals + pain signals is the "contacts you for sure" lead.
Trigger lines also write the best openers: "noticed you're hiring a property manager…"
**Need:** badge UI + scoring hooks + link-out checks; review data is one field away.

### F4. Reply & Outcome Tracking (use the outreach_logs table — it exists, unused)
**What:** Log every send (channel, template, date) with one click; record the reply
intent (interested / price / later / no); dashboard: reply rate by channel, by sector,
by template, by source.
**Why:** Business-head rule: you can't improve what you don't measure. After 100
sends you'll KNOW "real estate via WhatsApp replies 3x better than email" and stop
guessing. This data also feeds the AI writer ("use the best-performing angle").
**Need:** small UI on the lead (Log touch / Log reply), one analytics panel.

### F5. Email verification + suppression list
**What:** Before sending: MX-record check + a free-tier verifier API; mark emails
valid/risky/dead (affects reachability score). A do-not-contact list (manual adds +
anyone who says "stop") that blocks accidental re-adds via any import.
**Why:** 1 in 6 emails dies in transit; bouncing kills your domain reputation, and
once your domain is burned, EVERY future campaign whispers. Cheap insurance.
**Need:** verifier lib + flag on lead + suppression table checked by importers.

---

## 4. Priority 1 — Pipeline power (after P0 proves itself)

### F6. Mobile screenshot in audits
Worker already runs a browser — capture the phone-size screenshot at 3 seconds
(mid-load) and final. Goes in the PDF (F1): nothing convinces a business owner like
*seeing* their broken mobile site. Near-zero extra cost.

### F7. Competitor gap report
Pick the lead's best-ranking competitor in the same city (one Places query), audit
both, show side-by-side scores in the PDF: "Harcourts loads in 2.1s, you load in 7.1s."
Loss-aversion is the strongest pitch psychology for local businesses.

### F8. Semi-automatic sequences
The day-3 / day-7 / day-14 follow-ups pre-drafted per lead, surfaced in Schedule as
one-click actions (opens Gmail compose / wa.me with the text pre-filled, then logs it).
Human presses send every time — ToS-clean, spam-clean, but zero friction. Follow-ups
are where most replies actually come from; today they depend on your memory.

### F9. Funnel & ROI dashboard
A "Reports" view: leads → contacted → replied → meeting → won, by source / sector /
city / month. Answers the only strategic question: **where should next month's
hunting hours go?** (e.g. "OSM clinics in Tricity close at 8%, AU real estate at 2%").

### F10. Scheduled auto-hunt
Worker cron: every Monday 6am, run saved hunt recipes (e.g. "OSM: dentists, next
city on the list, only-no-website") → import → auto-diagnose top 20 → the team wakes
up to a scored, drafted hot-list. The tool hunts while you sleep.

---

## 5. Priority 2 — Long-term business plays

### F11. Public shareable audit page
"View your audit" link (yoursite.com/audit/abc123) instead of/alongside the PDF —
tracks when the prospect opens it (open = hot lead, call now). Branded page doubles
as marketing for Bitpixel Coders.

### F12. Client mode — audits become recurring revenue
After winning a client, flip the lead to "Client": same engine re-audits monthly and
emails them a branded progress report (scores going up). This converts one-off website
projects into **retainers** — the single biggest revenue-model upgrade an agency can make.

### F13. Win-back recycler
Quarterly auto re-audit of Lost/stale leads. Site got worse or still broken → fresh
"checking back in" draft with the new numbers. Lost leads become a renewable resource.

### F14. LeadForge as a product (SaaS)
The endgame: you're building exactly what thousands of small agencies want and can't
buy (the intent-data gap is industry-wide). Multi-tenant is already half-done (teams,
RLS, worker queue). When your own agency proves the playbook, sell the tool —
₹2–5k/month per agency seat. Your agency becomes the case study.

### F15. WhatsApp-first flow for India
wa.me click-to-chat with pre-filled message from the lead card, WhatsApp templates
per sector, and a "WhatsApp" channel in reply tracking. In Tricity, WhatsApp beats
email for SMB owners — the tool should treat it as a first-class channel.

---

## 6. What NOT to build (and why)

- **Auto-sending / bulk blast** — burns the domain (50–100/day/mailbox is the ceiling),
  kills the genuine feel that gets the 15–25% replies, and risks spam law (ACMA in
  Australia is strict). Human-approved send is a feature, not a limitation.
- **LinkedIn / Google SERP scraping bots** — account bans, ToS breach, legal exposure.
  The official-API + manual-capture approach already covers it.
- **Buying lead lists** — dead reply rates, GDPR/spam exposure, and it would make the
  tool's own hunting pointless.
- **CRM feature creep** (deals, invoicing, projects) — stay the best at hunt → reply;
  integrate with real CRMs later instead.

## 7. Metrics that decide everything

North star: **qualified replies per week.**
Supporting: reply rate by channel/template (target ≥10% in 90 days), audit-PDF open
rate, meetings booked/month, win rate by source, and time-from-import-to-first-touch
(target < 48h — speed is the most underrated conversion factor).

## 8. Recommended build order

| # | Feature | Effort | Direct effect |
|---|---|---|---|
| 1 | F1 PDF audit report | 2–3 days | 2–5x positive replies |
| 2 | F2 AI outreach writer | 1–2 days | 15–25% reply bracket |
| 3 | F4 Reply tracking | 1 day | learn what works |
| 4 | F3 Intent triggers | 2 days | better targets + openers |
| 5 | F5 Email verification | 1 day | protect the domain |
| 6 | F6–F10 | ~1 week | scale what works |
| 7 | F11–F15 | ongoing | retainers + product |

---

### Research sources
- Reply benchmarks & signal-based 15–25%: Autobound Cold Email Guide 2026; Sopro cold outreach statistics; Snov.io benchmarks
- Reverse lead magnet / audit PDF 2–5x: LUK Digital Cold Email Blueprint 2026; Get Map Leads web-agency outreach guide
- Deliverability (SPF/DKIM/DMARC, 50–100/day, 84% inbox rate): UnifyGTM Cold Email 2026; Validity Deliverability Benchmark
- Local SMB intent-data gap: Datalane Intent Data Providers 2026; Cognism intent-data guide
