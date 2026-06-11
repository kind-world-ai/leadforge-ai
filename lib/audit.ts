import type { PainSignal, WebsiteAudit } from "@/lib/types";

export async function auditWebsite(rawUrl: string): Promise<WebsiteAudit> {
  const started = Date.now();
  const url = normalizeUrl(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 16000);

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "LeadForgeAI/0.1 (+local audit; human-approved outreach; website quality check)"
      }
    });
    const html = await response.text();
    const loadMs = Date.now() - started;
    const audit = buildAudit({
      url,
      resolvedUrl: response.url,
      status: response.status,
      statusText: response.statusText,
      loadMs,
      html
    });

    clearTimeout(timeout);
    return audit;
  } catch (error) {
    clearTimeout(timeout);
    const message = error instanceof Error ? error.message : "Unknown fetch failure";
    const problem: PainSignal = {
      id: "website-unreachable",
      severity: "high",
      category: "Website",
      title: "Website could not be reached",
      detail: "The site failed during the audit request.",
      evidence: message
    };

    return {
      url,
      resolvedUrl: url,
      checkedAt: new Date().toISOString(),
      status: 0,
      statusText: message,
      loadMs: Date.now() - started,
      htmlBytes: 0,
      title: "",
      description: "",
      h1Count: 0,
      imageCount: 0,
      linkCount: 0,
      hasViewport: false,
      hasSsl: url.startsWith("https://"),
      hasContactForm: false,
      hasPhone: false,
      hasEmail: false,
      hasSchema: false,
      hasAnalytics: false,
      technologies: [],
      problems: [problem],
      healthScore: 15
    };
  }
}

function buildAudit(input: {
  url: string;
  resolvedUrl: string;
  status: number;
  statusText: string;
  loadMs: number;
  html: string;
}): WebsiteAudit {
  const { html } = input;
  const lower = html.toLowerCase();
  const title = cleanText(extractTag(html, "title"));
  const description = cleanText(extractMeta(html, "description"));
  const h1Count = countMatches(lower, /<h1[\s>]/g);
  const imageCount = countMatches(lower, /<img[\s>]/g);
  const linkCount = countMatches(lower, /<a[\s>]/g);
  const hasViewport = lower.includes('name="viewport"') || lower.includes("name='viewport'");
  const hasSsl = input.resolvedUrl.startsWith("https://");
  const hasContactForm = lower.includes("<form") || lower.includes("contact us") || lower.includes("book now");
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(html);
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(html);
  const hasSchema = lower.includes("application/ld+json") || lower.includes("schema.org");
  const hasAnalytics =
    lower.includes("googletagmanager") ||
    lower.includes("google-analytics") ||
    lower.includes("gtag(") ||
    lower.includes("fbq(") ||
    lower.includes("clarity.ms");
  const technologies = detectTechnologies(lower);
  const problems = buildProblems({
    status: input.status,
    statusText: input.statusText,
    loadMs: input.loadMs,
    htmlBytes: Buffer.byteLength(html, "utf8"),
    title,
    description,
    h1Count,
    imageCount,
    hasViewport,
    hasSsl,
    hasContactForm,
    hasPhone,
    hasEmail,
    hasSchema,
    hasAnalytics,
    technologies
  });

  return {
    url: input.url,
    resolvedUrl: input.resolvedUrl,
    checkedAt: new Date().toISOString(),
    status: input.status,
    statusText: input.statusText,
    loadMs: input.loadMs,
    htmlBytes: Buffer.byteLength(html, "utf8"),
    title,
    description,
    h1Count,
    imageCount,
    linkCount,
    hasViewport,
    hasSsl,
    hasContactForm,
    hasPhone,
    hasEmail,
    hasSchema,
    hasAnalytics,
    technologies,
    problems,
    healthScore: calculateHealthScore(problems)
  };
}

