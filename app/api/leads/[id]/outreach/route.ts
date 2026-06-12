import { NextResponse } from "next/server";
import { aiOutreachAvailable, generateAiOutreach } from "@/lib/ai-outreach";
import { generateOutreach } from "@/lib/outreach";
import { getLead, replaceLead } from "@/lib/store";
import type { OutreachDraft } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  let outreach: OutreachDraft;
  let usedAi = false;
  let aiError: string | undefined;

  if (aiOutreachAvailable()) {
    try {
      outreach = await generateAiOutreach(lead);
      usedAi = true;
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI generation failed";
      outreach = generateOutreach(lead);
    }
  } else {
    outreach = generateOutreach(lead);
  }

  const nextLead = await replaceLead({
    ...lead,
    outreach,
    status: lead.status === "New" || lead.status === "Qualified" ? "Drafted" : lead.status,
    nextAction: "Manually approve and send the best outreach draft",
    updatedAt: new Date().toISOString()
  });

  return NextResponse.json({ lead: nextLead, usedAi, aiError });
}
