import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const EXCLUDED_PATTERNS =
  /(cloudflaressl|amazonaws|azurewebsites|herokuapp|netlify|vercel|github\.io|googleusercontent|wixsite|squarespace|shopifypreview|myshopify|webflow\.io|pages\.dev|workers\.dev|web\.app|firebaseapp)/i;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const days = Math.max(1, Math.min(Number(url.searchParams.get("days") ?? 30), 90));

  if (keyword.length < 3) {
    return NextResponse.json({ error: "Keyword must be at least 3 characters." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 40000);
  try {
    const response = await fetch(
      `https://crt.sh/?q=%25${encodeURIComponent(keyword)}%25&output=json&exclude=expired`,
      {
        signal: controller.signal,
        headers: { "user-agent": "LeadForgeAI/0.1 (local lead research; human-approved outreach)" }
      }
    );
    if (!response.ok) {
      throw new Error(
        `crt.sh returned ${response.status}. Broad keywords overload it — try a narrower keyword (e.g. a city or niche word) or retry in a minute.`
      );
    }
    const data = (await response.json()) as {
      common_name?: string;
      name_value?: string;
      not_before?: string;
    }[];

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const seen = new Map<string, string>();

    for (const cert of data) {
      const notBefore = cert.not_before ? new Date(cert.not_before).getTime() : 0;
      if (notBefore < cutoff) continue;
      const names = [cert.common_name ?? "", ...(cert.name_value ?? "").split("\n")];
      for (const raw of names) {
        const name = raw.trim().toLowerCase().replace(/^\*\./, "");
        if (!name || !name.includes(keyword)) continue;
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name)) continue;
        if (EXCLUDED_PATTERNS.test(name)) continue;
        // Keep registrable-looking domains only (drop deep subdomains).
        const parts = name.split(".");
        const domain = parts.length > 3 ? parts.slice(-3).join(".") : name;
        const existing = seen.get(domain);
        const firstSeen = cert.not_before ?? "";
        if (!existing || firstSeen < existing) seen.set(domain, firstSeen);
      }
    }

    const domains = Array.from(seen.entries())
      .map(([domain, firstSeen]) => ({ domain, firstSeen }))
      .sort((a, b) => (a.firstSeen < b.firstSeen ? 1 : -1))
      .slice(0, 50);

    return NextResponse.json({ domains, scanned: data.length, days });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "crt.sh timed out — it is a free public service, try again in a minute."
        : error instanceof Error
          ? error.message
          : "Domain watch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
