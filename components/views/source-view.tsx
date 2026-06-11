"use client";

import {
  ClipboardList,
  Compass,
  FileDown,
  Globe2,
  Landmark,
  Map as MapIcon,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Target
} from "lucide-react";
import { useState } from "react";
import type { LeadInput, LeadSource, SearchRun, ServiceFocus } from "@/lib/types";
import { leadSources, serviceOptions } from "@/lib/types";
import type {
  ManualMapsForm,
  OsmForm,
  PlacesForm,
  PlacesImportMode,
  SearchPlanForm
} from "@/components/app-state";
import {
  Badge,
  Button,
  CheckRow,
  EmptyState,
  Field,
  Panel,
  SectionLabel,
  ServicePicker
} from "@/components/ui";

export function GooglePlacesPanel({
  form,
  setForm,
  busy,
  onSubmit
}: {
  form: PlacesForm;
  setForm: (form: PlacesForm) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  function setMode(mode: PlacesImportMode) {
    setForm({
      ...form,
      mode,
      onlyMissingWebsite: mode === "enriched" ? form.onlyMissingWebsite : false,
      autoAudit: mode === "enriched" ? form.autoAudit : false
    });
  }

  return (
    <Panel
      title="Google Places Import"
      badge={
        <Badge icon={<MapPin className="h-3 w-3" />} tone="green">
          Official API
        </Badge>
      }
    >
      <div className="grid gap-2.5">
        <Field label="Search query">
          <input
            className="input"
            value={form.query}
            onChange={(event) => setForm({ ...form, query: event.target.value })}
            placeholder="dentists, clinics, restaurants"
          />
        </Field>
        <div>
          <SectionLabel>Mode</SectionLabel>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            <ModeButton
              active={form.mode === "discovery"}
              title="Discovery"
              subtitle="Name + Maps"
              onClick={() => setMode("discovery")}
            />
            <ModeButton
              active={form.mode === "enriched"}
              title="Enriched"
              subtitle="Website + phone"
              onClick={() => setMode("enriched")}
            />
          </div>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="City or cluster">
            <input
              className="input"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>
          <Field label="Country">
            <input
              className="input"
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Sector label">
            <input
              className="input"
              value={form.sector}
              onChange={(event) => setForm({ ...form, sector: event.target.value })}
            />
          </Field>
          <Field label="Service focus">
            <select
              className="input"
              value={form.serviceFocus}
              onChange={(event) =>
                setForm({ ...form, serviceFocus: event.target.value as ServiceFocus })
              }
            >
              {serviceOptions.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Import limit">
          <input
            className="input"
            type="number"
            min={1}
            max={20}
            value={form.limit}
            onChange={(event) => setForm({ ...form, limit: Number(event.target.value || 10) })}
          />
        </Field>
        <div className="grid gap-1.5">
          <CheckRow
            checked={form.mode === "enriched" && form.onlyMissingWebsite}
            disabled={form.mode === "discovery"}
            onChange={(onlyMissingWebsite) => setForm({ ...form, onlyMissingWebsite })}
          >
            Import only businesses with no website
          </CheckRow>
          <CheckRow
            checked={form.mode === "enriched" && form.autoAudit}
            disabled={form.mode === "discovery"}
            onChange={(autoAudit) => setForm({ ...form, autoAudit })}
          >
            Auto-audit imported websites
          </CheckRow>
        </div>
        <Button onClick={onSubmit} disabled={busy} busy={busy} icon={<MapPin className="h-3.5 w-3.5" />}>
          {form.mode === "discovery" ? "Run discovery import" : "Import enriched leads"}
        </Button>
        <p className="text-2xs leading-4 text-soft">
          {form.mode === "discovery"
            ? "Discovery saves the place ID first. Use Enrich place after a lead looks useful."
            : "Enriched requests website and phone fields now."}{" "}
          Requires <code className="rounded bg-field px-1">GOOGLE_PLACES_API_KEY</code> in{" "}
          <code className="rounded bg-field px-1">.env.local</code>.
        </p>
      </div>
    </Panel>
  );
}

function ModeButton({
  active,
  title,
  subtitle,
  onClick
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`rounded-md border px-2.5 py-2 text-left transition ${
        active
          ? "border-accent/50 bg-accent/10"
          : "border-line bg-field hover:border-ink/25"
      }`}
      onClick={onClick}
    >
      <span className={`block text-xs font-semibold ${active ? "text-accent-deep" : "text-ink"}`}>
        {title}
      </span>
      <span className="mt-0.5 block text-2xs text-soft">{subtitle}</span>
    </button>
  );
}

export function OsmImportPanel({
  form,
  setForm,
  busy,
  onSubmit
}: {
  form: OsmForm;
  setForm: (form: OsmForm) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <Panel
      title="OpenStreetMap Import"
      badge={
        <Badge icon={<MapIcon className="h-3 w-3" />} tone="accent">
          Free · no key
        </Badge>
      }
    >
      <div className="grid gap-2.5">
        <Field label="Business type">
          <input
            className="input"
            value={form.query}
            onChange={(event) => setForm({ ...form, query: event.target.value })}
            placeholder="dentist, clinic, restaurant, salon, gym…"
          />
        </Field>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="City">
            <input
              className="input"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>
          <Field label="Country">
            <input
              className="input"
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Field label="Sector label">
            <input
              className="input"
              value={form.sector}
              onChange={(event) => setForm({ ...form, sector: event.target.value })}
            />
          </Field>
          <Field label="Service focus">
            <select
              className="input"
              value={form.serviceFocus}
              onChange={(event) =>
                setForm({ ...form, serviceFocus: event.target.value as ServiceFocus })
              }
            >
              {serviceOptions.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </Field>
          <Field label="Limit">
            <input
              className="input"
              type="number"
              min={1}
              max={40}
              value={form.limit}
              onChange={(event) => setForm({ ...form, limit: Number(event.target.value || 15) })}
            />
          </Field>
        </div>
        <CheckRow
          checked={form.onlyMissingWebsite}
          onChange={(onlyMissingWebsite) => setForm({ ...form, onlyMissingWebsite })}
        >
          Import only businesses with no website (best prospects)
        </CheckRow>
        <Button onClick={onSubmit} disabled={busy} busy={busy} icon={<MapIcon className="h-3.5 w-3.5" />}>
          Import from OpenStreetMap
        </Button>
        <p className="text-2xs leading-4 text-soft">
          Free open data (ODbL) — no API key, worldwide coverage. Public servers are
          rate-limited, so keep imports small and spaced out. Data © OpenStreetMap contributors.
        </p>
      </div>
    </Panel>
  );
}

export function DomainWatchPanel({
  onAddLead
}: {
  onAddLead: (input: LeadInput) => Promise<void>;
}) {
  const [keyword, setKeyword] = useState("");
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<{ domain: string; firstSeen: string }[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function search() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/domain-watch?q=${encodeURIComponent(keyword)}&days=${days}`
      );
      const data = (await response.json()) as {
        domains?: { domain: string; firstSeen: string }[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Domain watch failed");
      setResults(data.domains ?? []);
      if (!data.domains?.length) setError("No new domains found for this keyword/window.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Domain watch failed");
    } finally {
      setLoading(false);
    }
  }

  async function add(domain: string) {
    await onAddLead({
      businessName: domain.replace(/^www\./, ""),
      website: `https://${domain}`,
      source: "Domain Watch",
      tags: ["new-domain"],
      notes: `Found via certificate transparency (crt.sh). New domain — likely a new business or a website refresh in progress.`
    });
    setAdded(new Set([...added, domain]));
  }

  return (
    <Panel
      title="New-Domain Finder"
      badge={
        <Badge icon={<Globe2 className="h-3 w-3" />} tone="blue">
          crt.sh · free
        </Badge>
      }
    >
      <div className="grid gap-2.5">
        <div className="flex gap-1.5">
          <input
            className="input flex-1"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder='Keyword, e.g. "dental", "mohali", "salon"'
            onKeyDown={(event) => {
              if (event.key === "Enter" && keyword.trim().length >= 3) void search();
            }}
          />
          <select
            className="input w-28"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
          <Button
            variant="secondary"
            onClick={() => void search()}
            disabled={loading || keyword.trim().length < 3}
            busy={loading}
            icon={<Search className="h-3.5 w-3.5" />}
          >
            Scan
          </Button>
        </div>
        {error ? <p className="text-2xs text-rust">{error}</p> : null}
        {results.length ? (
          <div className="max-h-72 overflow-auto rounded-md border border-line">
            {results.map((result) => (
              <div
                key={result.domain}
                className="flex items-center justify-between gap-2 border-b border-line/60 px-2.5 py-1.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{result.domain}</div>
                  <div className="text-2xs text-soft">
                    First seen {result.firstSeen ? new Date(result.firstSeen).toLocaleDateString() : "recently"}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void add(result.domain)}
                  disabled={added.has(result.domain)}
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  {added.has(result.domain) ? "Added" : "Add lead"}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-2xs leading-4 text-soft">
          Searches public certificate-transparency logs for newly registered domains matching
          your keyword — new businesses investing online right now. Free public service; can be slow.
        </p>
      </div>
    </Panel>
  );
}

export function AbnLookupPanel({
  onAddLead
}: {
  onAddLead: (input: LeadInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<
    { abn: string; status: string; name: string; nameType: string; state: string; postcode: string }[]
  >([]);
  const [added, setAdded] = useState<Set<string>>(new Set());

  async function search() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/abn-search?name=${encodeURIComponent(name)}`);
      const data = (await response.json()) as {
        results?: typeof results;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "ABN lookup failed");
      setResults(data.results ?? []);
      if (!data.results?.length) setError("No matches found.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ABN lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function add(result: (typeof results)[number]) {
    await onAddLead({
      businessName: result.name,
      city: result.postcode ? `${result.state} ${result.postcode}` : result.state || "Unknown city",
      country: "Australia",
      source: "Registry",
      tags: ["abn"],
      notes: `ABN ${result.abn} (${result.status}). Found via ABN Lookup — verify website and contact manually.`
    });
    setAdded(new Set([...added, result.abn + result.name]));
  }

  return (
    <Panel
      title="ABN Lookup (Australia)"
      badge={
        <Badge icon={<Landmark className="h-3 w-3" />} tone="green">
          Official registry
        </Badge>
      }
    >
      <div className="grid gap-2.5">
        <div className="flex gap-1.5">
          <input
            className="input flex-1"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Business name, e.g. plumbing Sydney"
            onKeyDown={(event) => {
              if (event.key === "Enter" && name.trim().length >= 3) void search();
            }}
          />
          <Button
            variant="secondary"
            onClick={() => void search()}
            disabled={loading || name.trim().length < 3}
            busy={loading}
            icon={<Search className="h-3.5 w-3.5" />}
          >
            Search
          </Button>
        </div>
        {error ? <p className="text-2xs text-rust">{error}</p> : null}
        {results.length ? (
          <div className="max-h-72 overflow-auto rounded-md border border-line">
            {results.map((result) => (
              <div
                key={result.abn + result.name}
                className="flex items-center justify-between gap-2 border-b border-line/60 px-2.5 py-1.5 last:border-b-0"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium">{result.name}</div>
                  <div className="text-2xs text-soft">
                    ABN {result.abn} · {result.state} {result.postcode} · {result.status}
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void add(result)}
                  disabled={added.has(result.abn + result.name)}
                  icon={<Plus className="h-3.5 w-3.5" />}
                >
                  {added.has(result.abn + result.name) ? "Added" : "Add lead"}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <p className="text-2xs leading-4 text-soft">
          Official Australian Business Register. Needs a free GUID from
          abr.business.gov.au/Tools/WebServices in <code className="rounded bg-field px-1">.env.local</code> as{" "}
          <code className="rounded bg-field px-1">ABN_LOOKUP_GUID</code>.
        </p>
      </div>
    </Panel>
  );
}

const captureSources: { label: string; source: LeadSource }[] = [
  { label: "Google Maps", source: "Google Maps" },
  { label: "Justdial", source: "Directory" },
  { label: "IndiaMART", source: "Directory" },
  { label: "Sulekha", source: "Directory" },
  { label: "Yellow Pages", source: "Directory" },
  { label: "Exhibitor list", source: "Directory" },
  { label: "Tender portal", source: "RFP/Tender" },
  { label: "Other directory", source: "Directory" }
];

export function ManualMapsPanel({
  form,
  setForm,
  busy,
  onParse,
  onSubmit
}: {
  form: ManualMapsForm;
  setForm: (form: ManualMapsForm) => void;
  busy: boolean;
  onParse: () => void;
  onSubmit: () => void;
}) {
  const viaTag = form.tags?.find((tag) => tag.startsWith("via:"))?.slice(4);
  const currentCapture = viaTag ?? "Google Maps";

  function setCaptureSource(label: string) {
    const option = captureSources.find((item) => item.label === label) ?? captureSources[0];
    const baseTags = (form.tags ?? []).filter(
      (tag) => !tag.startsWith("via:") && tag !== "manual-maps"
    );
    setForm({
      ...form,
      source: option.source,
      tags: [...baseTags, "manual-capture", `via:${option.label}`]
    });
  }

  return (
    <Panel
      title="Manual Capture"
      badge={
        <Badge icon={<ShieldCheck className="h-3 w-3" />} tone="blue">
          No scraping
        </Badge>
      }
    >
      <div className="grid gap-2.5">
        <Field label="Captured from">
          <select
            className="input"
            value={currentCapture}
            onChange={(event) => setCaptureSource(event.target.value)}
          >
            {captureSources.map((item) => (
              <option key={item.label}>{item.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Paste details">
          <textarea
            className="input min-h-20 resize-y"
            value={form.rawPaste}
            onChange={(event) => setForm({ ...form, rawPaste: event.target.value })}
            placeholder="Business name, phone, website, listing link, address — from any directory"
          />
        </Field>
        <Button
          variant="secondary"
          onClick={onParse}
          disabled={!form.rawPaste.trim()}
          icon={<ClipboardList className="h-3.5 w-3.5" />}
          title="Extract fields from pasted details"
        >
          Parse paste
        </Button>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Business name">
            <input
              className="input"
              value={form.businessName}
              onChange={(event) => setForm({ ...form, businessName: event.target.value })}
            />
          </Field>
          <Field label="Listing URL">
            <input
              className="input"
              value={form.sourceUrl ?? ""}
              onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
              placeholder="Maps / Justdial / directory listing link"
            />
          </Field>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Field label="Website">
            <input
              className="input"
              value={form.website ?? ""}
              onChange={(event) => setForm({ ...form, website: event.target.value })}
            />
          </Field>
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
        <div className="grid gap-2.5 sm:grid-cols-3">
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
          <Field label="Sector">
            <input
              className="input"
              value={form.sector ?? ""}
              onChange={(event) => setForm({ ...form, sector: event.target.value })}
            />
          </Field>
        </div>
        <ServicePicker
          selected={form.services ?? []}
          onChange={(services) => setForm({ ...form, services })}
        />
        <CheckRow checked={form.autoAudit} onChange={(autoAudit) => setForm({ ...form, autoAudit })}>
          Audit website after saving
        </CheckRow>
        <Field label="Notes">
          <textarea
            className="input min-h-16 resize-y"
            value={form.notes ?? ""}
            onChange={(event) => setForm({ ...form, notes: event.target.value })}
          />
        </Field>
        <Button
          onClick={onSubmit}
          disabled={busy || !form.businessName.trim()}
          busy={busy}
          icon={<Plus className="h-3.5 w-3.5" />}
        >
          Save captured lead
        </Button>
      </div>
    </Panel>
  );
}

export function SourcePlannerPanel({
  form,
  setForm,
  busy,
  onSubmit
}: {
  form: SearchPlanForm;
  setForm: (form: SearchPlanForm) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  function toggleSource(source: LeadSource) {
    const hasSource = form.sourceMix.includes(source);
    setForm({
      ...form,
      sourceMix: hasSource
        ? form.sourceMix.filter((item) => item !== source)
        : [...form.sourceMix, source]
    });
  }

  return (
    <Panel title="Source Planner">
      <div className="grid gap-2.5">
        <Field label="Market">
          <input
            className="input"
            value={form.market}
            onChange={(event) => setForm({ ...form, market: event.target.value })}
          />
        </Field>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Country">
            <input
              className="input"
              value={form.country}
              onChange={(event) => setForm({ ...form, country: event.target.value })}
            />
          </Field>
          <Field label="City or cluster">
            <input
              className="input"
              value={form.city}
              onChange={(event) => setForm({ ...form, city: event.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <Field label="Sector">
            <input
              className="input"
              value={form.sector}
              onChange={(event) => setForm({ ...form, sector: event.target.value })}
            />
          </Field>
          <Field label="Service focus">
            <select
              className="input"
              value={form.serviceFocus}
              onChange={(event) =>
                setForm({ ...form, serviceFocus: event.target.value as ServiceFocus })
              }
            >
              {serviceOptions.map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </Field>
        </div>
        <div>
          <SectionLabel>Sources</SectionLabel>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {leadSources
              .filter((source) => source !== "Manual" && source !== "Referral")
              .map((source) => (
                <CheckRow
                  key={source}
                  checked={form.sourceMix.includes(source)}
                  onChange={() => toggleSource(source)}
                >
                  {source}
                </CheckRow>
              ))}
          </div>
        </div>
        <Button onClick={onSubmit} disabled={busy} busy={busy} icon={<Compass className="h-3.5 w-3.5" />}>
          Create search run
        </Button>
      </div>
    </Panel>
  );
}

export function SearchRunsPanel({ searchRuns }: { searchRuns: SearchRun[] }) {
  return (
    <Panel
      title="Search Runs"
      badge={
        <Badge icon={<FileDown className="h-3 w-3" />} tone="blue">
          Query bank
        </Badge>
      }
    >
      <div className="grid gap-3">
        {searchRuns.length ? (
          searchRuns.map((run) => (
            <div key={run.id} className="rounded-lg border border-line p-3">
              <div className="flex flex-col gap-1.5 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xs font-semibold">
                    {run.sector} in {run.city}
                  </h3>
                  <p className="mt-0.5 text-2xs text-soft">{run.notes}</p>
                </div>
                <Badge icon={<Target className="h-3 w-3" />} tone="gold">
                  {run.serviceFocus}
                </Badge>
              </div>
              <div className="mt-2.5 grid gap-1.5">
                {run.tasks.map((task) => (
                  <div key={task.id} className="rounded-md border border-line bg-field p-2.5">
                    <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs font-medium">{task.query}</div>
                        <div className="mt-0.5 text-2xs text-soft">{task.intent}</div>
                      </div>
                      <Badge icon={<Search className="h-3 w-3" />} tone="neutral">
                        {task.source}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-2xs text-ink/65">{task.action}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No search runs"
            text="Create one for Tricity, Australia, USA, or any niche."
          />
        )}
      </div>
    </Panel>
  );
}
