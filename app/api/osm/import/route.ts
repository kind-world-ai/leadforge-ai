import { NextResponse } from "next/server";
import { searchOsmBusinesses } from "@/lib/osm";
import { importLeads } from "@/lib/store";
import type { LeadInput, ServiceFocus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    query?: string;
    city?: string;
    country?: string;
    sector?: string;
    serviceFocus?: ServiceFocus;
    limit?: number;
    onlyMissingWebsite?: boolean;
  };

  if (!body.query?.trim() || !body.city?.trim() || !body.country?.trim()) {
    return NextResponse.json(
      { error: "Query, city, and country are required." },
      { status: 400 }
    );
  }

  const limit = Math.max(1, Math.min(body.limit ?? 10, 40));

  try {
    const { businesses, rawCount } = await searchOsmBusinesses({
      query: body.query,
      city: body.city,
      country: body.country,
      limit
    });

    const filtered = (body.onlyMissingWebsite
      ? businesses.filter((business) => !business.website)
      : businesses
    ).slice(0, limit);

    const inputs: LeadInput[] = filtered.map((business) => ({
      businessName: business.name,
      website: business.website ?? null,
      city: body.city,
      country: body.country,
      sector: body.sector?.trim() || business.category || "Local service",
      source: "OpenStreetMap",
      sourceUrl: business.sourceUrl,
      phone: business.phone,
      email: business.email,
      services: body.serviceFocus ? [body.serviceFocus] : undefined,
      tags: ["osm-import"],
      notes: [
        business.address ? `Address: ${business.address}` : "",
        business.category ? `OSM category: ${business.category}` : "",
        "Data © OpenStreetMap contributors (ODbL)."
      ]
        .filter(Boolean)
        .join("\n")
    }));

    const created = await importLeads(inputs);
    return NextResponse.json({
      importedCount: created.length,
      rawCount,
      withoutWebsite: filtered.filter((business) => !business.website).length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "OSM import failed" },
      { status: 502 }
    );
  }
}
