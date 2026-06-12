import type { LeadInput, LeadSource, ServiceFocus } from "@/lib/types";

export type View =
  | "command"
  | "search"
  | "pipeline"
  | "import"
  | "database"
  | "schedule"
  | "team";

export type LeadForm = LeadInput & {
  autoAudit: boolean;
};

export type PlacesImportMode = "discovery" | "enriched";

export type ManualMapsForm = LeadInput & {
  rawPaste: string;
  autoAudit: boolean;
};

export type PlacesForm = {
  query: string;
  country: string;
  city: string;
  sector: string;
  serviceFocus: ServiceFocus;
  mode: PlacesImportMode;
  limit: number;
  onlyMissingWebsite: boolean;
  autoAudit: boolean;
};

export type OsmForm = {
  query: string;
  city: string;
  country: string;
  sector: string;
  serviceFocus: ServiceFocus;
  limit: number;
  onlyMissingWebsite: boolean;
};

export const defaultOsmForm: OsmForm = {
  query: "clinics",
  city: "Mohali",
  country: "India",
  sector: "Clinics",
  serviceFocus: "Website",
  limit: 15,
  onlyMissingWebsite: false
};

export type SearchPlanForm = {
  market: string;
  country: string;
  city: string;
  sector: string;
  serviceFocus: ServiceFocus;
  sourceMix: LeadSource[];
};

export const defaultLeadForm: LeadForm = {
  businessName: "",
  website: "",
  city: "Mohali",
  country: "India",
  sector: "Local service",
  source: "Manual",
  services: ["Website", "SEO"],
  phone: "",
  email: "",
  notes: "",
  autoAudit: false
};

export const defaultManualMapsForm: ManualMapsForm = {
  businessName: "",
  website: "",
  city: "Mohali",
  country: "India",
  sector: "Local service",
  source: "Google Maps",
  sourceUrl: "",
  services: ["Website", "SEO"],
  phone: "",
  email: "",
  notes: "",
  rawPaste: "",
  autoAudit: false,
  tags: ["manual-capture", "via:Google Maps"]
};

export const defaultSearchSources: LeadSource[] = [
  "Google Maps",
  "Website Search",
  "Directory",
  "LinkedIn Manual"
];