function buildProblems(input: {
  status: number;
  statusText: string;
  loadMs: number;
  htmlBytes: number;
  title: string;
  description: string;
  h1Count: number;
  imageCount: number;
  hasViewport: boolean;
  hasSsl: boolean;
  hasContactForm: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasSchema: boolean;
  hasAnalytics: boolean;
  technologies: string[];
}): PainSignal[] {
  const problems: PainSignal[] = [];
  const add = (problem: PainSignal) => problems.push(problem);

  if (input.status < 200 || input.status >= 400) {
    add({
      id: "bad-status",
      severity: "high",
      category: "Website",
      title: "Website response is unhealthy",
      detail: "The page returned a non-success status during audit.",
      evidence: `${input.status} ${input.statusText}`
    });
  }

  if (!input.hasSsl) {
    add({
      id: "no-ssl",
      severity: "high",
      category: "Trust",
      title: "Website is not using HTTPS",
      detail: "Visitors may see trust warnings and conversions can suffer.",
      evidence: "Final audited URL is not HTTPS"
    });
  }

  if (!input.title || input.title.length < 20 || input.title.length > 70) {
    add({
      id: "weak-title",
      severity: "medium",
      category: "SEO",
      title: "Page title needs SEO work",
      detail: "The homepage title is missing, too short, or too long for a clear local search result.",
      evidence: input.title || "Missing title"
    });
  }

  if (!input.description || input.description.length < 60 || input.description.length > 170) {
    add({
      id: "weak-description",
      severity: "medium",
      category: "SEO",
      title: "Meta description is weak",
      detail: "Search results may not explain why a customer should click.",
      evidence: input.description || "Missing description"
    });
  }

  if (input.h1Count !== 1) {
    add({
      id: "h1-issue",
      severity: "medium",
      category: "SEO",
      title: "Homepage heading structure is unclear",
      detail: "A homepage should usually have one clear H1 that explains the business offer.",
      evidence: `${input.h1Count} H1 tags found`
    });
  }

  if (!input.hasViewport) {
    add({
      id: "no-viewport",
      severity: "high",
      category: "Website",
      title: "Mobile viewport is missing",
      detail: "The page may render poorly on phones.",
      evidence: "No viewport meta tag found"
    });
  }

  if (!input.hasContactForm && !input.hasPhone && !input.hasEmail) {
    add({
      id: "weak-conversion",
      severity: "high",
      category: "Contact",
      title: "No clear conversion path found",
      detail: "The audit could not find a form, phone number, or email on the page.",
      evidence: "No form, phone, or email detected"
    });
  }

  if (!input.hasSchema) {
    add({
      id: "no-schema",
      severity: "low",
      category: "SEO",
      title: "Structured data not detected",
      detail: "LocalBusiness or Organization schema can help search engines understand the business.",
      evidence: "No JSON-LD or schema.org markers"
    });
  }

  if (!input.hasAnalytics) {
    add({
      id: "no-analytics",
      severity: "medium",
      category: "Automation",
      title: "No analytics or tracking detected",
      detail: "The business may not know which pages or campaigns generate leads.",
      evidence: "No common analytics tags found"
    });
  }

  if (input.loadMs > 2500 || input.htmlBytes > 650000) {
    add({
      id: "slow-heavy-page",
      severity: input.loadMs > 4000 ? "high" : "medium",
      category: "Website",
      title: "Homepage may feel slow",
      detail: "The HTML request was slow or heavy before images and scripts are counted.",
      evidence: `${input.loadMs}ms, ${Math.round(input.htmlBytes / 1024)}KB HTML`
    });
  }

  if (input.technologies.includes("Wix") || input.technologies.includes("Squarespace")) {
    add({
      id: "builder-refresh",
      severity: "low",
      category: "Website",
      title: "Template builder site detected",
      detail: "A redesign or conversion cleanup pitch may be easier if the current site is template-heavy.",
      evidence: input.technologies.join(", ")
    });
  }

  return problems;
}

function calculateHealthScore(problems: PainSignal[]): number {
  const penalty = problems.reduce((total, problem) => {
    if (problem.severity === "high") return total + 18;
    if (problem.severity === "medium") return total + 10;
    return total + 5;
  }, 0);

  return Math.max(5, Math.min(100, 100 - penalty));
}

function detectTechnologies(html: string): string[] {
  const detections = [
    ["Shopify", ["cdn.shopify.com", "shopify-section", "myshopify"]],
    ["WordPress", ["wp-content", "wp-json", "wordpress"]],
    ["WooCommerce", ["woocommerce", "wc-block"]],
    ["Wix", ["wixstatic", "x-wix"]],
    ["Squarespace", ["squarespace", "static1.squarespace"]],
    ["Webflow", ["webflow", "wf-page"]],
    ["React", ["data-reactroot", "__next", "react-dom"]],
    ["Next.js", ["__next", "_next/static"]],
    ["jQuery", ["jquery"]],
    ["Bootstrap", ["bootstrap"]]
  ] as const;

  return detections
    .filter(([, markers]) => markers.some((marker) => html.includes(marker)))
    .map(([name]) => name);
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new Error("Website URL is required");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractTag(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match?.[1] ?? "";
}

function extractMeta(html: string, name: string): string {
  const regexes = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`, "i")
  ];

  for (const regex of regexes) {
    const match = html.match(regex);
    if (match?.[1]) return match[1];
  }

  return "";
}

function countMatches(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0;
}

function cleanText(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
