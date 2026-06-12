import { randomUUID } from "crypto";
import type { Lead, LeadInput, SearchRun } from "@/lib/types";
import { leadFromInput, refreshLeadScore } from "@/lib/scoring";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentTeamId, getCurrentUserId } from "@/lib/supabase/server";
import {
  leadToPgRow,
  pgRowToLead,
  pgRowToSearchRun,
  searchRunToPgRow
} from "@/lib/stores/pg-mapping";

export async function listLeads(): Promise<Lead[]> {
  const teamId = await getCurrentTeamId();
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("team_id", teamId)
    .order("score", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(pgRowToLead).map(refreshLeadScore);
}

export async function getLead(id: string): Promise<Lead | null> {
  const teamId = await getCurrentTeamId();
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("team_id", teamId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? refreshLeadScore(pgRowToLead(data)) : null;
}

export async function createLead(input: LeadInput): Promise<Lead> {
  const lead = leadFromInput(input, randomUUID());
  return upsertLead(lead);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  const current = await getLead(id);
  if (!current) return null;

  const nextLead = refreshLeadScore({
    ...current,
    ...patch,
    id,
    updatedAt: new Date().toISOString()
  });
  await saveLead(nextLead);
  return nextLead;
}

export async function deleteLead(id: string): Promise<boolean> {
  const teamId = await getCurrentTeamId();
  const { error, count } = await supabaseAdmin()
    .from("leads")
    .delete({ count: "exact" })
    .eq("team_id", teamId)
    .eq("id", id);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function listSearchRuns(): Promise<SearchRun[]> {
  const teamId = await getCurrentTeamId();
  const { data, error } = await supabaseAdmin()
    .from("search_runs")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(pgRowToSearchRun);
}

export async function createSearchRun(run: SearchRun): Promise<SearchRun> {
  const teamId = await getCurrentTeamId();
  const { error } = await supabaseAdmin()
    .from("search_runs")
    .insert(searchRunToPgRow(run, teamId));
  if (error) throw new Error(error.message);
  return run;
}

export async function importLeads(leads: LeadInput[]): Promise<Lead[]> {
  const created: Lead[] = [];
  for (const input of leads) {
    created.push(await upsertLead(leadFromInput(input, randomUUID())));
  }
  return created;
}

export async function replaceLead(nextLead: Lead): Promise<Lead> {
  const refreshed = refreshLeadScore(nextLead);
  return upsertLead(refreshed);
}

export async function findLeadByWebsite(website: string): Promise<Lead | null> {
  const normalized = normalizeWebsiteKey(website);
  if (!normalized) return null;
  const teamId = await getCurrentTeamId();
  const { data, error } = await supabaseAdmin()
    .from("leads")
    .select("*")
    .eq("team_id", teamId)
    .not("website", "is", null);
  if (error) throw new Error(error.message);
  const row = (data ?? []).find(
    (item) => normalizeWebsiteKey(String(item.website ?? "")) === normalized
  );
  return row ? refreshLeadScore(pgRowToLead(row)) : null;
}

/** Insert a job for the crawler worker. */
export async function enqueueCrawlJob(input: {
  leadId: string;
  jobType: "diagnose" | "crawl" | "audit" | "pagespeed";
  payload?: Record<string, unknown>;
}): Promise<string> {
  const teamId = await getCurrentTeamId();
  const userId = await getCurrentUserId();
  const { data, error } = await supabaseAdmin()
    .from("crawl_jobs")
    .insert({
      team_id: teamId,
      lead_id: input.leadId,
      job_type: input.jobType,
      payload: input.payload ?? {},
      created_by: userId
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

async function upsertLead(lead: Lead): Promise<Lead> {
  const teamId = await getCurrentTeamId();
  const existing = await findExistingLead(lead, teamId);
  const leadToSave = existing
    ? refreshLeadScore({
        ...existing,
        ...lead,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString()
      })
    : lead;
  await saveLead(leadToSave, teamId);
  return leadToSave;
}

async function saveLead(lead: Lead, knownTeamId?: string): Promise<void> {
  const teamId = knownTeamId ?? (await getCurrentTeamId());
  // Strip derived fields not stored in the database.
  const { scoreBreakdown: _ignored, ...persistable } = lead;
  const { error } = await supabaseAdmin()
    .from("leads")
    .upsert(leadToPgRow(persistable as Lead, teamId), { onConflict: "id" });
  if (error) throw new Error(error.message);
}

async function findExistingLead(lead: Lead, teamId: string): Promise<Lead | null> {
  if (lead.googlePlaceId) {
    const { data } = await supabaseAdmin()
      .from("leads")
      .select("*")
      .eq("team_id", teamId)
      .eq("google_place_id", lead.googlePlaceId)
      .neq("id", lead.id)
      .maybeSingle();
    if (data) return pgRowToLead(data);
  }
  if (lead.website) {
    const { data } = await supabaseAdmin()
      .from("leads")
      .select("*")
      .eq("team_id", teamId)
      .eq("website", lead.website)
      .neq("id", lead.id)
      .maybeSingle();
    if (data) return pgRowToLead(data);
  }
  return null;
}

function normalizeWebsiteKey(value: string): string {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}
