import { chromium, type Browser, type Page } from "playwright";
import { auditWebsite } from "@/lib/audit";
import type { CrawlPageResult, PainSignal, WebsiteAudit } from "@/lib/types";

interface CrawlerOptions {
  maxPages?: number;
  timeoutMs?: number;
}

interface PageSnapshot {
  title: string;
  h1Count: number;
  forms: number;
  ctaCount: number;
  text: string;
  emails: string[];
  phones: string[];
  socialLinks: string[];
  internalLinks: string[];
  copyrightYears: number[];
}

export async function crawlWebsite(
  rawUrl: string,
  options: CrawlerOptions = {}
): Promise<WebsiteAudit> {
  const baseAudit = await auditWebsite(rawUrl);
  const maxPages = Math.max(1, Math.min(options.maxPages ?? 5, 10));
  const timeoutMs = Math.max(5000, Math.min(options.timeoutMs ?? 18000, 45000));
  const startUrl = normalizeUrl(baseAudit.resolvedUrl || rawUrl);
  const origin = new URL(startUrl).origin;
  const queue = [startUrl];
  const visited = new Set<string>();
  const pages: CrawlPageResult[] = [];

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1366, height: 900 },
      userAgent:
        "LeadForgeAI/0.1 (+local Playwright crawler; human-approved outreach research)"
    });

    while (queue.length && pages.length < maxPages) {
      const url = queue.shift();
      if (!url || visited.has(url)) continue;
      visited.add(url);

      const result = await crawlPage(page, url, origin, timeoutMs);
      pages.push(result);

      const nextLinks = rankLinks(result.internalLinks, origin).filter((link) => !visited.has(link));
      for (const link of nextLinks) {
        if (queue.length + pages.length >= maxPages) break;
        if (!queue.includes(link)) queue.push(link);
      }
    }
  } finally {
    await browser?.close();
  }

  const mergedProblems = mergeProblems(baseAudit.problems, buildCrawlerProblems(pages));
  const extraPenalty = mergedProblems.length - baseAudit.problems.length;

  return {
    ...baseAudit,
    checkedAt: new Date().toISOString(),
    problems: mergedProblems,
    healthScore: Math.max(5, baseAudit.healthScore - extraPenalty * 4),
    crawlPages: pages,
    crawlerSummary: summarizeCrawl(pages),
    discoveredEmails: unique(pages.flatMap((page) => page.emails)),
    discoveredPhones: unique(pages.flatMap((page) => page.phones)),
    discoveredSocials: unique(pages.flatMap((page) => page.socialLinks))
  };
}

async function crawlPage(
  page: Page,
  url: string,
  origin: string,
  timeoutMs: number
): Promise<CrawlPageResult> {
  const started = Date.now();
  let status = 0;

  try {
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs
    });
    status = response?.status() ?? 0;
    await page.waitForLoadState("load", { timeout: 5000 }).catch(() => undefined);
  } catch {
    // The page-level result still records the URL so the lead keeps evidence.
  }

  const snapshot = await pageSnapshot(page, origin).catch<PageSnapshot>(() => ({
    title: "",
    h1Count: 0,
    forms: 0,
    ctaCount: 0,
    text: "",
    emails: [],
    phones: [],
    socialLinks: [],
    internalLinks: [],
    copyrightYears: []
  }));

  const wordCount = countWords(snapshot.text);
  const problems: PainSignal[] = [];

  if (status >= 400 || status === 0) {
    problems.push({
      id: `crawl-status-${status}-${slug(url)}`,
      severity: "high",
      category: "Website",
      title: "Crawler found an unreachable page",
      detail: "A key website page did not return a healthy browser response.",
      evidence: `${status || "No status"} at ${url}`
    });
  }

  if (wordCount < 150) {
    problems.push({
      id: `thin-page-${slug(url)}`,
      severity: "low",
      category: "SEO",
      title: "Thin page content",
      detail: "The page has very little visible copy for search engines or visitors.",
      evidence: `${wordCount} words at ${url}`
    });
  }

  if (snapshot.h1Count !== 1) {
    problems.push({
      id: `crawl-h1-${slug(url)}`,
      severity: "low",
      category: "SEO",
      title: "Crawler found unclear page heading",
      detail: "This page does not have exactly one clear H1.",
      evidence: `${snapshot.h1Count} H1 tags at ${url}`
    });
  }

  return {
    url,
    title: snapshot.title,
    status,
    loadMs: Date.now() - started,
    wordCount,
    h1Count: snapshot.h1Count,
    forms: snapshot.forms,
    ctaCount: snapshot.ctaCount,
    emails: snapshot.emails,
    phones: snapshot.phones,
    socialLinks: snapshot.socialLinks,
    internalLinks: snapshot.internalLinks,
    problems
  };
}

