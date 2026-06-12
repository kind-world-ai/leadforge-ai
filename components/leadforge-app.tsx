"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Lead, LeadInput, LeadStatus, SearchRun, ServiceFocus } from "@/lib/types";
import {
  defaultLeadForm,
  defaultManualMapsForm,
  defaultOsmForm,
  defaultSearchSources,
  type LeadForm,
  type ManualMapsForm,
  type OsmForm,
  type PlacesForm,
  type PlacesImportMode,
  type SearchPlanForm,
  type View
} from "@/components/app-state";
import {
  followUpPatchForStatus,
  isFollowUpDue,
  mergeStrings,
  nextActionForStatus,
  parseMapsPaste
} from "@/lib/lead-utils";
import Sidebar from "@/components/sidebar";
import { CollapsedRail, Metric } from "@/components/ui";
import {
  FollowUpStrip,
  LeadCapturePanel,
  LeadDetailPanel,
  LeadListPanel
} from "@/components/views/command-view";
import {
  AbnLookupPanel,
  DomainWatchPanel,
  GooglePlacesPanel,
  ManualMapsPanel,
  OsmImportPanel,
  SearchRunsPanel,
  SourcePlannerPanel
} from "@/components/views/source-view";
import { PipelinePanel } from "@/components/views/pipeline-view";
import { ImportHelpPanel, ImportPanel } from "@/components/views/import-view";
import { DatabaseView } from "@/components/views/database-view";
import { ScheduleView } from "@/components/views/schedule-view";
import { TeamView } from "@/components/views/team-view";

const viewTitles: Record<View, { title: string; subtitle: string }> = {
  command: {
    title: "Command",
    subtitle: "Capture leads, run audits, and draft outreach."
  },
  search: {
    title: "Source Engine",
    subtitle: "Import from Google Places, capture Maps research, and plan searches."
  },
  pipeline: {
    title: "Pipeline",
    subtitle: "Track every lead from first touch to won."
  },
  import: {
    title: "Import",
    subtitle: "Bulk-import pasted CSV rows or website lists."
  },
  database: {
    title: "Database",
    subtitle: "Every lead and every parameter. Sort, select, and run bulk diagnosis."
  },
  schedule: {
    title: "Schedule",
    subtitle: "Your follow-up queue — overdue first, then today and this week."
  },
  team: {
    title: "Team",
    subtitle: "Who shares this workspace. Add registered teammates by email."
  }
};

