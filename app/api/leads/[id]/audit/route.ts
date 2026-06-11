import { NextResponse } from "next/server";
import { auditWebsite } from "@/lib/audit";
import { getLead, replaceLead } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.website) {
    return NextResponse.json({ error: "Lead has no website to audit" }, { status: 400 });
  }

  const audit = await auditWebsite(lead.website);
  const nextLead = await replaceLead({
    ...lead,
    audit,
    status: lead.status === "New" ? "Qualified" : lead.status,
    nextAction: "Review audit and approve outreach draft",
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ lead: nextLead });
}
