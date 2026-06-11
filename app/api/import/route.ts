import { NextResponse } from "next/server";
import { importLeads } from "@/lib/store";
import {
  leadSources,
  serviceOptions,
  type LeadInput,
  type LeadSource,
  type ServiceFocus
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    text?: string;
    defaults?: Partial<LeadInput>;
  };

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "Import text is required" }, { status: 400 });

  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseImportLine(line, body.defaults));

  const validRows = rows.filter((row): row is LeadInput => Boolean(row?.businessName));
  if (!validRows.length) {
    return NextResponse.json({ error: "No valid leads found" }, { status: 400 });
  }

  const leads = await importLeads(validRows);
  return NextResponse.json({ leads, count: leads.length }, { status: 201 });
}

function parseImportLine(line: string, defaults?: Partial<LeadInput>): LeadInput | null {
  const columns = splitCsv(line);
  const looksLikeUrl = /^https?:\/\//i.test(line) || /^[a-z0-9.-]+\.[a-z]{2,}/i.test(line);

  if (looksLikeUrl && columns.length === 1) {
    const website = columns[0];
    return {
      ...defaults,
      businessName: businessNameFromWebsite(website),
      website,
      source: defaults?.source ?? "Manual"
    };
  }

  const [
    businessName,
    website,
    city,
    country,
    sector,
    phone,
    email,
    source,
    services,
    notes
  ] = columns;

  if (!businessName?.trim()) return null;

  return {
    ...defaults,
    businessName,
    website: website || defaults?.website,
    city: city || defaults?.city,
    country: country || defaults?.country,
    sector: sector || defaults?.sector,
    phone: phone || defaults?.phone,
    email: email || defaults?.email,
    source: parseSource(source) ?? defaults?.source ?? "Manual",
    services: parseServices(services) ?? defaults?.services,
    notes: notes || defaults?.notes
  };
}

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseSource(value?: string): LeadSource | null {
  if (!value) return null;
  return leadSources.find((source) => source.toLowerCase() === value.toLowerCase()) ?? null;
}

function parseServices(value?: string): ServiceFocus[] | undefined {
  if (!value) return undefined;
  const parts = value.split(/[|;]/).map((part) => part.trim().toLowerCase());
  const services = serviceOptions.filter((service) => parts.includes(service.toLowerCase()));
  return services.length ? [...services] : undefined;
}

function businessNameFromWebsite(website: string): string {
  try {
    const normalized = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const host = new URL(normalized).hostname.replace(/^www\./, "");
    return host
      .split(".")[0]
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  } catch {
    return website;
  }
}
