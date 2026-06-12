import type { Lead } from "@/lib/types";
import { webSearch, type WebResult } from "@/lib/web-search";

export interface WebEnrichment {
  website?: string;
  profiles: { platform: string; url: string; title: string }[];
  snippets: string[];
  queriesUsed: number;
}

const PROFILE_PLATFORMS: { platform: string; hosts: string[] }[] = [
  { platform: "LinkedIn", hosts: ["linkedin.com"] },
  { platform: "Clutch", hosts: ["clutch.co"] },
  { platform: "Facebook", hosts: ["facebook.com"] },
  { platform: "Instagram", hosts: ["instagram.com"] },
  { platform: "Justdial", hosts: ["justdial.com"] },
  { platform: "IndiaMART", hosts: ["indiamart.com"] },
  { platform: "GoodFirms", hosts: ["goodfirms.co"] },
  { platform: "Yelp", hosts: ["yelp.com"] },
  { platform: "X/Twitter", hosts: ["twitter.com", "x.com"] },
  { platform: "YouTube", hosts: ["youtube.com"] }
];

const NON_WEBSITE_HOSTS = [
  ...PROFILE_PLATFORMS.flatMap((item) => item.hosts),
  "google.",
  "wikipedia.org",
  "yellowpages",
  "sulekha.com",
  "tripadvisor",
  "glassdoor",
  "ambitionbox",
  "crunchbase.com",
  "apple.com/app",
  "play.google.com"
];

/**
 * Find the lead's web footprint via official search APIs:
 * profile pages (LinkedIn, Clutch, FB, …), the website if missing, and snippets.
 * Uses 2 search queries per lead to stay inside free quotas.
 */
export async function enrichLeadFromWeb(lead: Lead): Promise<WebEnrichment> {
  const cityPart = lead.city && lead.city !== "Unknown city" ? ` ${lead.city}` : "";
  const name = lead.businessName.trim();

  const generalQuery = `"${name}"${cityPart}`;
  const profileQuery = `"${name}" (site:linkedin.com OR site:clutch.co OR site:facebook.com OR site:instagram.com OR site:justdial.com OR site:goodfirms.co)`;

  const [general, profileResults] = await Promise.allSettled([
    webSearch(generalQuery, 10),
    webSearch(profileQuery, 10)
  ]);

  const results: WebResult[] = [
    ...(general.status === "fulfilled" ? general.value : []),
    ...(profileResults.status === "fulfilled" ? profileResults.value : [])
  ];
  if (general.status === "rejected" && profileResults.status === "rejected") {
    throw general.reason instanceof Error ? general.reason : new Error("Web search failed");
  }

  const profiles: WebEnrichment["profiles"] = [];
  const seenUrls = new Set<string>();
  let website: string | undefined;

  for (const result of results) {
    const url = result.url.replace(/[#?].*$/, "");
    if (seenUrls.has(url)) continue;
    seenUrls.add(url);

    const host = safeHost(url);
    if (!host) continue;

    const platform = PROFILE_PLATFORMS.find((item) =>
      item.hosts.some((candidate) => host.includes(candidate))
    );
    if (platform) {
      // Keep only the first (best-ranked) profile per platform.
      if (!profiles.some((item) => item.platform === platform.platform)) {
        profiles.push({ platform: platform.platform, url, title: result.title });
      }
      continue;
    }

    if (!website && !lead.website && looksLikeOwnSite(host, name)) {
      website = url;
    }
  }

  const snippets = results
    .filter((result) => relevantSnippet(result, name))
    .slice(0, 3)
    .map((result) => `${result.title}: ${result.snippet}`.slice(0, 220));

  return { website, profiles, snippets, queriesUsed: 2 };
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function looksLikeOwnSite(host: string, businessName: string): boolean {
  if (NON_WEBSITE_HOSTS.some((blocked) => host.includes(blocked))) return false;
  const compact = businessName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const hostCompact = host.replace(/[^a-z0-9]/g, "");
  if (compact.length >= 5 && hostCompact.includes(compact.slice(0, Math.min(compact.length, 12)))) {
    return true;
  }
  // Accept first non-directory result only when the name strongly matches.
  return false;
}

function relevantSnippet(result: WebResult, name: string): boolean {
  const lower = `${result.title} ${result.snippet}`.toLowerCase();
  return lower.includes(name.toLowerCase().slice(0, Math.min(name.length, 12)));
}
