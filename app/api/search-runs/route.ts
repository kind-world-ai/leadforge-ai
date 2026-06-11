import { NextResponse } from "next/server";
import { createSearchRunPlan } from "@/lib/sources";
import { createSearchRun, listSearchRuns } from "@/lib/store";
import {
  leadSources,
  serviceOptions,
  type LeadSource,
  type ServiceFocus
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const searchRuns = await listSearchRuns();
  return NextResponse.json({ searchRuns });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    market?: string;
    country?: string;
    city?: string;
    sector?: string;
    serviceFocus?: ServiceFocus;
    sourceMix?: LeadSource[];
  };

  const country = body.country?.trim();
  const city = body.city?.trim();
  const sector = body.sector?.trim();

  if (!country || !city || !sector) {
    return NextResponse.json({ error: "Country, city, and sector are required" }, { status: 400 });
  }

  const serviceFocus = serviceOptions.includes(body.serviceFocus as ServiceFocus)
    ? (body.serviceFocus as ServiceFocus)
    : "Website";
  const sourceMix = body.sourceMix?.filter((source) => leadSources.includes(source));
  const run = createSearchRunPlan({
    market: body.market?.trim() || `${city}, ${country}`,
    country,
    city,
    sector,
    serviceFocus,
    sourceMix
  });

  const searchRun = await createSearchRun(run);
  return NextResponse.json({ searchRun }, { status: 201 });
}
