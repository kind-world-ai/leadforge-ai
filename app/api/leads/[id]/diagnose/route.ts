import { NextResponse } from "next/server";
import { auditWebsite } from "@/lib/audit";
import { isRemoteBackend } from "@/lib/backend";
import { crawlWebsite } from "@/lib/crawler";
import { generateOutreach } from "@/lib/outreach";
import { pageSpeedSignals, runPageSpeed } from "@/lib/pagespeed";
import { refreshLeadScore } from "@/lib/scoring";
import { enqueueCrawlJob, getLead, replaceLead } from "@/lib/store";
import type { Lead, PainSignal, WebsiteAudit } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * One-click pipeline: crawl (falls back to plain audit) → PageSpeed → rescore → outreach draft.
 * Partial failures are reported as warnings instead of failing the whole run.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { maxPages?: number };
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Shared online mode: heavy work goes to the crawler worker machine.
  if (isRemoteBackend()) {
    const jobId = await enqueueCrawlJob({
      leadId: lead.id,
      jobType: "diagnose",
      payload: { maxPages: body.maxPages ?? 5 }
    });
    return NextResponse.json({ queued: true, jobId, lead });
  }

  const warnings: string[] = [];
  let working: Lead = { ...lead };

  if (lead.website) {
    // 1. Crawl (includes the base audit). Fall back to the lightweight audit.
    let audit: WebsiteAudit | undefined;
    try {
      audit = await crawlWebsite(lead.website, { maxPages: body.maxPages ?? 5 });
    } catch (error) {
      warnings.push(
        `Crawler failed (${error instanceof Error ? error.message : "unknown"}); used basic audit instead.`
      );
      try {
        audit = await auditWebsite(lead.website);
      } catch {
        warnings.push("Basic audit also failed.");
      }
    }

    if (audit) {
      working = {
        ...working,
        audit,
        email: working.email || audit.discoveredEmails?.[0],
        phone: working.phone || audit.discoveredPhones?.[0],
        socials: Array.from(
          new Set([...working.socials, ...(audit.discoveredSocials ?? [])].filter(Boolean))
        )
      };
    }

    // 2. PageSpeed (mobile + desktop).
    try {
      const snapshot = await runPageSpeed(lead.website);
      if (snapshot.mobile || snapshot.desktop) {
        const freshSignals = pageSpeedSignals(snapshot);
        const baseAudit = working.audit;
        if (baseAudit) {
          const keptProblems: PainSignal[] = (baseAudit.problems ?? []).filter(
            (problem) => !problem.id.startsWith("psi-")
          );
          working = {
            ...working,
            audit: {
              ...baseAudit,
              pagespeed: snapshot,
              problems: [...keptProblems, ...freshSignals]
            }
          };
        }
      } else if (snapshot.error) {
        warnings.push(`PageSpeed failed: ${snapshot.error}`);
      }
    } catch (error) {
      warnings.push(
        `PageSpeed failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }

  // 3. Rescore with all fresh evidence, then draft outreach from it.
  working = refreshLeadScore(working);
  working = {
    ...working,
    outreach: generateOutreach(working),
    status:
      working.status === "New" || working.status === "Qualified" ? "Drafted" : working.status,
    nextAction: "Manually approve and send the best outreach draft",
    updatedAt: new Date().toISOString()
  };

  const nextLead = await replaceLead(working);
  return NextResponse.json({ lead: nextLead, warnings });
}
