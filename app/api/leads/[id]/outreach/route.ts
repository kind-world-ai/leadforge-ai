import { NextResponse } from "next/server";
import { generateOutreach } from "@/lib/outreach";
import { getLead, replaceLead } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const outreach = generateOutreach(lead);
  const nextLead = await replaceLead({
    ...lead,
    outreach,
    status: lead.status === "New" || lead.status === "Qualified" ? "Drafted" : lead.status,
    nextAction: "Manually approve and send the best outreach draft",
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ lead: nextLead });
}
