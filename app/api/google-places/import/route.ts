import { NextResponse } from "next/server";
import { auditWebsite } from "@/lib/audit";
import { searchGooglePlaces, type GooglePlacesImportMode } from "@/lib/google-places";
import { createLead, replaceLead } from "@/lib/store";
import { serviceOptions, type Lead, type ServiceFocus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    query?: string;
    city?: string;
    country?: string;
    sector?: string;
    serviceFocus?: ServiceFocus;
    mode?: GooglePlacesImportMode;
    limit?: number;
    onlyMissingWebsite?: boolean;
    autoAudit?: boolean;
  };

  const query = body.query?.trim();
  const city = body.city?.trim();
  const country = body.country?.trim();
  const sector = body.sector?.trim();

  if (!query || !city || !country || !sector) {
    return NextResponse.json(
      { error: "Query, city, country, and sector are required" },
      { status: 400 }
    );
  }

  const serviceFocus = serviceOptions.includes(body.serviceFocus as ServiceFocus)
    ? (body.serviceFocus as ServiceFocus)
    : "Website";
  const mode: GooglePlacesImportMode = body.mode === "enriched" ? "enriched" : "discovery";

  try {
    const result = await searchGooglePlaces({
      query,
      city,
      country,
      sector,
      serviceFocus,
      mode,
      limit: body.limit,
      onlyMissingWebsite: mode === "enriched" && Boolean(body.onlyMissingWebsite)
    });

    const imported: Lead[] = [];
    for (const input of result.leads) {
      let lead = await createLead(input);
      if (mode === "enriched" && body.autoAudit && lead.website) {
        const audit = await auditWebsite(lead.website);
        lead = await replaceLead({
          ...lead,
          audit,
          status: lead.status === "New" ? "Qualified" : lead.status,
          nextAction: "Review audit and approve outreach draft"
        });
      }
      imported.push(lead);
    }

    return NextResponse.json({
      query: result.query,
      mode: result.mode,
      rawCount: result.rawCount,
      importedCount: imported.length,
      leads: imported
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Google Places import failed" },
      { status: 500 }
    );
  }
}
