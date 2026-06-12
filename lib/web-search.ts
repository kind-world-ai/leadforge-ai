/**
 * Web search via OFFICIAL APIs only (no SERP scraping — that violates Google ToS).
 * Providers, picked automatically by which keys exist in .env.local:
 * - Brave Search API  (BRAVE_SEARCH_API_KEY)            — free 2k queries/month
 * - Google Programmable Search (GOOGLE_CSE_ID + GOOGLE_CSE_API_KEY) — 100/day free
 */

export interface WebResult {
  title: string;
  url: string;
  snippet: string;
}

export function searchProviderAvailable(): "brave" | "google" | null {
  if (process.env.BRAVE_SEARCH_API_KEY) return "brave";
  if (process.env.GOOGLE_CSE_ID && (process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_PLACES_API_KEY)) {
    return "google";
  }
  return null;
}

export async function webSearch(query: string, count = 10): Promise<WebResult[]> {
  const provider = searchProviderAvailable();
  if (provider === "brave") return braveSearch(query, count);
  if (provider === "google") return googleCseSearch(query, count);
  throw new Error(
    "No search API configured. Add BRAVE_SEARCH_API_KEY (free at brave.com/search/api) or GOOGLE_CSE_ID + GOOGLE_CSE_API_KEY to .env.local."
  );
}

async function braveSearch(query: string, count: number): Promise<WebResult[]> {
  const params = new URLSearchParams({ q: query, count: String(Math.min(count, 20)) });
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      accept: "application/json",
      "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY!
    }
  });
  if (!response.ok) {
    throw new Error(`Brave Search error ${response.status} — check BRAVE_SEARCH_API_KEY / quota.`);
  }
  const data = (await response.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] };
  };
  return (data.web?.results ?? [])
    .filter((item) => item.url)
    .map((item) => ({
      title: item.title ?? "",
      url: item.url!,
      snippet: item.description ?? ""
    }));
}

async function googleCseSearch(query: string, count: number): Promise<WebResult[]> {
  const params = new URLSearchParams({
    key: process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_PLACES_API_KEY!,
    cx: process.env.GOOGLE_CSE_ID!,
    q: query,
    num: String(Math.min(count, 10))
  });
  const response = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  const data = (await response.json()) as {
    error?: { message?: string };
    items?: { title?: string; link?: string; snippet?: string }[];
  };
  if (!response.ok) {
    throw new Error(data.error?.message || `Google CSE error ${response.status}`);
  }
  return (data.items ?? [])
    .filter((item) => item.link)
    .map((item) => ({
      title: item.title ?? "",
      url: item.link!,
      snippet: item.snippet ?? ""
    }));
}
