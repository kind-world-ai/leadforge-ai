/**
 * LeadForge crawler worker.
 *
 * Runs on ONE machine (the only one that needs Playwright). Polls the
 * crawl_jobs table in Supabase, executes heavy work (crawl → PageSpeed →
 * rescore → outreach draft), writes results back to the shared database.
 *
 * Run with:  npm run worker
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { auditWebsite } from "@/lib/audit";
import { crawlWebsite } from "@/lib/crawler";
import { generateOutreach } from "@/lib/outreach";
import { pageSpeedSignals, runPageSpeed } from "@/lib/pagespeed";
import { refreshLeadScore } from "@/lib/scoring";
import { leadToPgRow, pgRowToLead } from "@/lib/stores/pg-mapping";
import type { Lead, PainSignal, WebsiteAudit } from "@/lib/types";

const POLL_MS = 5000;

function db(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

type JobRow = {
  id: string;
  team_id: string;
  lead_id: string | null;
  job_type: "diagnose" | "crawl" | "audit" | "pagespeed";
  payload: Record<string, unknown>;
};

async function claimJob(client: SupabaseClient): Promise<JobRow | null> {
  const { data: candidates } = await client
    .from("crawl_jobs")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);
  const candidate = candidates?.[0];
  if (!candidate) return null;

  // Claim atomically: only wins if still pending.
  const { data: claimed } = await client
    .from("crawl_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", candidate.id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();
  return (claimed as JobRow | null) ?? null;
}

async function loadLead(client: SupabaseClient, leadId: string): Promise<Lead | null> {
  const { data } = await client.from("leads").select("*").eq("id", leadId).maybeSingle();
  return data ? pgRowToLead(data) : null;
}

async function saveLead(client: SupabaseClient, lead: Lead, teamId: string): Promise<void> {
  const { scoreBreakdown: _ignored, ...persistable } = lead;
  const { error } = await client
    .from("leads")
    .upsert(leadToPgRow(persistable as Lead, teamId), { onConflict: "id" });
  if (error) throw new Error(error.message);
}

async function runDiagnose(lead: Lead, maxPages: number): Promise<{ lead: Lead; warnings: string[] }> {
  const warnings: string[] = [];
  let working: Lead = { ...lead };

  if (lead.website) {
    let audit: WebsiteAudit | undefined;
    try {
      audit = await crawlWebsite(lead.website, { maxPages });
    } catch (error) {
      warnings.push(`crawler failed: ${error instanceof Error ? error.message : "unknown"}`);
      try {
        audit = await auditWebsite(lead.website);
      } catch {
        warnings.push("basic audit also failed");
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

    try {
      const snapshot = await runPageSpeed(lead.website);
      if ((snapshot.mobile || snapshot.desktop) && working.audit) {
        const kept: PainSignal[] = (working.audit.problems ?? []).filter(
          (problem) => !problem.id.startsWith("psi-")
        );
        working = {
          ...working,
          audit: {
            ...working.audit,
            pagespeed: snapshot,
            problems: [...kept, ...pageSpeedSignals(snapshot)]
          }
        };
      } else if (snapshot.error) {
        warnings.push(`pagespeed: ${snapshot.error}`);
      }
    } catch (error) {
      warnings.push(`pagespeed: ${error instanceof Error ? error.message : "failed"}`);
    }
  }

  working = refreshLeadScore(working);
  working = {
    ...working,
    outreach: generateOutreach(working),
    status: working.status === "New" || working.status === "Qualified" ? "Drafted" : working.status,
    nextAction: "Manually approve and send the best outreach draft",
    updatedAt: new Date().toISOString()
  };
  return { lead: working, warnings };
}

async function handleJob(client: SupabaseClient, job: JobRow): Promise<string> {
  if (!job.lead_id) throw new Error("Job has no lead_id");
  const lead = await loadLead(client, job.lead_id);
  if (!lead) throw new Error(`Lead ${job.lead_id} not found`);
  if (!lead.website && job.job_type !== "diagnose") {
    throw new Error("Lead has no website");
  }

  const maxPages = Number(job.payload?.maxPages ?? 5);

  if (job.job_type === "diagnose") {
    const { lead: updated, warnings } = await runDiagnose(lead, maxPages);
    await saveLead(client, updated, job.team_id);
    return warnings.length ? `done with warnings: ${warnings.join("; ")}` : "done";
  }

  if (job.job_type === "crawl") {
    const audit = await crawlWebsite(lead.website!, { maxPages });
    const updated = refreshLeadScore({
      ...lead,
      audit,
      email: lead.email || audit.discoveredEmails?.[0],
      phone: lead.phone || audit.discoveredPhones?.[0],
      status: lead.status === "New" ? "Qualified" : lead.status,
      updatedAt: new Date().toISOString()
    });
    await saveLead(client, updated, job.team_id);
    return "done";
  }

  if (job.job_type === "audit") {
    const audit = await auditWebsite(lead.website!);
    const updated = refreshLeadScore({
      ...lead,
      audit: lead.audit ? { ...lead.audit, ...audit, pagespeed: lead.audit.pagespeed } : audit,
      status: lead.status === "New" ? "Qualified" : lead.status,
      updatedAt: new Date().toISOString()
    });
    await saveLead(client, updated, job.team_id);
    return "done";
  }

  // pagespeed
  const baseAudit = lead.audit ?? (await auditWebsite(lead.website!));
  const snapshot = await runPageSpeed(lead.website!);
  if (!snapshot.mobile && !snapshot.desktop) {
    throw new Error(snapshot.error || "PageSpeed returned no results");
  }
  const kept = (baseAudit.problems ?? []).filter((problem) => !problem.id.startsWith("psi-"));
  const updated = refreshLeadScore({
    ...lead,
    audit: { ...baseAudit, pagespeed: snapshot, problems: [...kept, ...pageSpeedSignals(snapshot)] },
    updatedAt: new Date().toISOString()
  });
  await saveLead(client, updated, job.team_id);
  return "done";
}

async function main() {
  const client = db();
  console.log("LeadForge worker started. Polling crawl_jobs every", POLL_MS / 1000, "s…");

  for (;;) {
    try {
      const job = await claimJob(client);
      if (!job) {
        await sleep(POLL_MS);
        continue;
      }
      console.log(`[job ${job.id}] ${job.job_type} for lead ${job.lead_id} — running…`);
      try {
        const result = await handleJob(client, job);
        await client
          .from("crawl_jobs")
          .update({ status: "done", error: null, finished_at: new Date().toISOString() })
          .eq("id", job.id);
        console.log(`[job ${job.id}] ${result}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        await client
          .from("crawl_jobs")
          .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
          .eq("id", job.id);
        console.error(`[job ${job.id}] FAILED: ${message}`);
      }
    } catch (error) {
      console.error("Worker loop error:", error instanceof Error ? error.message : error);
      await sleep(POLL_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main();
