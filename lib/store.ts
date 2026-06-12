import type { Lead, LeadInput, SearchRun } from "@/lib/types";
import { isRemoteBackend } from "@/lib/backend";

/**
 * Storage façade with two backends:
 * - sqlite (default): local-first, single user, works offline.
 * - supabase: shared Postgres online, multi-user with auth + RLS.
 * Switch with DATA_BACKEND=supabase in .env.local.
 * Backends are loaded lazily so the unused one (and its native deps) never loads.
 */

type StoreModule = {
  listLeads(): Promise<Lead[]>;
  getLead(id: string): Promise<Lead | null>;
  createLead(input: LeadInput): Promise<Lead>;
  updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null>;
  deleteLead(id: string): Promise<boolean>;
  listSearchRuns(): Promise<SearchRun[]>;
  createSearchRun(run: SearchRun): Promise<SearchRun>;
  importLeads(leads: LeadInput[]): Promise<Lead[]>;
  replaceLead(nextLead: Lead): Promise<Lead>;
  findLeadByWebsite(website: string): Promise<Lead | null>;
};

async function impl(): Promise<StoreModule> {
  if (isRemoteBackend()) {
    return (await import("@/lib/stores/supabase")) as unknown as StoreModule;
  }
  return (await import("@/lib/stores/sqlite")) as unknown as StoreModule;
}

export async function listLeads(): Promise<Lead[]> {
  return (await impl()).listLeads();
}

export async function getLead(id: string): Promise<Lead | null> {
  return (await impl()).getLead(id);
}

export async function createLead(input: LeadInput): Promise<Lead> {
  return (await impl()).createLead(input);
}

export async function updateLead(id: string, patch: Partial<Lead>): Promise<Lead | null> {
  return (await impl()).updateLead(id, patch);
}

export async function deleteLead(id: string): Promise<boolean> {
  return (await impl()).deleteLead(id);
}

export async function listSearchRuns(): Promise<SearchRun[]> {
  return (await impl()).listSearchRuns();
}

export async function createSearchRun(run: SearchRun): Promise<SearchRun> {
  return (await impl()).createSearchRun(run);
}

export async function importLeads(leads: LeadInput[]): Promise<Lead[]> {
  return (await impl()).importLeads(leads);
}

export async function replaceLead(nextLead: Lead): Promise<Lead> {
  return (await impl()).replaceLead(nextLead);
}

export async function findLeadByWebsite(website: string): Promise<Lead | null> {
  return (await impl()).findLeadByWebsite(website);
}

/** Queue a job for the crawler worker (supabase mode only). */
export async function enqueueCrawlJob(input: {
  leadId: string;
  jobType: "diagnose" | "crawl" | "audit" | "pagespeed";
  payload?: Record<string, unknown>;
}): Promise<string> {
  if (!isRemoteBackend()) {
    throw new Error("Job queue requires DATA_BACKEND=supabase");
  }
  const supabaseStore = await import("@/lib/stores/supabase");
  return supabaseStore.enqueueCrawlJob(input);
}
