import { randomUUID } from "crypto";
import type { LeadSource, SearchRun, SearchTask, ServiceFocus } from "@/lib/types";

const sourceIntent: Record<LeadSource, string> = {
  "Google Maps": "Find local businesses with weak or missing websites.",
  OpenStreetMap: "Free open-data business search; great for finding businesses with no website tag.",
  "Domain Watch": "Newly registered local domains signal businesses investing online right now.",
  Registry: "Official business registries surface brand-new businesses before they build a web presence.",
  "Website Search": "Find businesses through search results, operator queries, and service pages.",
  Directory: "Use public industry directories to find verified local companies.",
  "LinkedIn Manual": "Find decision makers manually; do not automate messages or scraping.",
  "BuiltWith/Wappalyzer": "Find companies by technology weakness or platform migration opportunity.",
  "Job Board": "Find companies actively hiring, which can signal budget or internal pain.",
  "RFP/Tender": "Find public demand where the buyer has already defined a project.",
  Referral: "Turn existing relationships into warm introductions.",
  Manual: "Capture one-off leads from research or calls."
};

export function createSearchRunPlan(input: {
  market: string;
  country: string;
  city: string;
  sector: string;
  serviceFocus: ServiceFocus;
  sourceMix?: LeadSource[];
}): SearchRun {
  const sourceMix = input.sourceMix?.length
    ? input.sourceMix
    : (["Google Maps", "Website Search", "Directory", "LinkedIn Manual"] satisfies LeadSource[]);

  return {
    id: randomUUID(),
    market: input.market || `${input.city}, ${input.country}`,
    country: input.country,
    city: input.city,
    sector: input.sector,
    serviceFocus: input.serviceFocus,
    sourceMix,
    tasks: sourceMix.flatMap((source) => buildTasksForSource(source, input)),
    createdAt: new Date().toISOString(),
    notes: buildMarketNotes(input.country, input.serviceFocus),
    importedLeadCount: 0
  };
}

function buildTasksForSource(
  source: LeadSource,
  input: {
    country: string;
    city: string;
    sector: string;
    serviceFocus: ServiceFocus;
  }
): SearchTask[] {
  const city = input.city.trim();
  const sector = input.sector.trim();
  const country = input.country.trim();
  const service = input.serviceFocus;

  if (source === "Google Maps") {
    return [
      task(source, `${sector} near ${city}`, "Map leads", "Open results, verify website/contact, then import only useful leads."),
      task(source, `${sector} ${city} no website`, "Missing-site leads", "Look for map listings using only social pages or directory links."),
      task(source, `${sector} ${city} ${service}`, "Service-specific pain", "Check if competitors already offer stronger online experience.")
    ];
  }

  if (source === "Website Search") {
    return [
      task(source, `"${sector}" "${city}" "${country}"`, "Organic search leads", "Open websites and audit weak pages."),
      task(source, `intitle:"${sector}" "${city}" "contact"`, "Contactable businesses", "Find businesses with public contact pages."),
      task(source, `"${sector}" "${city}" ("powered by Wix" OR "Squarespace")`, "Redesign opportunity", "Check template-heavy sites for conversion problems.")
    ];
  }

  if (source === "Directory") {
    return [
      task(source, `${country} ${sector} association members ${city}`, "Industry directory", "Find members and verify whether they have websites."),
      task(source, `${sector} directory ${city} email phone`, "Public directory", "Import only public business contact details.")
    ];
  }

  if (source === "LinkedIn Manual") {
    return [
      task(source, `${sector} owner ${city}`, "Decision maker", "Manually identify owner/founder/manager; write draft only."),
      task(source, `${sector} operations manager ${city}`, "Operational buyer", "Use for AI automation or CRM automation pitch.")
    ];
  }

  if (source === "BuiltWith/Wappalyzer") {
    return [
      task(source, `${sector} ${city} WordPress old theme`, "Tech weakness", "Check outdated CMS, slow ecommerce, or missing analytics."),
      task(source, `${sector} ${city} Shopify WooCommerce Wix`, "Platform fit", "Find migration, SEO, CRO, or automation opportunities.")
    ];
  }

  if (source === "Job Board") {
    return [
      task(source, `${sector} ${city} hiring marketing assistant`, "Budget signal", "Companies hiring marketing/admin may need automation support."),
      task(source, `${sector} ${city} web developer SEO`, "Direct demand", "Find direct needs and contact through official channel.")
    ];
  }

  if (source === "RFP/Tender") {
    return [
      task(source, `${country} ${city} website design RFP ${sector}`, "Public project", "Check official RFP pages and deadlines."),
      task(source, `${country} tender SEO web development ${city}`, "Tender demand", "Capture buyer requirements in notes.")
    ];
  }

  return [task(source, `${sector} ${city}`, sourceIntent[source], "Research manually and add qualified leads.")];
}

function task(source: LeadSource, query: string, intent: string, action: string): SearchTask {
  return {
    id: randomUUID(),
    source,
    query,
    intent,
    action
  };
}

function buildMarketNotes(country: string, service: ServiceFocus): string {
  const normalized = country.toLowerCase();
  if (normalized.includes("australia")) {
    return `Australia plan: focus Sydney, Melbourne, Brisbane, Perth, Adelaide; qualify tradies, clinics, migration consultants, accountants, restaurants, and real estate. Lead with ${service}.`;
  }

  if (normalized.includes("usa") || normalized.includes("united states")) {
    return `USA plan: choose one city cluster at a time. Good starts: Austin, Dallas, Phoenix, Miami, Atlanta, Denver, Charlotte, Nashville, San Diego. Lead with ${service}.`;
  }

  if (normalized.includes("india")) {
    return `India plan: start with Tricity and nearby service businesses where direct calls and WhatsApp follow-up are realistic. Lead with ${service}.`;
  }

  return `International plan: start English-speaking markets first, keep the niche narrow, and qualify before outreach. Lead with ${service}.`;
}
