import type { Lead, SearchRun } from "@/lib/types";

/** Postgres (Supabase) row mappers. jsonb columns arrive as objects, not strings. */

function parseMaybeJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function nullableString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value);
  return text ? text : undefined;
}

export function pgRowToLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    businessName: String(row.business_name),
    website: row.website == null ? null : String(row.website),
    city: String(row.city),
    country: String(row.country),
    sector: String(row.sector),
    source: row.source as Lead["source"],
    sourceUrl: nullableString(row.source_url),
    googlePlaceId: nullableString(row.google_place_id),
    decisionMaker: nullableString(row.decision_maker),
    email: nullableString(row.email),
    phone: nullableString(row.phone),
    socials: parseMaybeJson(row.socials_json, []),
    services: parseMaybeJson(row.services_json, []),
    status: row.status as Lead["status"],
    score: Number(row.score ?? 0),
    fitReason: String(row.fit_reason ?? ""),
    painSignals: parseMaybeJson(row.pain_signals_json, []),
    audit: parseMaybeJson(row.audit_json, undefined),
    outreach: parseMaybeJson(row.outreach_json, undefined),
    nextAction: String(row.next_action ?? ""),
    lastContactedAt: nullableString(row.last_contacted_at),
    nextFollowUpAt: nullableString(row.next_follow_up_at),
    notes: String(row.notes ?? ""),
    tags: parseMaybeJson(row.tags_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function leadToPgRow(lead: Lead, teamId: string): Record<string, unknown> {
  return {
    id: lead.id,
    team_id: teamId,
    business_name: lead.businessName,
    website: lead.website,
    city: lead.city,
    country: lead.country,
    sector: lead.sector,
    source: lead.source,
    source_url: lead.sourceUrl ?? null,
    google_place_id: lead.googlePlaceId ?? null,
    decision_maker: lead.decisionMaker ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    socials_json: lead.socials ?? [],
    services_json: lead.services ?? [],
    status: lead.status,
    score: lead.score,
    fit_reason: lead.fitReason,
    pain_signals_json: lead.painSignals ?? [],
    audit_json: lead.audit ?? null,
    outreach_json: lead.outreach ?? null,
    next_action: lead.nextAction,
    last_contacted_at: lead.lastContactedAt ?? null,
    next_follow_up_at: lead.nextFollowUpAt ?? null,
    notes: lead.notes ?? "",
    tags_json: lead.tags ?? [],
    created_at: lead.createdAt,
    updated_at: lead.updatedAt
  };
}

export function pgRowToSearchRun(row: Record<string, unknown>): SearchRun {
  return {
    id: String(row.id),
    market: String(row.market),
    country: String(row.country),
    city: String(row.city),
    sector: String(row.sector),
    serviceFocus: row.service_focus as SearchRun["serviceFocus"],
    sourceMix: parseMaybeJson(row.source_mix_json, []),
    tasks: parseMaybeJson(row.tasks_json, []),
    createdAt: String(row.created_at),
    notes: String(row.notes ?? ""),
    importedLeadCount: Number(row.imported_lead_count ?? 0)
  };
}

export function searchRunToPgRow(run: SearchRun, teamId: string): Record<string, unknown> {
  return {
    id: run.id,
    team_id: teamId,
    market: run.market,
    country: run.country,
    city: run.city,
    sector: run.sector,
    service_focus: run.serviceFocus,
    source_mix_json: run.sourceMix,
    tasks_json: run.tasks,
    notes: run.notes,
    imported_lead_count: run.importedLeadCount,
    created_at: run.createdAt
  };
}
