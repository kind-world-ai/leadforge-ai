import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "fs";
import path from "path";
import type { Lead, LeadDatabase, SearchRun } from "@/lib/types";

const DATA_DIR = process.env.LEADFORGE_DATA_DIR || path.join(process.cwd(), "data");
const SQLITE_FILE = path.join(DATA_DIR, "leadforge.sqlite");
const JSON_FILE = path.join(DATA_DIR, "leadforge-db.json");

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(SQLITE_FILE);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  migrateJsonIfEmpty(db);
  dbInstance = db;
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      website TEXT,
      city TEXT NOT NULL,
      country TEXT NOT NULL,
      sector TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT,
      google_place_id TEXT,
      decision_maker TEXT,
      email TEXT,
      phone TEXT,
      socials_json TEXT NOT NULL DEFAULT '[]',
      services_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL,
      score INTEGER NOT NULL,
      fit_reason TEXT NOT NULL,
      pain_signals_json TEXT NOT NULL DEFAULT '[]',
      audit_json TEXT,
      outreach_json TEXT,
      next_action TEXT NOT NULL,
      last_contacted_at TEXT,
      next_follow_up_at TEXT,
      notes TEXT NOT NULL DEFAULT '',
      tags_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_city_country ON leads(city, country);
    CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_website_unique
      ON leads(website)
      WHERE website IS NOT NULL AND website != '';

    CREATE TABLE IF NOT EXISTS search_runs (
      id TEXT PRIMARY KEY,
      market TEXT NOT NULL,
      country TEXT NOT NULL,
      city TEXT NOT NULL,
      sector TEXT NOT NULL,
      service_focus TEXT NOT NULL,
      source_mix_json TEXT NOT NULL DEFAULT '[]',
      tasks_json TEXT NOT NULL DEFAULT '[]',
      notes TEXT NOT NULL DEFAULT '',
      imported_lead_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  addColumnIfMissing(db, "leads", "google_place_id", "TEXT");
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_google_place_id_unique
      ON leads(google_place_id)
      WHERE google_place_id IS NOT NULL AND google_place_id != '';
  `);
}

function addColumnIfMissing(
  db: Database.Database,
  tableName: string,
  columnName: string,
  definition: string
) {
  const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  if (!rows.some((row) => row.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function migrateJsonIfEmpty(db: Database.Database) {
  const leadCount = db.prepare("SELECT COUNT(*) AS count FROM leads").get() as { count: number };
  const runCount = db.prepare("SELECT COUNT(*) AS count FROM search_runs").get() as { count: number };
  if (leadCount.count > 0 || runCount.count > 0 || !existsSync(JSON_FILE)) return;

  try {
    const raw = readFileSync(JSON_FILE, "utf8");
    const parsed = JSON.parse(raw) as LeadDatabase;
    const insertLead = db.prepare(`
      INSERT OR IGNORE INTO leads (
        id, business_name, website, city, country, sector, source, source_url,
        google_place_id, decision_maker, email, phone, socials_json, services_json, status, score,
        fit_reason, pain_signals_json, audit_json, outreach_json, next_action,
        last_contacted_at, next_follow_up_at, notes, tags_json, created_at, updated_at
      ) VALUES (
        @id, @business_name, @website, @city, @country, @sector, @source, @source_url,
        @google_place_id, @decision_maker, @email, @phone, @socials_json, @services_json, @status, @score,
        @fit_reason, @pain_signals_json, @audit_json, @outreach_json, @next_action,
        @last_contacted_at, @next_follow_up_at, @notes, @tags_json, @created_at, @updated_at
      )
    `);
    const insertRun = db.prepare(`
      INSERT OR IGNORE INTO search_runs (
        id, market, country, city, sector, service_focus, source_mix_json,
        tasks_json, notes, imported_lead_count, created_at
      ) VALUES (
        @id, @market, @country, @city, @sector, @service_focus, @source_mix_json,
        @tasks_json, @notes, @imported_lead_count, @created_at
      )
    `);

    const transaction = db.transaction(() => {
      for (const lead of parsed.leads ?? []) insertLead.run(leadToRow(lead));
      for (const run of parsed.searchRuns ?? []) insertRun.run(searchRunToRow(run));
    });
    transaction();
  } catch {
    // A malformed legacy JSON file should not block the SQLite app from starting.
  }
}

export function leadToRow(lead: Lead) {
  return {
    id: lead.id,
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
    socials_json: JSON.stringify(lead.socials ?? []),
    services_json: JSON.stringify(lead.services ?? []),
    status: lead.status,
    score: lead.score,
    fit_reason: lead.fitReason,
    pain_signals_json: JSON.stringify(lead.painSignals ?? []),
    audit_json: lead.audit ? JSON.stringify(lead.audit) : null,
    outreach_json: lead.outreach ? JSON.stringify(lead.outreach) : null,
    next_action: lead.nextAction,
    last_contacted_at: lead.lastContactedAt ?? null,
    next_follow_up_at: lead.nextFollowUpAt ?? null,
    notes: lead.notes ?? "",
    tags_json: JSON.stringify(lead.tags ?? []),
    created_at: lead.createdAt,
    updated_at: lead.updatedAt
  };
}

export function rowToLead(row: Record<string, unknown>): Lead {
  return {
    id: String(row.id),
    businessName: String(row.business_name),
    website: nullableString(row.website),
    city: String(row.city),
    country: String(row.country),
    sector: String(row.sector),
    source: row.source as Lead["source"],
    sourceUrl: nullableString(row.source_url) ?? undefined,
    googlePlaceId: nullableString(row.google_place_id) ?? undefined,
    decisionMaker: nullableString(row.decision_maker) ?? undefined,
    email: nullableString(row.email) ?? undefined,
    phone: nullableString(row.phone) ?? undefined,
    socials: parseJson(row.socials_json, []),
    services: parseJson(row.services_json, []),
    status: row.status as Lead["status"],
    score: Number(row.score ?? 0),
    fitReason: String(row.fit_reason),
    painSignals: parseJson(row.pain_signals_json, []),
    audit: parseJson(row.audit_json, undefined),
    outreach: parseJson(row.outreach_json, undefined),
    nextAction: String(row.next_action),
    lastContactedAt: nullableString(row.last_contacted_at) ?? undefined,
    nextFollowUpAt: nullableString(row.next_follow_up_at) ?? undefined,
    notes: String(row.notes ?? ""),
    tags: parseJson(row.tags_json, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

export function searchRunToRow(run: SearchRun) {
  return {
    id: run.id,
    market: run.market,
    country: run.country,
    city: run.city,
    sector: run.sector,
    service_focus: run.serviceFocus,
    source_mix_json: JSON.stringify(run.sourceMix ?? []),
    tasks_json: JSON.stringify(run.tasks ?? []),
    notes: run.notes ?? "",
    imported_lead_count: run.importedLeadCount ?? 0,
    created_at: run.createdAt
  };
}

export function rowToSearchRun(row: Record<string, unknown>): SearchRun {
  return {
    id: String(row.id),
    market: String(row.market),
    country: String(row.country),
    city: String(row.city),
    sector: String(row.sector),
    serviceFocus: row.service_focus as SearchRun["serviceFocus"],
    sourceMix: parseJson(row.source_mix_json, []),
    tasks: parseJson(row.tasks_json, []),
    notes: String(row.notes ?? ""),
    importedLeadCount: Number(row.imported_lead_count ?? 0),
    createdAt: String(row.created_at)
  };
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}
