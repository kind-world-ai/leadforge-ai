import { NextResponse } from "next/server";
import { auditWebsite } from "@/lib/audit";
import { getGooglePlaceDetails } from "@/lib/google-places";
import { getLead, replaceLead } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const current = await getLead(id);
  if (!current) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!current.googlePlaceId) {
    return NextResponse.json({ error: "This lead has no Google place ID to enrich" }, { status: 400 });
  }

  const body = (await safeJson(request)) as { autoAudit?: boolean };
  const serviceFocus = current.services[0] ?? "Website";

  try {
    const details = await getGooglePlaceDetails({
      placeId: current.googlePlaceId,
      city: current.city,
      country: current.country,
      sector: current.sector,
      serviceFocus
    });

    let lead = await replaceLead({
      ...current,
      businessName: details.businessName || current.businessName,
      website: details.website ?? current.website,
      sourceUrl: details.sourceUrl ?? current.sourceUrl,
      googlePlaceId: details.googlePlaceId ?? current.googlePlaceId,
      phone: details.phone ?? current.phone,
      services: current.services.length ? current.services : details.services ?? ["Website", "SEO"],
      notes: mergeNotes(current.notes, details.notes),
      tags: mergeUnique([...(current.tags ?? []), ...(details.tags ?? []), "places-enriched"]),
      nextAction: details.website
        ? "Audit website and identify decision maker"
        : "Verify business manually and pitch website plus local SEO",
      updatedAt: new Date().toISOString()
    });

    if (body.autoAudit && lead.website) {
      const audit = await auditWebsite(lead.website);
      lead = await replaceLead({
        ...lead,
        audit,
        status: lead.status === "New" ? "Qualified" : lead.status,
        nextAction: "Review audit and approve outreach draft"
      });
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google Places enrichment failed" },
      { status: 500 }
    );
  }
}

async function safeJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function mergeNotes(current: string, next?: string): string {
  return mergeUnique([current, next].filter(Boolean) as string[]).join("\n\n");
}

function mergeUnique<T extends string>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