async function pageSnapshot(page: Page, origin: string): Promise<PageSnapshot> {
  return page.evaluate((pageOrigin) => {
    const text = document.body?.innerText || "";
    const title = document.title || "";
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
    const internalLinks: string[] = [];
    const socialLinks: string[] = [];
    const socialHosts = ["facebook.com", "instagram.com", "linkedin.com", "youtube.com", "x.com"];

    for (const anchor of anchors) {
      try {
        const url = new URL(anchor.href, location.href);
        url.hash = "";
        const normalized = url.toString().replace(/\/$/, "");
        if (url.origin === pageOrigin) internalLinks.push(normalized);
        if (socialHosts.some((host) => url.hostname.includes(host))) socialLinks.push(normalized);
      } catch {
        // Ignore malformed hrefs.
      }
    }

    const emailMatches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
    const phoneMatches = text.match(/(?:\+?\d[\d\s().-]{8,}\d)/g) || [];
    const ctaWords = [
      "contact",
      "call",
      "book",
      "schedule",
      "quote",
      "consultation",
      "appointment",
      "enquire",
      "inquire"
    ];
    const ctaCount = anchors.filter((anchor) =>
      ctaWords.some((word) => (anchor.innerText || anchor.getAttribute("aria-label") || "").toLowerCase().includes(word))
    ).length;
    const copyrightYears = Array.from(text.matchAll(/(?:copyright|©)\s*(20\d{2})/gi))
      .map((match) => Number(match[1]))
      .filter(Boolean);

    return {
      title,
      h1Count: document.querySelectorAll("h1").length,
      forms: document.querySelectorAll("form").length,
      ctaCount,
      text,
      emails: Array.from(new Set(emailMatches)).slice(0, 12),
      phones: Array.from(new Set(phoneMatches.map((phone) => phone.trim()))).slice(0, 12),
      socialLinks: Array.from(new Set(socialLinks)).slice(0, 20),
      internalLinks: Array.from(new Set(internalLinks)).slice(0, 80),
      copyrightYears
    };
  }, origin);
}

function buildCrawlerProblems(pages: CrawlPageResult[]): PainSignal[] {
  const problems = pages.flatMap((page) => page.problems);
  const allTextPages = pages.length;
  const hasContactPage = pages.some((page) => /contact|appointment|book|quote/i.test(page.url));
  const hasForm = pages.some((page) => page.forms > 0);
  const hasCta = pages.some((page) => page.ctaCount > 0);
  const hasEmailOrPhone = pages.some((page) => page.emails.length || page.phones.length);
  const hasSocial = pages.some((page) => page.socialLinks.length);
  const totalWords = pages.reduce((total, page) => total + page.wordCount, 0);

  if (!hasContactPage && !hasForm && !hasEmailOrPhone) {
    problems.push({
      id: "crawler-no-contact-path",
      severity: "high",
      category: "Contact",
      title: "Crawler found no strong contact path",
      detail: "Across crawled pages, no contact page, form, email, or phone was found.",
      evidence: `${allTextPages} page${allTextPages === 1 ? "" : "s"} crawled`
    });
  }

  if (!hasCta) {
    problems.push({
      id: "crawler-no-cta",
      severity: "medium",
      category: "Contact",
      title: "No visible call to action found",
      detail: "The crawler did not find common CTA language such as book, call, quote, or appointment.",
      evidence: `${allTextPages} page${allTextPages === 1 ? "" : "s"} crawled`
    });
  }

  if (totalWords < 700 && pages.length >= 3) {
    problems.push({
      id: "crawler-site-thin-content",
      severity: "medium",
      category: "SEO",
      title: "Website content looks thin",
      detail: "The crawled pages have low total visible content, which can weaken SEO and trust.",
      evidence: `${totalWords} total words across ${pages.length} pages`
    });
  }

  if (!hasSocial) {
    problems.push({
      id: "crawler-no-social-proof",
      severity: "low",
      category: "Trust",
      title: "No social proof links found",
      detail: "The crawler did not find common social profile links on crawled pages.",
      evidence: `${allTextPages} page${allTextPages === 1 ? "" : "s"} crawled`
    });
  }

  return problems;
}

function rankLinks(links: string[], origin: string): string[] {
  const keywords = ["contact", "appointment", "book", "quote", "service", "about", "pricing", "shop"];
  return unique(
    links.filter((link) => {
      try {
        const url = new URL(link);
        return url.origin === origin && !/\.(pdf|jpg|jpeg|png|webp|gif|zip)$/i.test(url.pathname);
      } catch {
        return false;
      }
    })
  ).sort((a, b) => scoreLink(b, keywords) - scoreLink(a, keywords));
}

function scoreLink(link: string, keywords: string[]) {
  const lower = link.toLowerCase();
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 10 : 0), 0);
}

function summarizeCrawl(pages: CrawlPageResult[]): string {
  const pageCount = pages.length;
  const forms = pages.reduce((total, page) => total + page.forms, 0);
  const ctas = pages.reduce((total, page) => total + page.ctaCount, 0);
  const emails = unique(pages.flatMap((page) => page.emails)).length;
  const phones = unique(pages.flatMap((page) => page.phones)).length;
  return `Crawled ${pageCount} page${pageCount === 1 ? "" : "s"}; found ${forms} form${forms === 1 ? "" : "s"}, ${ctas} CTA link${ctas === 1 ? "" : "s"}, ${emails} email${emails === 1 ? "" : "s"}, and ${phones} phone number${phones === 1 ? "" : "s"}.`;
}

function mergeProblems(existing: PainSignal[], next: PainSignal[]): PainSignal[] {
  const seen = new Set<string>();
  return [...existing, ...next].filter((problem) => {
    const key = `${problem.category}:${problem.title}:${problem.evidence ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeUrl(rawUrl: string): string {
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `https://${rawUrl}`;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
}
