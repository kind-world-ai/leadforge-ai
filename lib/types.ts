export const leadStatuses = [
  "New",
  "Qualified",
  "Drafted",
  "Contacted",
  "Follow-up 1",
  "Follow-up 2",
  "Meeting",
  "Proposal",
  "Won",
  "Lost"
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export const serviceOptions = [
  "Website",
  "SEO",
  "AI Automation",
  "UI/UX",
  "Ecommerce",
  "CRM Automation"
] as const;

export type ServiceFocus = (typeof serviceOptions)[number];

export const leadSources = [
  "Google Maps",
  "OpenStreetMap",
  "Website Search",
  "Directory",
  "Domain Watch",
  "Registry",
  "LinkedIn Manual",
  "BuiltWith/Wappalyzer",
  "Job Board",
  "RFP/Tender",
  "Referral",
  "Manual"
] as const;

export type LeadSource = (typeof leadSources)[number];

export type Severity = "high" | "medium" | "low";

export interface PainSignal {
  id: string;
  severity: Severity;
  category: "Website" | "SEO" | "Trust" | "Automation" | "Contact" | "Market";
  title: string;
  detail: string;
  evidence?: string;
}

export interface PageSpeedMetrics {
  performance: number | null;
  seo: number | null;
  bestPractices: number | null;
  accessibility: number | null;
  fcpMs: number | null;
  lcpMs: number | null;
  cls: number | null;
  tbtMs: number | null;
  speedIndexMs: number | null;
}

export interface PageSpeedSnapshot {
  checkedAt: string;
  url: string;
  mobile: PageSpeedMetrics | null;
  desktop: PageSpeedMetrics | null;
  error?: string;
}

export interface WebsiteAudit {
  url: string;
  resolvedUrl: string;
  checkedAt: string;
  status: number;
  statusText: string;
  loadMs: number;
  htmlBytes: number;
  title: string;
  description: string;
  h1Count: number;
  imageCount: number;
  linkCount: number;
  hasViewport: boolean;
  hasSsl: boolean;
  hasContactForm: boolean;
  hasPhone: boolean;
  hasEmail: boolean;
  hasSchema: boolean;
  hasAnalytics: boolean;
  technologies: string[];
  problems: PainSignal[];
  healthScore: number;
  crawlPages?: CrawlPageResult[];
  crawlerSummary?: string;
  discoveredEmails?: string[];
  discoveredPhones?: string[];
  discoveredSocials?: string[];
  pagespeed?: PageSpeedSnapshot;
}

export interface CrawlPageResult {
  url: string;
  title: string;
  status: number;
  loadMs: number;
  wordCount: number;
  h1Count: number;
  forms: number;
  ctaCount: number;
  emails: string[];
  phones: string[];
  socialLinks: string[];
  internalLinks: string[];
  problems: PainSignal[];
}

export interface FollowUpDraft {
  day: number;
  channel: string;
  message: string;
}

export interface ReplyPlay {
  intent: string;
  response: string;
}

export interface OutreachDraft {
  generatedAt: string;
  subject: string;
  subjectOptions?: string[];
  shortEmail: string;
  whatsapp?: string;
  linkedinConnect?: string;
  callOpener: string;
  linkedinNote: string;
  contactFormMessage: string;
  followUps?: FollowUpDraft[];
  replyPlaybook?: ReplyPlay[];
  aiGenerated?: boolean;
}

export interface ScorePart {
  label: string;
  points: number;
}

export interface Lead {
  id: string;
  businessName: string;
  website: string | null;
  city: string;
  country: string;
  sector: string;
  source: LeadSource;
  sourceUrl?: string;
  googlePlaceId?: string;
  decisionMaker?: string;
  email?: string;
  phone?: string;
  socials: string[];
  services: ServiceFocus[];
  status: LeadStatus;
  score: number;
  scoreBreakdown?: ScorePart[];
  fitReason: string;
  painSignals: PainSignal[];
  audit?: WebsiteAudit;
  outreach?: OutreachDraft;
  nextAction: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  notes: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchTask {
  id: string;
  source: LeadSource;
  query: string;
  intent: string;
  action: string;
}

export interface SearchRun {
  id: string;
  market: string;
  country: string;
  city: string;
  sector: string;
  serviceFocus: ServiceFocus;
  sourceMix: LeadSource[];
  tasks: SearchTask[];
  createdAt: string;
  notes: string;
  importedLeadCount: number;
}

export interface LeadDatabase {
  version: 1;
  leads: Lead[];
  searchRuns: SearchRun[];
}

export interface LeadInput {
  businessName: string;
  website?: string | null;
  city?: string;
  country?: string;
  sector?: string;
  source?: LeadSource;
  sourceUrl?: string;
  googlePlaceId?: string;
  decisionMaker?: string;
  email?: string;
  phone?: string;
  socials?: string[];
  services?: ServiceFocus[];
  status?: LeadStatus;
  nextAction?: string;
  notes?: string;
  tags?: string[];
}
