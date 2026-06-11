import { NextResponse } from "next/server";
import { auditWebsite } from "@/lib/audit";
import { pageSpeedSignals, runPageSpeed } from "@/lib/pagespeed";
import { getLead, replaceLead } from "@/lib/store";
import type { PainSignal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 150;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.website) {
    return NextResponse.json({ error: "Lead has no website to test" }, { status: 400 });
  }

  // Make sure there is a base audit to attach PageSpeed results to.
  const audit = lead.audit ?? (await auditWebsite(lead.website));

  const snapshot = await runPageSpeed(lead.website);
  if (snapshot.error && !snapshot.mobile && !snapshot.desktop) {
    return NextResponse.json({ error: snapshot.error }, { status: 502 });
  }

  const freshSignals = pageSpeedSignals(snapshot);
  const keptProblems: PainSignal[] = (audit.problems ?? []).filter(
    (problem) => !problem.id.startsWith("psi-")
  );

  const nextLead = await replaceLead({
    ...lead,
    audit: {
      ...audit,
      pagespeed: snapshot,
      problems: [...keptProblems, ...freshSignals]
    },
    status: lead.status === "New" ? "Qualified" : lead.status,
    nextAction: "Review audit and approve outreach draft",
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ lead: nextLead });
}
