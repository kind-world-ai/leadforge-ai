import { NextResponse } from "next/server";
import { enrichLeadFromWeb } from "@/lib/enrich";
import { getLead, replaceLead } from "@/lib/store";
import { searchProviderAvailable } from "@/lib/web-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!searchProviderAvailable()) {
    return NextResponse.json(
      {
        error:
          "No search API configured. Add BRAVE_SEARCH_API_KEY (free, brave.com/search/api) or GOOGLE_CSE_ID + GOOGLE_CSE_API_KEY to .env.local."
      },
      { status: 400 }
    );
  }

  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  try {
    const enrichment = await enrichLeadFromWeb(lead);

    const newSocials = enrichment.profiles.map((profile) => profile.url);
    const profileNote = enrichment.profiles.length
      ? `Web profiles found: ${enrichment.profiles
          .map((profile) => `${profile.platform} (${profile.url})`)
          .join(", ")}`
      : "";
    const snippetNote = enrichment.snippets.length
      ? `Search snippets:\n${enrichment.snippets.map((snippet) => `- ${snippet}`).join("\n")}`
      : "";
    const stamp = `Web enrichment ${new Date().toISOString().slice(0, 10)}`;

    const notes = [lead.notes, `${stamp}:`, profileNote, snippetNote]
      .filter(Boolean)
      .join("\n\n");

    const nextLead = await replaceLead({
      ...lead,
      website: lead.website || enrichment.website || null,
      socials: Array.from(new Set([...lead.socials, ...newSocials])),
      notes,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({
      lead: nextLead,
      foundWebsite: !lead.website && Boolean(enrichment.website),
      profileCount: enrichment.profiles.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Web enrichment failed" },
      { status: 502 }
    );
  }
}
