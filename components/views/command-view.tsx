"use client";

import {
  Activity,
  AlertCircle,
  Bot,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  FileDown,
  FileText,
  Gauge,
  Globe2,
  Monitor,
  MapPin,
  PanelLeftClose,
  PhoneCall,
  Plus,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Trash2,
  Zap
} from "lucide-react";
import type React from "react";
import type { Lead, LeadSource, LeadStatus, PageSpeedMetrics } from "@/lib/types";
import { leadSources, leadStatuses } from "@/lib/types";
import type { LeadForm } from "@/components/app-state";
import {
  AuditMetric,
  Badge,
  Button,
  CheckRow,
  CollapsibleSection,
  DraftBox,
  EmptyState,
  Field,
  Panel,
  ScorePill,
  SectionLabel,
  ServicePicker,
  SeverityPill,
  StatusPill
} from "@/components/ui";

export function LeadCapturePanel({
  form,
  setForm,
  busy,
  onSubmit,
  onCollapse
}: {
  form: LeadForm;
  setForm: (form: LeadForm) => void;
  busy: boolean;
  onSubmit: () => void;
  onCollapse?: () => void;
}) {
  return (
    <Panel
      title="Add Lead"
      badge={<Badge icon={<Bot className="h-3 w-3" />} tone="blue">Audit ready</Badge>}
      onCollapse={onCollapse}
    >
      <div className="grid gap-2.5">
        <Field label="Business name">
          <input
            className="input"
            value={form.businessName}
            onChange={(event) => setForm({ ...form, businessName: event.target.value })}
            placeholder="ABC Dental Clinic"
          />
        </Field>
        <Field label="Website">
          <input
            className="input"
            value={form.website ?? ""}
            onChange={(event) => setForm({ ...form, website: event.target.value })}
            placeholder="https://example.com"
          />
        </Field>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="City">
            <input
              className="input"
              value={form.city ?? ""}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>
          <Field label="Country">
            <input
              className="input"
              value={form.country ?? ""}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Sector">
            <input
              className="input"
              value={form.sector ?? ""}
              onChange={(event) => setForm({ ...form, sector: event.target.value })}
            />
          </Field>
          <Field label="Source">
            <select
              className="input"
              value={form.source}
              onChange={(event) => setForm({ ...form, source: event.target.value as LeadSource })}
            >
              {leadSources.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Phone">
            <input
              className="input"
              value={form.phone ?? ""}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              value={form.email ?? ""}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
          </Field>
        </div>
        <ServicePicker
          selected={form.services ?? []}
          onChange={(services) => setForm({ ...form, services })}
        />
        <CheckRow
          checked={form.autoAudit}
          onChange={(autoAudit) => setForm({ ...form, autoAudit })}
        >
          Audit website after adding
        </CheckRow>
        <Field label="Notes">
          <textarea
            className="input min-h-20 resize-y"
            value={form.notes ?? ""}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </Field>
        <Button onClick={onSubmit} disabled={busy} busy={busy} icon={<Plus className="h-3.5 w-3.5" />}>
          Add to pipeline
        </Button>
      </div>
    </Panel>
  );
}

export function LeadListPanel(props: {
  leads: Lead[];
  query: string;
  setQuery: (value: string) => void;
  statusFilter: LeadStatus | "All";
  setStatusFilter: (value: LeadStatus | "All") => void;
  selectedLeadId: string | null;
  onSelect: (id: string) => void;
  onCollapse?: () => void;
}) {
  return (
    <Panel className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm font-semibold tracking-tight">
          {props.onCollapse ? (
            <button
              onClick={props.onCollapse}
              className="flex h-6 w-6 items-center justify-center rounded-md text-soft transition hover:bg-ink/5 hover:text-ink"
              title="Collapse queue — give the lead detail full width"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          ) : null}
          Lead Queue
        </h2>
        <div className="ml-auto flex min-w-0 flex-1 justify-end gap-1.5">
          <div className="relative min-w-24 max-w-52 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
            <input
              className="input h-8 w-full pl-8"
              value={props.query}
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder="Search"
            />
          </div>
          <select
            className="input h-8 w-28 shrink-0"
            value={props.statusFilter}
            onChange={(event) =>
              props.setStatusFilter(event.target.value as LeadStatus | "All")
            }
          >
            <option>All</option>
            {leadStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-line">
        {props.leads.length ? (
          <table className="w-full min-w-[540px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-field text-left text-2xs uppercase tracking-wide text-soft">
              <tr>
                <th className="px-2.5 py-1.5 font-semibold">Lead</th>
                <th className="px-2.5 py-1.5 font-semibold">Score</th>
                <th className="px-2.5 py-1.5 font-semibold">Status</th>
                <th className="px-2.5 py-1.5 font-semibold">Need</th>
                <th className="px-2.5 py-1.5 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {props.leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`cursor-pointer border-t border-line/70 transition hover:bg-field ${
                    props.selectedLeadId === lead.id ? "bg-accent/5" : ""
                  }`}
                  onClick={() => props.onSelect(lead.id)}
                >
                  <td className="px-2.5 py-2">
                    <div className="text-xs font-medium">{lead.businessName}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-2xs text-soft">
                      <MapPin className="h-3 w-3" />
                      {lead.city}, {lead.country}
                    </div>
                  </td>
                  <td className="px-2.5 py-2">
                    <ScorePill score={lead.score} compact />
                  </td>
                  <td className="px-2.5 py-2">
                    <StatusPill status={lead.status} />
                  </td>
                  <td className="max-w-36 truncate px-2.5 py-2 text-2xs text-soft">
                    {lead.services.join(", ")}
                  </td>
                  <td className="px-2.5 py-2 text-2xs text-soft">{lead.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="No leads yet"
            text="Add a lead, import a list, or create a source plan."
          />
        )}
      </div>
    </Panel>
  );
}

function platformLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("linkedin")) return "LinkedIn";
    if (host.includes("clutch")) return "Clutch";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("justdial")) return "Justdial";
    if (host.includes("goodfirms")) return "GoodFirms";
    if (host.includes("indiamart")) return "IndiaMART";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("twitter") || host === "x.com") return "X";
    if (host.includes("yelp")) return "Yelp";
    return host.split(".")[0];
  } catch {
    return "Profile";
  }
}

function speedTone(score: number | null): string {
  if (score == null) return "bg-field text-soft border-line";
  if (score >= 90) return "bg-moss/10 text-moss border-moss/30";
  if (score >= 50) return "bg-gold/10 text-gold border-gold/30";
  return "bg-rust/10 text-rust border-rust/30";
}

function PageSpeedCard({
  label,
  icon,
  metrics
}: {
  label: string;
  icon: React.ReactNode;
  metrics: PageSpeedMetrics | null;
}) {
  if (!metrics) {
    return (
      <div className="rounded-md border border-line bg-field px-2.5 py-2 text-2xs text-soft">
        {label}: no result
      </div>
    );
  }
  return (
    <div className="rounded-md border border-line bg-field p-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink/80">
          {icon}
          {label}
        </span>
        <span
          className={`inline-flex h-7 min-w-9 items-center justify-center rounded-md border px-2 text-sm font-semibold tabular-nums ${speedTone(metrics.performance)}`}
        >
          {metrics.performance ?? "—"}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
        <MiniScore label="SEO" value={metrics.seo} />
        <MiniScore label="Best" value={metrics.bestPractices} />
        <MiniScore label="A11y" value={metrics.accessibility} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-2xs text-soft">
        {metrics.lcpMs != null ? <span>LCP {(metrics.lcpMs / 1000).toFixed(1)}s</span> : null}
        {metrics.fcpMs != null ? <span>FCP {(metrics.fcpMs / 1000).toFixed(1)}s</span> : null}
        {metrics.tbtMs != null ? <span>TBT {metrics.tbtMs}ms</span> : null}
        {metrics.cls != null ? <span>CLS {metrics.cls}</span> : null}
      </div>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value: number | null }) {
  return (
    <div className={`rounded border px-1 py-0.5 ${speedTone(value)}`}>
      <div className="text-2xs font-semibold tabular-nums">{value ?? "—"}</div>
      <div className="text-2xs opacity-70">{label}</div>
    </div>
  );
}

export function FollowUpStrip({
  leads,
  onSelect
}: {
  leads: Lead[];
  onSelect: (id: string) => void;
}) {
  if (!leads.length) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <section className="mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 text-accent-deep" />
        <span className="text-xs font-semibold text-accent-deep">
          {leads.length} follow-up{leads.length === 1 ? "" : "s"} due
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {leads.slice(0, 10).map((lead) => {
          const due = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : null;
          const overdue = due ? due < today : false;
          return (
            <button
              key={lead.id}
              onClick={() => onSelect(lead.id)}
              className="inline-flex h-7 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 text-2xs font-medium transition hover:border-accent/50"
            >
              {lead.businessName}
              <span className={overdue ? "font-semibold text-rust" : "text-soft"}>
                {due
                  ? overdue
                    ? `overdue · ${due.toLocaleDateString()}`
                    : "today"
                  : ""}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function LeadDetailPanel({
  lead,
  busy,
  onAudit,
  onCrawl,
  onEnrichPlace,
  onWebEnrich,
  onPageSpeed,
  onDiagnose,
  onDraft,
  onStatus,
  onFollowUp,
  onDelete
}: {
  lead: Lead | null;
  busy: string | null;
  onAudit: (lead: Lead) => void;
  onCrawl: (lead: Lead) => void;
  onEnrichPlace: (lead: Lead) => void;
  onWebEnrich: (lead: Lead) => void;
  onPageSpeed: (lead: Lead) => void;
  onDiagnose: (lead: Lead) => void;
  onDraft: (lead: Lead) => void;
  onStatus: (lead: Lead, status: LeadStatus) => void;
  onFollowUp: (lead: Lead, date: string | null) => void;
  onDelete: (lead: Lead) => void;
}) {
  if (!lead) {
    return (
      <Panel>
        <EmptyState
          title="Select a lead"
          text="Lead diagnosis and outreach drafts will appear here."
        />
      </Panel>
    );
  }

  return (
    <Panel className="min-w-0">
      <div className="flex flex-col gap-2.5 border-b border-line pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {lead.businessName}
            </h2>
            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-2xs text-soft">
              <span>{lead.sector}</span>
              <span>·</span>
              <span>{lead.city}</span>
              <span>·</span>
              <span>{lead.country}</span>
            </div>
          </div>
          <ScorePill score={lead.score} />
        </div>
        <p className="text-xs leading-5 text-ink/70">{lead.fitReason}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.website ? (
            <a
              className="inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 text-2xs font-medium text-ink/70 transition hover:border-ink/30 hover:text-ink"
              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
              target="_blank"
              rel="noreferrer"
            >
              <Globe2 className="h-3 w-3" />
              Website
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ) : (
            <Badge icon={<AlertCircle className="h-3 w-3" />} tone="rust">
              No website captured
            </Badge>
          )}
          {lead.phone ? (
            <Badge icon={<PhoneCall className="h-3 w-3" />} tone="green">
              {lead.phone}
            </Badge>
          ) : null}
          {lead.sourceUrl ? (
            <a
              className="inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 text-2xs font-medium text-ink/70 transition hover:border-ink/30 hover:text-ink"
              href={lead.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              <MapPin className="h-3 w-3" />
              Source
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ) : null}
          {lead.socials.slice(0, 6).map((social) => (
            <a
              key={social}
              className="inline-flex h-6 items-center gap-1 rounded-full border border-sky/25 bg-sky/10 px-2 text-2xs font-medium text-sky transition hover:border-sky/50"
              href={social}
              target="_blank"
              rel="noreferrer"
              title={social}
            >
              {platformLabel(social)}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ))}
          <StatusPill status={lead.status} />
        </div>
      </div>

      <div className="mt-3">
        <Button
          onClick={() => onDiagnose(lead)}
          disabled={busy === `diagnose-${lead.id}`}
          busy={busy === `diagnose-${lead.id}`}
          icon={<Zap className="h-3.5 w-3.5" />}
          title="Crawl + PageSpeed + rescore + outreach draft in one run"
          className="w-full"
        >
          {busy === `diagnose-${lead.id}` ? "Running full diagnosis…" : "Full diagnosis"}
        </Button>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-1.5 2xl:grid-cols-3">
        <Button
          variant="secondary"
          onClick={() => onAudit(lead)}
          disabled={!lead.website || busy === `audit-${lead.id}`}
          busy={busy === `audit-${lead.id}`}
          icon={<Activity className="h-3.5 w-3.5" />}
          title="Audit website"
        >
          Run audit
        </Button>
        <Button
          variant="secondary"
          onClick={() => onCrawl(lead)}
          disabled={!lead.website || busy === `crawl-${lead.id}`}
          busy={busy === `crawl-${lead.id}`}
          icon={<Bot className="h-3.5 w-3.5" />}
          title="Crawl website with Playwright"
        >
          Crawl site
        </Button>
        <Button
          variant="secondary"
          onClick={() => onEnrichPlace(lead)}
          disabled={!lead.googlePlaceId || busy === `place-${lead.id}`}
          busy={busy === `place-${lead.id}`}
          icon={<MapPin className="h-3.5 w-3.5" />}
          title="Enrich from Google Places"
        >
          Enrich place
        </Button>
        <Button
          variant="secondary"
          onClick={() => onWebEnrich(lead)}
          disabled={busy === `web-${lead.id}`}
          busy={busy === `web-${lead.id}`}
          icon={<Search className="h-3.5 w-3.5" />}
          title="Search the web for LinkedIn, Clutch, Facebook profiles + website (official search API)"
        >
          Find profiles
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPageSpeed(lead)}
          disabled={!lead.website || busy === `psi-${lead.id}`}
          busy={busy === `psi-${lead.id}`}
          icon={<Gauge className="h-3.5 w-3.5" />}
          title="Google PageSpeed: mobile + desktop"
        >
          PageSpeed
        </Button>
        <Button
          onClick={() => onDraft(lead)}
          disabled={busy === `draft-${lead.id}`}
          busy={busy === `draft-${lead.id}`}
          icon={<Sparkles className="h-3.5 w-3.5" />}
          title="Generate outreach"
        >
          Draft outreach
        </Button>
        {lead.audit ? (
          <a
            href={`/api/leads/${lead.id}/report`}
            className="inline-flex h-8 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-moss/40 bg-white px-3 text-xs font-medium text-moss transition hover:bg-moss hover:text-white"
            title="Download the branded client-facing audit PDF — attach it to your first email"
          >
            <FileDown className="h-3.5 w-3.5" />
            Audit PDF
          </a>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4">
        {lead.scoreBreakdown?.length ? (
          <details className="group rounded-md border border-line bg-field">
            <summary className="flex cursor-pointer select-none items-center justify-between px-2.5 py-2 text-2xs font-semibold uppercase tracking-wide text-soft">
              Score breakdown · {lead.score}/100
              <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-1 border-t border-line/70 px-2.5 py-2">
              {lead.scoreBreakdown.map((part, index) => (
                <div
                  key={`${part.label}-${index}`}
                  className="flex items-center justify-between gap-2 text-2xs"
                >
                  <span className="text-ink/70">{part.label}</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      part.points >= 0 ? "text-moss" : "text-rust"
                    }`}
                  >
                    {part.points >= 0 ? `+${part.points}` : part.points}
                  </span>
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <CollapsibleSection
          title="Signals"
          badge={
            lead.painSignals.length ? (
              <span className="rounded-full bg-ink/10 px-1.5 tabular-nums">{lead.painSignals.length}</span>
            ) : null
          }
        >
          <div className="grid gap-1.5">
            {lead.painSignals.length ? (
              lead.painSignals.slice(0, 6).map((signal) => (
                <div key={signal.id} className="rounded-md border border-line bg-field p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{signal.title}</span>
                    <SeverityPill severity={signal.severity} />
                  </div>
                  <p className="mt-1 text-2xs leading-4 text-soft">{signal.detail}</p>
                  {signal.evidence ? (
                    <p className="mt-1 text-2xs text-ink/35">{signal.evidence}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-md border border-line bg-field p-2.5 text-2xs text-soft">
                No signals yet.
              </p>
            )}
          </div>
        </CollapsibleSection>

        {lead.audit?.pagespeed ? (
          <CollapsibleSection title="PageSpeed (Google)">
            <div className="grid gap-1.5 sm:grid-cols-2">
              <PageSpeedCard
                label="Mobile"
                icon={<Smartphone className="h-3.5 w-3.5" />}
                metrics={lead.audit.pagespeed.mobile}
              />
              <PageSpeedCard
                label="Desktop"
                icon={<Monitor className="h-3.5 w-3.5" />}
                metrics={lead.audit.pagespeed.desktop}
              />
            </div>
            <p className="mt-1.5 text-2xs text-ink/35">
              Checked {new Date(lead.audit.pagespeed.checkedAt).toLocaleString()}
            </p>
          </CollapsibleSection>
        ) : null}

        {lead.audit ? (
          <CollapsibleSection title="Website Audit" defaultOpen={false}>
            <div className="grid grid-cols-2 gap-1.5">
              <AuditMetric label="Health" value={`${lead.audit.healthScore}/100`} />
              <AuditMetric label="Load" value={`${lead.audit.loadMs}ms`} />
              <AuditMetric label="HTML" value={`${Math.round(lead.audit.htmlBytes / 1024)}KB`} />
              <AuditMetric label="Tech" value={lead.audit.technologies.join(", ") || "Unknown"} />
            </div>
            {lead.audit.crawlerSummary ? (
              <div className="mt-2 rounded-md border border-line bg-field p-2.5 text-2xs leading-5 text-ink/70">
                {lead.audit.crawlerSummary}
              </div>
            ) : null}
            {lead.audit.discoveredEmails?.length || lead.audit.discoveredPhones?.length ? (
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                <AuditMetric
                  label="Found emails"
                  value={lead.audit.discoveredEmails?.join(", ") || "None"}
                />
                <AuditMetric
                  label="Found phones"
                  value={lead.audit.discoveredPhones?.join(", ") || "None"}
                />
              </div>
            ) : null}
            {lead.audit.crawlPages?.length ? (
              <div className="mt-2 grid gap-1.5">
                {lead.audit.crawlPages.map((page) => (
                  <div key={page.url} className="rounded-md border border-line bg-field p-2.5">
                    <div className="break-words text-xs font-medium">
                      {page.title || page.url}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-2xs text-soft sm:grid-cols-4">
                      <span>{page.status || "No"} status</span>
                      <span>{page.wordCount} words</span>
                      <span>{page.forms} forms</span>
                      <span>{page.ctaCount} CTAs</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CollapsibleSection>
        ) : null}

        {lead.outreach ? (
          <CollapsibleSection
            title="Outreach Pack"
            badge={
              lead.outreach.aiGenerated ? (
                <Badge icon={<Sparkles className="h-3 w-3" />} tone="accent">
                  AI personalized
                </Badge>
              ) : null
            }
          >
            <div className="grid gap-2">
              <DraftBox
                title={`Email — ${lead.outreach.subject}`}
                body={lead.outreach.shortEmail}
                icon={<FileText className="h-3.5 w-3.5" />}
              />
              {lead.outreach.subjectOptions?.length ? (
                <div className="rounded-md border border-line bg-field px-2.5 py-2 text-2xs text-soft">
                  <span className="font-semibold uppercase tracking-wide">Alt subjects: </span>
                  {lead.outreach.subjectOptions.join(" · ")}
                </div>
              ) : null}
              {lead.outreach.whatsapp ? (
                <DraftBox
                  title="WhatsApp"
                  body={lead.outreach.whatsapp}
                  icon={<PhoneCall className="h-3.5 w-3.5" />}
                />
              ) : null}
              {lead.outreach.linkedinConnect ? (
                <DraftBox
                  title="LinkedIn — connection note"
                  body={lead.outreach.linkedinConnect}
                  icon={<Send className="h-3.5 w-3.5" />}
                />
              ) : null}
              {lead.outreach.linkedinNote &&
              lead.outreach.linkedinNote !== lead.outreach.linkedinConnect ? (
                <DraftBox
                  title="LinkedIn — after they accept"
                  body={lead.outreach.linkedinNote}
                  icon={<Send className="h-3.5 w-3.5" />}
                />
              ) : null}
              <DraftBox
                title="Call opener"
                body={lead.outreach.callOpener}
                icon={<PhoneCall className="h-3.5 w-3.5" />}
              />
              <DraftBox
                title="Contact form"
                body={lead.outreach.contactFormMessage}
                icon={<Send className="h-3.5 w-3.5" />}
              />

              {lead.outreach.followUps?.length ? (
                <details className="group rounded-md border border-line bg-field">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-2.5 py-2 text-2xs font-semibold uppercase tracking-wide text-soft">
                    Follow-up sequence ({lead.outreach.followUps.length})
                    <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-2 border-t border-line/70 p-2.5">
                    {lead.outreach.followUps.map((followUp, index) => (
                      <DraftBox
                        key={index}
                        title={`Day ${followUp.day} · ${followUp.channel}`}
                        body={followUp.message}
                        icon={<Send className="h-3.5 w-3.5" />}
                      />
                    ))}
                  </div>
                </details>
              ) : null}

              {lead.outreach.replyPlaybook?.length ? (
                <details className="group rounded-md border border-line bg-field">
                  <summary className="flex cursor-pointer select-none items-center justify-between px-2.5 py-2 text-2xs font-semibold uppercase tracking-wide text-soft">
                    Reply playbook — what to answer ({lead.outreach.replyPlaybook.length})
                    <ChevronDown className="h-3.5 w-3.5 transition group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-2 border-t border-line/70 p-2.5">
                    {lead.outreach.replyPlaybook.map((play, index) => (
                      <DraftBox
                        key={index}
                        title={`They say: "${play.intent}"`}
                        body={play.response}
                        icon={<FileText className="h-3.5 w-3.5" />}
                      />
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </CollapsibleSection>
        ) : null}

        <div>
          <SectionLabel>Move Status</SectionLabel>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {leadStatuses.map((status) => (
              <button
                key={status}
                className={`h-7 rounded-full border px-2.5 text-2xs font-medium transition ${
                  lead.status === status
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-white text-soft hover:border-ink/25 hover:text-ink"
                }`}
                onClick={() => onStatus(lead, status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>Follow-up</SectionLabel>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              type="date"
              className="input h-8 w-40"
              value={lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : ""}
              onChange={(event) => onFollowUp(lead, event.target.value || null)}
              disabled={busy === `follow-${lead.id}`}
            />
            {lead.nextFollowUpAt ? (
              <Button
                variant="ghost"
                onClick={() => onFollowUp(lead, null)}
                disabled={busy === `follow-${lead.id}`}
              >
                Clear
              </Button>
            ) : (
              <span className="text-2xs text-soft">No follow-up scheduled</span>
            )}
            {lead.lastContactedAt ? (
              <span className="text-2xs text-soft">
                Last contacted {new Date(lead.lastContactedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-2xs text-ink/35">
            Set automatically when you move status to Contacted or Follow-up.
          </p>
        </div>

        <Button
          variant="danger"
          onClick={() => onDelete(lead)}
          disabled={busy === `delete-${lead.id}`}
          busy={busy === `delete-${lead.id}`}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          className="justify-self-start"
        >
          Delete lead
        </Button>
      </div>
    </Panel>
  );
}