export default function LeadForgeApp() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchRuns, setSearchRuns] = useState<SearchRun[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>("command");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [leadForm, setLeadForm] = useState<LeadForm>(defaultLeadForm);
  const [showCapture, setShowCapture] = useState(false);
  const [showQueue, setShowQueue] = useState(true);
  const [searchForm, setSearchForm] = useState<SearchPlanForm>({
    market: "Tricity",
    country: "India",
    city: "Chandigarh Mohali Panchkula",
    sector: "Clinics",
    serviceFocus: "Website" as ServiceFocus,
    sourceMix: defaultSearchSources
  });
  const [placesForm, setPlacesForm] = useState<PlacesForm>({
    query: "clinics",
    country: "India",
    city: "Chandigarh Mohali Panchkula",
    sector: "Clinics",
    serviceFocus: "Website" as ServiceFocus,
    mode: "discovery" as PlacesImportMode,
    limit: 10,
    onlyMissingWebsite: false,
    autoAudit: false
  });
  const [manualMapsForm, setManualMapsForm] =
    useState<ManualMapsForm>(defaultManualMapsForm);
  const [osmForm, setOsmForm] = useState<OsmForm>(defaultOsmForm);
  const [importText, setImportText] = useState("");
  const [importDefaults, setImportDefaults] = useState<Partial<LeadInput>>({
    city: "Mohali",
    country: "India",
    sector: "Local service",
    source: "Manual",
    services: ["Website", "SEO"]
  });

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedLeadId && leads.length) setSelectedLeadId(leads[0].id);
  }, [leads, selectedLeadId]);

  const selectedLead = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? leads[0] ?? null,
    [leads, selectedLeadId]
  );

  const filteredLeads = useMemo(() => {
    const lowerQuery = query.toLowerCase().trim();
    return leads.filter((lead) => {
      const statusMatch = statusFilter === "All" || lead.status === statusFilter;
      if (!lowerQuery) return statusMatch;
      const haystack = [
        lead.businessName,
        lead.website ?? "",
        lead.city,
        lead.country,
        lead.sector,
        lead.source,
        lead.fitReason,
        lead.notes
      ]
        .join(" ")
        .toLowerCase();
      return statusMatch && haystack.includes(lowerQuery);
    });
  }, [leads, query, statusFilter]);

  const stats = useMemo(() => {
    const hot = leads.filter((lead) => lead.score >= 75).length;
    const noWebsite = leads.filter((lead) => !lead.website).length;
    const contacted = leads.filter((lead) =>
      ["Contacted", "Follow-up 1", "Follow-up 2", "Meeting", "Proposal", "Won"].includes(
        lead.status
      )
    ).length;
    const won = leads.filter((lead) => lead.status === "Won").length;
    return { total: leads.length, hot, noWebsite, contacted, won };
  }, [leads]);

  const dueLeads = useMemo(
    () =>
      leads
        .filter(
          (lead) =>
            isFollowUpDue(lead.nextFollowUpAt) &&
            lead.status !== "Won" &&
            lead.status !== "Lost"
        )
        .sort(
          (a, b) =>
            new Date(a.nextFollowUpAt ?? 0).getTime() -
            new Date(b.nextFollowUpAt ?? 0).getTime()
        ),
    [leads]
  );

  async function loadData() {
    setBusy("load");
    try {
      const [leadResponse, runResponse] = await Promise.all([
        fetch("/api/leads", { cache: "no-store" }),
        fetch("/api/search-runs", { cache: "no-store" })
      ]);
      const leadData = (await leadResponse.json()) as { leads: Lead[] };
      const runData = (await runResponse.json()) as { searchRuns: SearchRun[] };
      setLeads(leadData.leads ?? []);
      setSearchRuns(runData.searchRuns ?? []);
    } finally {
      setBusy(null);
    }
  }

  async function createLeadFromForm() {
    if (!leadForm.businessName?.trim()) {
      setNotice("Add a business name first.");
      return;
    }

    setBusy("create-lead");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(leadForm)
      });
      const data = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !data.lead) throw new Error(data.error || "Lead create failed");
      setLeadForm({ ...defaultLeadForm, city: leadForm.city, country: leadForm.country });
      setSelectedLeadId(data.lead.id);
      setNotice(`${data.lead.businessName} added.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Lead create failed.");
    } finally {
      setBusy(null);
    }
  }

  async function runSearchPlan() {
    setBusy("search-plan");
    try {
      const response = await fetch("/api/search-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(searchForm)
      });
      const data = (await response.json()) as { searchRun?: SearchRun; error?: string };
      if (!response.ok || !data.searchRun) throw new Error(data.error || "Search plan failed");
      setNotice(`Search plan created for ${data.searchRun.city}.`);
      setActiveView("search");
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Search plan failed.");
    } finally {
      setBusy(null);
    }
  }

  async function importGooglePlaces() {
    if (!placesForm.query.trim() || !placesForm.city.trim() || !placesForm.country.trim()) {
      setNotice("Add Google Places query, city, and country first.");
      return;
    }

    setBusy("places-import");
    try {
      const response = await fetch("/api/google-places/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(placesForm)
      });
      const data = (await response.json()) as {
        importedCount?: number;
        rawCount?: number;
        mode?: PlacesImportMode;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Google Places import failed");
      setNotice(
        `Imported ${data.importedCount ?? 0} ${data.mode ?? placesForm.mode} lead${data.importedCount === 1 ? "" : "s"} from ${data.rawCount ?? 0} Places result${data.rawCount === 1 ? "" : "s"}.`
      );
      setActiveView("command");
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Google Places import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function createManualMapsLead() {
    if (!manualMapsForm.businessName?.trim()) {
      setNotice("Add a business name first.");
      return;
    }

    const { rawPaste, autoAudit, ...leadInput } = manualMapsForm;
    const notes = [leadInput.notes, rawPaste ? `Manual capture paste:\n${rawPaste}` : ""]
      .filter(Boolean)
      .join("\n\n");

    setBusy("manual-maps");
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...leadInput,
          source: leadInput.source ?? "Google Maps",
          notes,
          tags: mergeStrings([...(leadInput.tags ?? []), "manual-capture"]),
          autoAudit
        })
      });
      const data = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !data.lead) throw new Error(data.error || "Manual capture failed");
      setManualMapsForm({
        ...defaultManualMapsForm,
        city: manualMapsForm.city,
        country: manualMapsForm.country,
        sector: manualMapsForm.sector,
        services: manualMapsForm.services
      });
      setSelectedLeadId(data.lead.id);
      setNotice(`${data.lead.businessName} saved from manual capture.`);
      setActiveView("command");
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Manual capture failed.");
    } finally {
      setBusy(null);
    }
  }

  async function importOsm() {
    if (!osmForm.query.trim() || !osmForm.city.trim() || !osmForm.country.trim()) {
      setNotice("Add OSM business type, city, and country first.");
      return;
    }
    setBusy("osm-import");
    setNotice("Querying OpenStreetMap (geocode + Overpass)…");
    try {
      const response = await fetch("/api/osm/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(osmForm)
      });
      const data = (await response.json()) as {
        importedCount?: number;
        rawCount?: number;
        withoutWebsite?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "OSM import failed");
      setNotice(
        `Imported ${data.importedCount ?? 0} OSM lead${data.importedCount === 1 ? "" : "s"} (${data.withoutWebsite ?? 0} without a website) from ${data.rawCount ?? 0} map results.`
      );
      setActiveView("command");
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "OSM import failed.");
    } finally {
      setBusy(null);
    }
  }

  async function addHuntedLead(input: LeadInput) {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    });
    const data = (await response.json()) as { lead?: Lead; error?: string };
    if (!response.ok || !data.lead) {
      setNotice(data.error || "Lead create failed.");
      throw new Error(data.error || "Lead create failed");
    }
    setNotice(`${data.lead.businessName} added from ${data.lead.source}.`);
    await loadData();
  }

  function parseManualMapsPaste() {
    setManualMapsForm(parseMapsPaste(manualMapsForm));
  }

  async function auditLead(lead: Lead) {
    setBusy(`audit-${lead.id}`);
    try {
      const response = await fetch(`/api/leads/${lead.id}/audit`, { method: "POST" });
      const data = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !data.lead) throw new Error(data.error || "Audit failed");
      setSelectedLeadId(data.lead.id);
      setNotice(`Audit completed for ${data.lead.businessName}.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Audit failed.");
    } finally {
      setBusy(null);
    }
  }

  async function crawlLead(lead: Lead) {
    setBusy(`crawl-${lead.id}`);
    try {
      const response = await fetch(`/api/leads/${lead.id}/crawl`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxPages: 5 })
      });
      const data = (await response.json()) as { lead?: Lead; queued?: boolean; error?: string };
      if (!response.ok || !data.lead) throw new Error(data.error || "Crawler failed");
      setSelectedLeadId(data.lead.id);
      setNotice(
        data.queued
          ? `Crawl for ${data.lead.businessName} queued for the worker machine.`
          : `Crawler completed for ${data.lead.businessName}.`
      );
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Crawler failed.");
    } finally {
      setBusy(null);
    }
  }

  async function enrichPlaceLead(lead: Lead) {
    setBusy(`place-${lead.id}`);
    try {
      const response = await fetch(`/api/leads/${lead.id}/places-enrich`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ autoAudit: false })
      });
      const data = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !data.lead)
        throw new Error(data.error || "Google Places enrich failed");
      setSelectedLeadId(data.lead.id);
      setNotice(`Google Places details added for ${data.lead.businessName}.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Google Places enrich failed.");
    } finally {
      setBusy(null);
    }
  }

  async function diagnoseLead(lead: Lead) {
    setBusy(`diagnose-${lead.id}`);
    setNotice(
      lead.website
        ? "Running full diagnosis: crawl → PageSpeed → rescore → outreach draft. This can take 1-2 minutes."
        : "No website — rescoring and drafting outreach from captured signals."
    );
    try {
      const response = await fetch(`/api/leads/${lead.id}/diagnose`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ maxPages: 5 })
      });
      const data = (await response.json()) as {
        lead?: Lead;
        warnings?: string[];
        queued?: boolean;
        error?: string;
      };
      if (!response.ok || !data.lead) throw new Error(data.error || "Diagnosis failed");
      setSelectedLeadId(data.lead.id);
      if (data.queued) {
        setNotice(
          `Diagnosis for ${data.lead.businessName} queued for the crawler worker — results will appear after the worker processes it (Refresh data to check).`
        );
      } else {
        const warningNote = data.warnings?.length ? ` (${data.warnings.join(" ")})` : "";
        setNotice(
          `Full diagnosis done for ${data.lead.businessName} — score ${data.lead.score}/100, outreach drafted.${warningNote}`
        );
      }
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Diagnosis failed.");
    } finally {
      setBusy(null);
    }
  }

  async function bulkDiagnose(targets: Lead[]) {
    if (!targets.length) return;
    setBusy("bulk-diagnose");
    let done = 0;
    const failures: string[] = [];
    try {
      for (const lead of targets) {
        setNotice(
          `Diagnosis queue: ${done + 1}/${targets.length} — ${lead.businessName}…`
        );
        try {
          const response = await fetch(`/api/leads/${lead.id}/diagnose`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ maxPages: 5 })
          });
          if (!response.ok) {
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(data.error || "failed");
          }
          done += 1;
        } catch (error) {
          failures.push(
            `${lead.businessName} (${error instanceof Error ? error.message : "failed"})`
          );
        }
      }
      setNotice(
        `Bulk diagnosis finished: ${done}/${targets.length} done${
          failures.length ? `. Failed: ${failures.join(", ")}` : "."
        }`
      );
      await loadData();
    } finally {
      setBusy(null);
    }
  }

  async function bulkDelete(targets: Lead[]) {
    if (!targets.length) return;
    setBusy("bulk-delete");
    let done = 0;
    try {
      for (const lead of targets) {
        const response = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
        if (response.ok) done += 1;
      }
      setNotice(`Deleted ${done} of ${targets.length} lead${targets.length === 1 ? "" : "s"}.`);
      setSelectedLeadId(null);
      await loadData();
    } finally {
      setBusy(null);
    }
  }

  function markContacted(lead: Lead) {
    const next: LeadStatus =
      lead.status === "Contacted"
        ? "Follow-up 1"
        : lead.status === "Follow-up 1"
          ? "Follow-up 2"
          : ["Follow-up 2", "Meeting", "Proposal"].includes(lead.status)
            ? lead.status
            : "Contacted";
    void updateStatus(lead, next);
  }

  async function pushFollowUp(lead: Lead, days: number) {
    const base = lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt) : new Date();
    base.setDate(base.getDate() + days);
    base.setHours(9, 0, 0, 0);
    await setFollowUp(lead, base.toISOString().slice(0, 10));
  }

  async function setFollowUp(lead: Lead, date: string | null) {
    setBusy(`follow-${lead.id}`);
    try {
      const nextFollowUpAt = date ? new Date(`${date}T09:00:00`).toISOString() : null;
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nextFollowUpAt })
      });
      const data = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !data.lead) throw new Error(data.error || "Follow-up update failed");
      setNotice(
        date
          ? `Follow-up for ${lead.businessName} set to ${date}.`
          : `Follow-up cleared for ${lead.businessName}.`
      );
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Follow-up update failed.");
    } finally {
      setBusy(null);
    }
  }

  async function webEnrichLead(lead: Lead) {
    setBusy(`web-${lead.id}`);
    setNotice("Searching the web for profiles (official search API)…");
    try {
      const response = await fetch(`/api/leads/${lead.id}/web-enrich`, { method: "POST" });
      const data = (await response.json()) as {
        lead?: Lead;
        foundWebsite?: boolean;
        profileCount?: number;
        error?: string;
      };
      if (!response.ok || !data.lead) throw new Error(data.error || "Web enrichment failed");
      setSelectedLeadId(data.lead.id);
      setNotice(
        `Found ${data.profileCount ?? 0} profile${data.profileCount === 1 ? "" : "s"} for ${data.lead.businessName}${data.foundWebsite ? " + their website" : ""}.`
      );
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Web enrichment failed.");
    } finally {
      setBusy(null);
    }
  }

  async function pageSpeedLead(lead: Lead) {
    setBusy(`psi-${lead.id}`);
    setNotice("Running Google PageSpeed (mobile + desktop). This can take up to a minute.");
    try {
      const response = await fetch(`/api/leads/${lead.id}/pagespeed`, { method: "POST" });
      const data = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !data.lead) throw new Error(data.error || "PageSpeed test failed");
      setSelectedLeadId(data.lead.id);
      const psi = data.lead.audit?.pagespeed;
      setNotice(
        `PageSpeed for ${data.lead.businessName}: mobile ${psi?.mobile?.performance ?? "—"}/100, desktop ${psi?.desktop?.performance ?? "—"}/100.`
      );
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "PageSpeed test failed.");
    } finally {
      setBusy(null);
    }
  }

  async function draftOutreach(lead: Lead) {
    setBusy(`draft-${lead.id}`);
    try {
      const response = await fetch(`/api/leads/${lead.id}/outreach`, { method: "POST" });
      const data = (await response.json()) as {
        lead?: Lead;
        usedAi?: boolean;
        aiError?: string;
        error?: string;
      };
      if (!response.ok || !data.lead) throw new Error(data.error || "Draft failed");
      setSelectedLeadId(data.lead.id);
      setNotice(
        data.usedAi
          ? `AI outreach pack ready for ${data.lead.businessName} — email, WhatsApp, LinkedIn, follow-ups and reply playbook.`
          : `Outreach draft ready for ${data.lead.businessName}${data.aiError ? ` (AI failed: ${data.aiError}; used template)` : " (template — add ANTHROPIC_API_KEY for AI personalization)"}.`
      );
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Draft failed.");
    } finally {
      setBusy(null);
    }
  }

  async function updateStatus(lead: Lead, status: LeadStatus) {
    setBusy(`status-${lead.id}`);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          nextAction: nextActionForStatus(status),
          ...followUpPatchForStatus(status)
        })
      });
      const data = (await response.json()) as { lead?: Lead; error?: string };
      if (!response.ok || !data.lead) throw new Error(data.error || "Status update failed");
      setNotice(`${lead.businessName} moved to ${status}.`);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Status update failed.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteLeadAction(lead: Lead) {
    setBusy(`delete-${lead.id}`);
    try {
      const response = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed");
      setNotice(`${lead.businessName} deleted.`);
      setSelectedLeadId(null);
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  }

  async function importLeadText() {
    setBusy("import");
    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: importText, defaults: importDefaults })
      });
      const data = (await response.json()) as { count?: number; error?: string };
      if (!response.ok) throw new Error(data.error || "Import failed");
      setNotice(`${data.count ?? 0} lead${data.count === 1 ? "" : "s"} imported.`);
      setImportText("");
      await loadData();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(null);
    }
  }

  const heading = viewTitles[activeView];

  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        totalLeads={stats.total}
        hotLeads={stats.hot}
        dueCount={dueLeads.length}
        refreshing={busy === "load"}
        onRefresh={() => void loadData()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-paper px-5">
          <div className="min-w-0">
            <h1 className="font-display text-base font-semibold tracking-tight">
              {heading.title}
            </h1>
            <p className="truncate text-2xs text-soft">{heading.subtitle}</p>
          </div>
          {notice ? (
            <div className="flex max-w-md items-center gap-2 rounded-md border border-line bg-white px-2.5 py-1.5 text-xs shadow-panel">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-moss" />
              <span className="truncate">{notice}</span>
              <button
                className="ml-1 text-ink/35 transition hover:text-ink"
                onClick={() => setNotice("")}
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : null}
        </header>

        {/* Content */}
        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeView === "command" ? (
            <>
              <FollowUpStrip leads={dueLeads} onSelect={setSelectedLeadId} />
              <section className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
                <Metric label="Total leads" value={stats.total} />
                <Metric label="Hot leads" value={stats.hot} tone="gold" />
                <Metric label="No website" value={stats.noWebsite} tone="rust" />
                <Metric label="Contacted" value={stats.contacted} tone="sky" />
                <Metric label="Won" value={stats.won} tone="green" />
              </section>
              <section
                className={`mt-3 grid items-start gap-3 ${
                  showCapture
                    ? "xl:grid-cols-[320px_minmax(0,1fr)]"
                    : "xl:grid-cols-[44px_minmax(0,1fr)]"
                }`}
              >
                {showCapture ? (
                  <LeadCapturePanel
                    form={leadForm}
                    setForm={setLeadForm}
                    busy={busy === "create-lead"}
                    onSubmit={() => void createLeadFromForm()}
                    onCollapse={() => setShowCapture(false)}
                  />
                ) : (
                  <CollapsedRail label="Add Lead" onExpand={() => setShowCapture(true)} />
                )}
                <div
                  className={`grid items-start gap-3 ${
                    showQueue
                      ? "xl:grid-cols-[minmax(0,1fr)_minmax(440px,1.15fr)]"
                      : "xl:grid-cols-[44px_minmax(0,1fr)]"
                  }`}
                >
                  {showQueue ? (
                    <LeadListPanel
                      leads={filteredLeads}
                      query={query}
                      setQuery={setQuery}
                      statusFilter={statusFilter}
                      setStatusFilter={setStatusFilter}
                      selectedLeadId={selectedLead?.id ?? null}
                      onSelect={setSelectedLeadId}
                      onCollapse={() => setShowQueue(false)}
                    />
                  ) : (
                    <CollapsedRail
                      label="Lead Queue"
                      count={filteredLeads.length}
                      onExpand={() => setShowQueue(true)}
                    />
                  )}
                  <LeadDetailPanel
                    lead={selectedLead}
                    busy={busy}
                    onAudit={auditLead}
                    onCrawl={crawlLead}
                    onEnrichPlace={enrichPlaceLead}
                    onWebEnrich={webEnrichLead}
                    onPageSpeed={pageSpeedLead}
                    onDiagnose={diagnoseLead}
                    onDraft={draftOutreach}
                    onStatus={updateStatus}
                    onFollowUp={setFollowUp}
                    onDelete={deleteLeadAction}
                  />
                </div>
              </section>
            </>
          ) : null}

          {activeView === "search" ? (
            <section className="grid items-start gap-3 xl:grid-cols-[420px_minmax(0,1fr)]">
              <div className="grid gap-3">
                <GooglePlacesPanel
                  form={placesForm}
                  setForm={setPlacesForm}
                  busy={busy === "places-import"}
                  onSubmit={() => void importGooglePlaces()}
                />
                <OsmImportPanel
                  form={osmForm}
                  setForm={setOsmForm}
                  busy={busy === "osm-import"}
                  onSubmit={() => void importOsm()}
                />
                <ManualMapsPanel
                  form={manualMapsForm}
                  setForm={setManualMapsForm}
                  busy={busy === "manual-maps"}
                  onParse={parseManualMapsPaste}
                  onSubmit={() => void createManualMapsLead()}
                />
                <SourcePlannerPanel
                  form={searchForm}
                  setForm={setSearchForm}
                  busy={busy === "search-plan"}
                  onSubmit={() => void runSearchPlan()}
                />
              </div>
              <div className="grid gap-3">
                <DomainWatchPanel onAddLead={addHuntedLead} />
                <AbnLookupPanel onAddLead={addHuntedLead} />
                <SearchRunsPanel searchRuns={searchRuns} />
              </div>
            </section>
          ) : null}

          {activeView === "pipeline" ? (
            <PipelinePanel
              leads={leads}
              onSelect={setSelectedLeadId}
              setActiveView={setActiveView}
            />
          ) : null}

          {activeView === "database" ? (
            <DatabaseView
              leads={leads}
              busy={busy}
              onOpen={(id) => {
                setSelectedLeadId(id);
                setActiveView("command");
              }}
              onStatus={updateStatus}
              onBulkDiagnose={(targets) => void bulkDiagnose(targets)}
              onBulkDelete={bulkDelete}
            />
          ) : null}

          {activeView === "schedule" ? (
            <ScheduleView
              leads={leads}
              busy={busy}
              onOpen={(id) => {
                setSelectedLeadId(id);
                setActiveView("command");
              }}
              onMarkContacted={markContacted}
              onPush={(lead, days) => void pushFollowUp(lead, days)}
            />
          ) : null}

          {activeView === "team" ? <TeamView onNotice={setNotice} /> : null}

          {activeView === "import" ? (
            <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
              <ImportPanel
                text={importText}
                setText={setImportText}
                defaults={importDefaults}
                setDefaults={setImportDefaults}
                busy={busy === "import"}
                onImport={() => void importLeadText()}
              />
              <ImportHelpPanel />
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );
}
