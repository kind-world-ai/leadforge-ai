import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler";
import { getLead, replaceLead } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { maxPages?: number };
  const lead = await getLead(id);

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.website) {
    return NextResponse.json({ error: "Lead has no website to crawl" }, { status: 400 });
  }

  try {
    const audit = await crawlWebsite(lead.website, { maxPages: body.maxPages });
    const nextLead = await replaceLead({
      ...lead,
      audit,
      email: lead.email || audit.discoveredEmails?.[0],
      phone: lead.phone || audit.discoveredPhones?.[0],
      socials: mergeSocials(lead.socials, audit.discoveredSocials ?? []),
      status: lead.status === "New" ? "Qualified" : lead.status,
      nextAction: "Review crawler findings and approve outreach draft",
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ lead: nextLead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Crawler failed" },
      { status: 500 }
    );
  }
}

function mergeSocials(existing: string[], discovered: string[]): string[] {
  return Array.from(new Set([...existing, ...discovered].filter(Boolean)));
}
