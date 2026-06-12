import type { Lead, PainSignal } from "@/lib/types";
import { solutionFor } from "@/lib/report/solutions";

export interface Branding {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  accent: string;
}

export function brandingFromEnv(): Branding {
  return {
    name: process.env.AGENCY_NAME || "Bitpixel Coders",
    tagline: process.env.AGENCY_TAGLINE || "Websites, SEO & Automation for growing businesses",
    phone: process.env.AGENCY_PHONE || "",
    email: process.env.AGENCY_EMAIL || "",
    website: process.env.AGENCY_WEBSITE || "",
    accent: process.env.AGENCY_ACCENT || "#d97757"
  };
}

const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function buildReportHtml(lead: Lead, brand: Branding): string {
  const audit = lead.audit;
  const psiM = audit?.pagespeed?.mobile ?? null;
  const psiD = audit?.pagespeed?.desktop ?? null;
  const health = audit && audit.status !== 0 ? audit.healthScore : null;

  // Sort by severity, drop findings that share the same fix (e.g. duplicate H1 issues), cap at 5.
  const seenFixes = new Set<string>();
  const issues = [...lead.painSignals]
    .sort((a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3))
    .filter((signal) => {
      const fix = solutionFor(signal).fix;
      if (seenFixes.has(fix)) return false;
      seenFixes.add(fix);
      return true;
    })
    .slice(0, 5);

  const date = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  :root { --accent: ${brand.accent}; --ink: #1f1e1b; --soft: #6f6c5f; --line: #e6e3d8; --paper: #faf9f5; --field: #f4f2ea; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: var(--ink); background: white; font-size: 10.5px; line-height: 1.5; }
  .page { width: 210mm; min-height: 296mm; padding: 14mm 16mm; page-break-after: always; position: relative; background: white; }
  .page:last-child { page-break-after: auto; }
  .serif { font-family: Georgia, 'Times New Roman', serif; }

  .band { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid var(--accent); padding-bottom: 12px; }
  .brand-name { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; }
  .brand-name span { color: var(--accent); }
  .brand-tag { font-size: 9px; color: var(--soft); margin-top: 2px; }
  .band-right { text-align: right; font-size: 9px; color: var(--soft); }

  h1.title { font-size: 30px; letter-spacing: -0.5px; margin: 34px 0 6px; }
  .subtitle { color: var(--soft); font-size: 12px; }

  .biz-card { margin-top: 22px; background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; }
  .biz-name { font-size: 17px; font-weight: 700; }
  .biz-meta { color: var(--soft); font-size: 10px; margin-top: 3px; }
  .biz-url { color: var(--accent); font-weight: 600; font-size: 11px; }

  .dials { display: flex; gap: 14px; margin-top: 24px; }
  .dial-card { flex: 1; border: 1px solid var(--line); border-radius: 10px; padding: 16px 12px 14px; text-align: center; background: white; }
  .dial-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: var(--soft); margin-top: 8px; }
  .dial-note { font-size: 9px; color: var(--soft); margin-top: 2px; }

  .vitals { display: flex; gap: 10px; margin-top: 16px; }
  .vital { flex: 1; background: var(--field); border-radius: 8px; padding: 10px 12px; }
  .vital b { font-size: 13px; display: block; }
  .vital span { font-size: 8.5px; color: var(--soft); text-transform: uppercase; letter-spacing: 0.5px; }
  .v-poor b { color: #b04a30; } .v-mid b { color: #a87d2e; } .v-good b { color: #4e7a5a; }

  .summary { margin-top: 24px; border-left: 3px solid var(--accent); padding: 4px 0 4px 16px; }
  .summary h3 { font-size: 13px; margin-bottom: 6px; }
  .summary p { font-size: 10.5px; color: #3d3a32; }

  .facts { display: flex; gap: 8px; margin-top: 18px; flex-wrap: wrap; }
  .fact { font-size: 9px; color: var(--soft); border: 1px solid var(--line); border-radius: 99px; padding: 4px 10px; }

  .footer { position: absolute; bottom: 10mm; left: 16mm; right: 16mm; display: flex; justify-content: space-between; font-size: 8.5px; color: var(--soft); border-top: 1px solid var(--line); padding-top: 8px; }

  h2.section { font-size: 19px; margin: 26px 0 4px; }
  .section-sub { color: var(--soft); font-size: 10.5px; margin-bottom: 14px; }

  .issue { border: 1px solid var(--line); border-radius: 10px; padding: 12px 16px; margin-bottom: 10px; background: white; page-break-inside: avoid; }
  .issue-head { display: flex; justify-content: space-between; align-items: center; }
  .issue-title { font-size: 12px; font-weight: 700; }
  .sev { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border-radius: 99px; padding: 3px 9px; }
  .sev-high { background: #f7e3dc; color: #b04a30; } .sev-medium { background: #f5ecd8; color: #a87d2e; } .sev-low { background: #e3ecf4; color: #4a7fa5; }
  .issue-detail { font-size: 10px; color: #3d3a32; margin-top: 5px; }
  .issue-evidence { font-size: 8.5px; color: var(--soft); margin-top: 3px; }
  .issue-grid { display: flex; gap: 10px; margin-top: 9px; }
  .issue-box { flex: 1; border-radius: 8px; padding: 8px 11px; font-size: 9.5px; }
  .fix-box { background: var(--field); }
  .impact-box { background: #eef3ee; }
  .issue-box b { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
  .fix-box b { color: var(--accent); } .impact-box b { color: #4e7a5a; }

  .plan { display: flex; gap: 12px; margin-top: 14px; }
  .plan-step { flex: 1; border: 1px solid var(--line); border-radius: 10px; padding: 14px; background: var(--paper); }
  .plan-num { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); color: white; font-weight: 700; font-size: 12px; display: flex; align-items: center; justify-content: center; }
  .plan-step h4 { font-size: 11.5px; margin: 8px 0 4px; }
  .plan-step p { font-size: 9.5px; color: #3d3a32; }
  .plan-when { font-size: 8.5px; color: var(--accent); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }

  .cta { margin-top: 22px; background: var(--ink); color: white; border-radius: 12px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
  .cta h3 { font-size: 15px; }
  .cta p { font-size: 9.5px; color: #c9c6bb; margin-top: 4px; max-width: 340px; }
  .cta-contact { text-align: right; font-size: 10.5px; line-height: 1.7; }
  .cta-contact b { color: ${brand.accent}; }
</style></head><body>

<!-- ============ PAGE 1 ============ -->
<div class="page">
  ${bandHtml(brand, date)}
  <h1 class="title serif">Website Performance<br/>&amp; Growth Audit</h1>
  <div class="subtitle">Prepared for the team at ${esc(lead.businessName)}</div>

  <div class="biz-card">
    <div>
      <div class="biz-name serif">${esc(lead.businessName)}</div>
      <div class="biz-meta">${esc(lead.sector)} · ${esc(lead.city)}, ${esc(lead.country)}</div>
    </div>
    <div class="biz-url">${esc(displayUrl(lead.website))}</div>
  </div>

  <div class="dials">
    ${dialHtml("Mobile experience", psiM?.performance ?? null, "Google PageSpeed · most customers arrive here")}
    ${dialHtml("Desktop experience", psiD?.performance ?? null, "Google PageSpeed")}
    ${dialHtml("Site health", health, "Technical & SEO checks across the site")}
  </div>

  ${psiM ? vitalsHtml(psiM.lcpMs, psiM.fcpMs, psiM.tbtMs, psiM.cls) : ""}

  <div class="summary">
    <h3 class="serif">What we found</h3>
    <p>${esc(summaryText(lead))}</p>
  </div>

  <div class="facts">${factsHtml(lead)}</div>

  ${footerHtml(brand, 1)}
</div>

<!-- ============ PAGE 2 ============ -->
<div class="page">
  ${bandHtml(brand, date)}
  <h2 class="section serif">What's costing you customers</h2>
  <div class="section-sub">Each finding below is from a live test of your website — with the fix and what it's worth to the business.</div>
  ${issues.map(issueHtml).join("\n")}
  ${footerHtml(brand, 2)}
</div>

<!-- ============ PAGE 3 ============ -->
<div class="page">
  ${bandHtml(brand, date)}
  <h2 class="section serif">Your priority action plan</h2>
  <div class="section-sub">In the order that pays back fastest.</div>
  <div class="plan">${planHtml(lead)}</div>

  <div class="cta">
    <div>
      <h3 class="serif">Want this handled for you?</h3>
      <p>We prepared this audit for ${esc(lead.businessName)} specifically. Reply and we'll walk you (or your developer) through the fixes — no obligation, the findings are yours either way.</p>
    </div>
    <div class="cta-contact">
      <b>${esc(brand.name)}</b><br/>
      ${brand.email ? `${esc(brand.email)}<br/>` : ""}
      ${brand.phone ? `${esc(brand.phone)}<br/>` : ""}
      ${brand.website ? esc(brand.website) : ""}
    </div>
  </div>
  ${footerHtml(brand, 3)}
</div>

</body></html>`;
}

/* ---------- pieces ---------- */

function bandHtml(brand: Branding, date: string): string {
  const parts = brand.name.split(" ");
  const first = parts.slice(0, -1).join(" ") || brand.name;
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return `<div class="band">
    <div>
      <div class="brand-name serif">${esc(first)} ${last ? `<span>${esc(last)}</span>` : ""}</div>
      <div class="brand-tag">${esc(brand.tagline)}</div>
    </div>
    <div class="band-right">Website Audit Report<br/>${esc(date)}</div>
  </div>`;
}

function dialHtml(label: string, score: number | null, note: string): string {
  const value = score ?? 0;
  const color = score == null ? "#c9c6bb" : score >= 90 ? "#4e7a5a" : score >= 50 ? "#a87d2e" : "#b04a30";
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = (value / 100) * circumference;
  return `<div class="dial-card">
    <svg width="92" height="92" viewBox="0 0 92 92">
      <circle cx="46" cy="46" r="${radius}" fill="none" stroke="#efece2" stroke-width="9"/>
      <circle cx="46" cy="46" r="${radius}" fill="none" stroke="${color}" stroke-width="9"
        stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${circumference.toFixed(1)}"
        transform="rotate(-90 46 46)"/>
      <text x="46" y="46" text-anchor="middle" dominant-baseline="central"
        font-size="22" font-weight="700" fill="${color}" font-family="Georgia, serif">${score == null ? "—" : score}</text>
    </svg>
    <div class="dial-label">${esc(label)}</div>
    <div class="dial-note">${esc(note)}</div>
  </div>`;
}

function vitalsHtml(lcp: number | null, fcp: number | null, tbt: number | null, cls: number | null): string {
  const vital = (label: string, text: string, cls2: string, target: string) =>
    `<div class="vital ${cls2}"><b>${text}</b><span>${label} · target ${target}</span></div>`;
  const lcpClass = lcp == null ? "" : lcp <= 2500 ? "v-good" : lcp <= 4000 ? "v-mid" : "v-poor";
  const fcpClass = fcp == null ? "" : fcp <= 1800 ? "v-good" : fcp <= 3000 ? "v-mid" : "v-poor";
  const tbtClass = tbt == null ? "" : tbt <= 200 ? "v-good" : tbt <= 600 ? "v-mid" : "v-poor";
  const clsClass = cls == null ? "" : cls <= 0.1 ? "v-good" : cls <= 0.25 ? "v-mid" : "v-poor";
  return `<div class="vitals">
    ${vital("Main content shows", lcp == null ? "—" : `${(lcp / 1000).toFixed(1)}s`, lcpClass, "2.5s")}
    ${vital("First paint", fcp == null ? "—" : `${(fcp / 1000).toFixed(1)}s`, fcpClass, "1.8s")}
    ${vital("Page freezes", tbt == null ? "—" : `${Math.round(tbt)}ms`, tbtClass, "200ms")}
    ${vital("Layout jumps", cls == null ? "—" : String(cls), clsClass, "0.1")}
  </div>`;
}

function summaryText(lead: Lead): string {
  const audit = lead.audit;
  const psiM = audit?.pagespeed?.mobile;
  const sentences: string[] = [];

  if (psiM?.performance != null && psiM.performance < 50 && psiM.lcpMs != null) {
    sentences.push(
      `On mobile — where most of your customers arrive — the main content takes ${(psiM.lcpMs / 1000).toFixed(1)} seconds to appear (Google's benchmark for "good" is 2.5s).`
    );
  } else if (psiM?.performance != null && psiM.performance < 75) {
    sentences.push(`Mobile performance scores ${psiM.performance}/100 — workable, but leaving speed (and rankings) on the table.`);
  }

  const high = lead.painSignals.filter((signal) => signal.severity === "high").length;
  const medium = lead.painSignals.filter((signal) => signal.severity === "medium").length;
  sentences.push(
    `Our checks found ${high} high-priority and ${medium} medium-priority issue${high + medium === 1 ? "" : "s"} affecting how customers find and contact you.`
  );

  const goodBits: string[] = [];
  if (audit?.hasSsl) goodBits.push("SSL is in place");
  if (audit?.hasAnalytics) goodBits.push("analytics is installed");
  if (audit?.hasContactForm) goodBits.push("you have working contact forms");
  if (goodBits.length) {
    sentences.push(
      `The good news: ${goodBits.join(", ")} — these are fixable leaks in a working foundation, not a rebuild.`
    );
  }
  return sentences.join(" ");
}

function factsHtml(lead: Lead): string {
  const audit = lead.audit;
  const facts: string[] = [];
  if (audit?.technologies?.length) facts.push(`Built with ${audit.technologies.join(", ")}`);
  if (audit?.crawlerSummary) facts.push(audit.crawlerSummary);
  if (audit?.pagespeed?.mobile?.seo != null) facts.push(`Lighthouse SEO ${audit.pagespeed.mobile.seo}/100`);
  if (audit?.pagespeed?.mobile?.accessibility != null)
    facts.push(`Accessibility ${audit.pagespeed.mobile.accessibility}/100`);
  facts.push(`Tested ${audit?.checkedAt ? new Date(audit.checkedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "recently"} with Google PageSpeed + a ${audit?.crawlPages?.length ?? 1}-page site crawl`);
  return facts.map((fact) => `<div class="fact">${esc(fact)}</div>`).join("");
}

function issueHtml(signal: PainSignal): string {
  const solution = solutionFor(signal);
  return `<div class="issue">
    <div class="issue-head">
      <div class="issue-title">${esc(signal.title)}</div>
      <div class="sev sev-${signal.severity}">${signal.severity}</div>
    </div>
    <div class="issue-detail">${esc(signal.detail)}</div>
    ${signal.evidence ? `<div class="issue-evidence">Evidence: ${esc(signal.evidence)}</div>` : ""}
    <div class="issue-grid">
      <div class="issue-box fix-box"><b>The fix</b>${esc(solution.fix)}</div>
      <div class="issue-box impact-box"><b>What it's worth</b>${esc(solution.impact)}</div>
    </div>
  </div>`;
}

function planHtml(lead: Lead): string {
  const has = (prefix: string) => lead.painSignals.some((signal) => signal.id.startsWith(prefix));
  const steps: { title: string; text: string; when: string }[] = [];

  if (has("weak-title") || has("h1-issue") || has("weak-description") || has("crawl-h1")) {
    steps.push({
      title: "Quick wins: titles & headings",
      text: "Fix the missing/weak title tags, meta descriptions and H1s. Hours of work, immediate effect on how Google reads the site.",
      when: "This week"
    });
  }
  if (has("psi-mobile") || has("psi-desktop") || has("slow-heavy")) {
    steps.push({
      title: "Core fix: mobile speed",
      text: "Image compression, script cleanup, caching/CDN. This is the fix that recovers abandoning visitors and protects rankings.",
      when: "Next 2–3 weeks"
    });
  }
  if (has("thin-page") || has("crawler-site-thin") || has("weak-conversion") || has("crawler-no")) {
    steps.push({
      title: "Growth: content & conversion",
      text: "Build out service/location pages and clear calls-to-action so the recovered traffic turns into enquiries.",
      when: "This month"
    });
  }
  if (!steps.length) {
    steps.push({
      title: "Review findings together",
      text: "Walk through the issues above with us or your developer and agree the order of work.",
      when: "This week"
    });
  }
  while (steps.length < 3) {
    steps.push({
      title: "Measure & iterate",
      text: "Re-run this audit after the fixes and track enquiries, rankings and speed month over month.",
      when: "Ongoing"
    });
  }

  return steps
    .slice(0, 3)
    .map(
      (step, index) => `<div class="plan-step">
        <div class="plan-num">${index + 1}</div>
        <h4>${esc(step.title)}</h4>
        <p>${esc(step.text)}</p>
        <div class="plan-when">${esc(step.when)}</div>
      </div>`
    )
    .join("");
}

function footerHtml(brand: Branding, page: number): string {
  return `<div class="footer">
    <span>${esc(brand.name)} — confidential audit, prepared individually. Scores from Google PageSpeed Insights (official API).</span>
    <span>Page ${page} of 3</span>
  </div>`;
}

function displayUrl(url: string | null): string {
  if (!url) return "No website found";
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
