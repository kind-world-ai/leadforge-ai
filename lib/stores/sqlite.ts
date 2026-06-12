import { randomUUID } from "crypto";
import type { Lead, LeadInput, SearchRun } from "@/lib/types";
import { leadFromInput, refreshLeadScore } from "@/lib/scoring";
import { getDb, leadToRow, rowToLead, rowToSearchRun, searchRunToRow } from "@/lib/sqlite";

const leadColumns = `
  id, business_name, website, city, country, sector, source, source_url,
  google_place_id, decision_maker, email, phone, socials_json, services_json, status, score,
  fit_reason, pain_signals_json, audit_json, outreach_json, next_action,
  last_contacted_at, next_follow_up_at, notes, tags_json, created_at, updated_at
`;

const leadValueParams = `
  @id, @business_name, @website, @city, @country, @sector, @source, @source_url,
  @google_place_id, @decision_maker, @email, @phone, @socials_json, @services_json, @status, @score,
  @fit_reason, @pain_signals_json, @audit_json, @outreach_json, @next_action,
  @last_contacted_at, @next_follow_up_at, @notes, @tags_json, @created_at, @updated_at
`;

const updateAssignments = `
  business_name = @business_name,
  website = @website,
  city = @city,
  country = @country,
  sector = @sector,
  source = @source,
  source_url = @source_url,
  google_place_id = @google_place_id,
  decision_maker = @decision_maker,
  email = @email,
  phone = @phone,
  socials_json = @socials_json,
  services_json = @services_json,
  status = @status,
  score = @score,
  fit_reason = @fit_reason,
  pain_signals_json = @pain_signals_json,
  audit_json = @audit_json,
  outreach_json = @outreach_json,
  next_action = @next_action,
  last_contacted_at = @last_contacted_at,
  next_follow_up_at = @next_follow_up_at,
  notes = @notes,
  tags_json = @tags_json,
  created_at = @created_at,
  updated_at = @updated_at
`;

export async function listLeads(): Promise<Lead[]> {
  const rows = getDb()
    .prepare("SELECT * FROM leads ORDER BY score DESC, updated_at DESC")
    .all() as Record<string, unknown>[];

  return rows.map(rowToLead).map(refreshLeadScore);
}

export async function getLead(id: string): Promise<Lead | null> {
  const row = getDb().prepare("SELECT * FROM leads WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? refreshLeadScore(rowToLead(row)) : null;
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

  upsertLead(nextLead);
  return nextLead;
}

export async function deleteLead(id: string): Promise<boolean> {
  const result = getDb().prepare("DELETE FROM leads WHERE id = ?").run(id);
  return result.changes > 0;
}

export async function listSearchRuns(): Promise<SearchRun[]> {
  const rows = getDb()
    .prepare("SELECT * FROM search_runs ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToSearchRun);
}

export async function createSearchRun(run: SearchRun): Promise<SearchRun> {
  getDb()
    .prepare(
      `
        INSERT INTO search_runs (
          id, market, country, city, sector, service_focus, source_mix_json,
          tasks_json, notes, imported_lead_count, created_at
        ) VALUES (
          @id, @market, @country, @city, @sector, @service_focus, @source_mix_json,
          @tasks_json, @notes, @imported_lead_count, @created_at
        )
      `
    )
    .run(searchRunToRow(run));
  return run;
}

export async function importLeads(leads: LeadInput[]): Promise<Lead[]> {
  const created = leads.map((input) => leadFromInput(input, randomUUID()));
  const insertMany = getDb().transaction((items: Lead[]) => {
    for (const lead of items) upsertLead(lead);
  });
  insertMany(created);
  return created;
}

export async function replaceLead(nextLead: Lead): Promise<Lead> {
  const refreshed = refreshLeadScore(nextLead);
  return upsertLead(refreshed);
}

export async function findLeadByWebsite(website: string): Promise<Lead | null> {
  const normalized = normalizeWebsiteKey(website);
  if (!normalized) return null;

  const rows = getDb().prepare("SELECT * FROM leads WHERE website IS NOT NULL").all() as Record<
    string,
    unknown
  >[];
  const row = rows.find((item) => normalizeWebsiteKey(String(item.website ?? "")) === normalized);
  return row ? refreshLeadScore(rowToLead(row)) : null;
}

export function upsertLead(lead: Lead): Lead {
  const existingRow = findExistingLeadRow(lead);
  const existingLead = existingRow ? rowToLead(existingRow) : null;
  const leadToSave = existingLead
    ? refreshLeadScore({
        ...existingLead,
        ...lead,
        id: existingLead.id,
        createdAt: existingLead.createdAt,
        updatedAt: new Date().toISOString()
      })
    : lead;
  const row = leadToRow(leadToSave);
  getDb()
    .prepare(
      `
        INSERT INTO leads (${leadColumns})
        VALUES (${leadValueParams})
        ON CONFLICT(id) DO UPDATE SET ${updateAssignments}
      `
    )
    .run(row);
  return leadToSave;
}

function findExistingLeadRow(lead: Lead): Record<string, unknown> | undefined {
  if (lead.googlePlaceId) {
    const row = getDb()
      .prepare("SELECT * FROM leads WHERE google_place_id = ? AND id != ?")
      .get(lead.googlePlaceId, lead.id) as Record<string, unknown> | undefined;
    if (row) return row;
  }

  if (lead.website) {
    return getDb()
      .prepare("SELECT * FROM leads WHERE website = ? AND id != ?")
      .get(lead.website, lead.id) as Record<string, unknown> | undefined;
  }

  return undefined;
}

function normalizeWebsiteKey(value: string): string {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase();
  }
}
