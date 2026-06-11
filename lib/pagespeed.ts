import type { PageSpeedMetrics, PageSpeedSnapshot, PainSignal } from "@/lib/types";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const PSI_TIMEOUT_MS = 70000;

type Strategy = "mobile" | "desktop";

export async function runPageSpeed(rawUrl: string): Promise<PageSpeedSnapshot> {
  const url = normalizeUrl(rawUrl);
  const [mobile, desktop] = await Promise.allSettled([
    runStrategy(url, "mobile"),
    runStrategy(url, "desktop")
  ]);

  const snapshot: PageSpeedSnapshot = {
    checkedAt: new Date().toISOString(),
    url,
    mobile: mobile.status === "fulfilled" ? mobile.value : null,
    desktop: desktop.status === "fulfilled" ? desktop.value : null
  };

  if (!snapshot.mobile && !snapshot.desktop) {
    const reason =
      mobile.status === "rejected" && mobile.reason instanceof Error
        ? mobile.reason.message
        : "PageSpeed request failed";
    snapshot.error = reason;
  }

  return snapshot;
}

async function runStrategy(url: string, strategy: Strategy): Promise<PageSpeedMetrics> {
  const params = new URLSearchParams({ url, strategy });
  for (const category of ["PERFORMANCE", "SEO", "BEST_PRACTICES", "ACCESSIBILITY"]) {
    params.append("category", category);
  }
  const key = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  if (key) params.set("key", key);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PSI_TIMEOUT_MS);

  try {
    const response = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });
    const data = (await response.json()) as {
      error?: { message?: string };
      lighthouseResult?: {
        categories?: Record<string, { score?: number | null }>;
        audits?: Record<string, { numericValue?: number | null }>;
      };
    };
    if (!response.ok) {
      throw new Error(data.error?.message || `PageSpeed ${strategy} failed (${response.status})`);
    }

    const categories = data.lighthouseResult?.categories ?? {};
    const audits = data.lighthouseResult?.audits ?? {};

    return {
      performance: toScore(categories.performance?.score),
      seo: toScore(categories.seo?.score),
      bestPractices: toScore(categories["best-practices"]?.score),
      accessibility: toScore(categories.accessibility?.score),
      fcpMs: toMs(audits["first-contentful-paint"]?.numericValue),
      lcpMs: toMs(audits["largest-contentful-paint"]?.numericValue),
      cls: toCls(audits["cumulative-layout-shift"]?.numericValue),
      tbtMs: toMs(audits["total-blocking-time"]?.numericValue),
      speedIndexMs: toMs(audits["speed-index"]?.numericValue)
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function pageSpeedSignals(snapshot: PageSpeedSnapshot): PainSignal[] {
  const signals: PainSignal[] = [];
  const mobile = snapshot.mobile;
  const desktop = snapshot.desktop;

  if (mobile?.performance != null) {
    if (mobile.performance < 50) {
      signals.push({
        id: "psi-mobile-slow",
        severity: "high",
        category: "Website",
        title: `Slow mobile experience (${mobile.performance}/100)`,
        detail:
          "Google PageSpeed rates the mobile experience as poor. Most local customers will land on mobile, so this directly costs enquiries.",
        evidence: psiEvidence(mobile)
      });
    } else if (mobile.performance < 75) {
      signals.push({
        id: "psi-mobile-mediocre",
        severity: "medium",
        category: "Website",
        title: `Mobile speed needs work (${mobile.performance}/100)`,
        detail: "PageSpeed shows room to improve mobile loading, which affects rankings and conversions.",
        evidence: psiEvidence(mobile)
      });
    }
    if (mobile.lcpMs != null && mobile.lcpMs > 4000) {
      signals.push({
        id: "psi-mobile-lcp",
        severity: "medium",
        category: "Website",
        title: "Main content loads too slowly on mobile",
        detail: "Largest Contentful Paint is above the 4s 'poor' threshold on mobile.",
        evidence: `LCP ${formatMs(mobile.lcpMs)} (target < 2.5s)`
      });
    }
  }

  if (desktop?.performance != null && desktop.performance < 60) {
    signals.push({
      id: "psi-desktop-slow",
      severity: "medium",
      category: "Website",
      title: `Slow desktop experience (${desktop.performance}/100)`,
      detail: "Desktop PageSpeed is below 60, suggesting heavy pages or unoptimized assets.",
      evidence: psiEvidence(desktop)
    });
  }

  const seo = mobile?.seo ?? desktop?.seo;
  if (seo != null && seo < 80) {
    signals.push({
      id: "psi-seo-issues",
      severity: "medium",
      category: "SEO",
      title: `Lighthouse SEO score is ${seo}/100`,
      detail: "Technical SEO basics (meta tags, crawlability, mobile friendliness) are incomplete.",
      evidence: "Google PageSpeed Lighthouse SEO category"
    });
  }

  const accessibility = mobile?.accessibility ?? desktop?.accessibility;
  if (accessibility != null && accessibility < 70) {
    signals.push({
      id: "psi-accessibility",
      severity: "low",
      category: "Website",
      title: `Accessibility score is ${accessibility}/100`,
      detail: "Accessibility gaps can lose customers and create compliance risk.",
      evidence: "Google PageSpeed Lighthouse accessibility category"
    });
  }

  return signals;
}

function psiEvidence(metrics: PageSpeedMetrics): string {
  const parts: string[] = [];
  if (metrics.lcpMs != null) parts.push(`LCP ${formatMs(metrics.lcpMs)}`);
  if (metrics.fcpMs != null) parts.push(`FCP ${formatMs(metrics.fcpMs)}`);
  if (metrics.tbtMs != null) parts.push(`TBT ${Math.round(metrics.tbtMs)}ms`);
  if (metrics.cls != null) parts.push(`CLS ${metrics.cls}`);
  return parts.join(" · ") || "Google PageSpeed Insights";
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function toScore(value?: number | null): number | null {
  return typeof value === "number" ? Math.round(value * 100) : null;
}

function toMs(value?: number | null): number | null {
  return typeof value === "number" ? Math.round(value) : null;
}

function toCls(value?: number | null): number | null {
  return typeof value === "number" ? Math.round(value * 1000) / 1000 : null;
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
