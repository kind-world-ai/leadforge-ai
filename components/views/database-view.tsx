"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  ExternalLink,
  Search,
  Trash2,
  X,
  Zap
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { leadStatuses } from "@/lib/types";
import { Button, EmptyState, Panel, ScorePill } from "@/components/ui";

type SortKey =
  | "businessName"
  | "score"
  | "status"
  | "health"
  | "psiMobile"
  | "psiDesktop"
  | "signals"
  | "nextFollowUpAt"
  | "updatedAt";

type SortDir = "asc" | "desc";

const numberOrNull = {
  health: (lead: Lead) => (lead.audit && lead.audit.status !== 0 ? lead.audit.healthScore : null),
  psiMobile: (lead: Lead) => lead.audit?.pagespeed?.mobile?.performance ?? null,
  psiDesktop: (lead: Lead) => lead.audit?.pagespeed?.desktop?.performance ?? null,
  signals: (lead: Lead) => lead.painSignals.length
};

function sortValue(lead: Lead, key: SortKey): string | number {
  switch (key) {
    case "businessName":
      return lead.businessName.toLowerCase();
    case "score":
      return lead.score;
    case "status":
      return leadStatuses.indexOf(lead.status);
    case "health":
      return numberOrNull.health(lead) ?? -1;
    case "psiMobile":
      return numberOrNull.psiMobile(lead) ?? -1;
    case "psiDesktop":
      return numberOrNull.psiDesktop(lead) ?? -1;
    case "signals":
      return lead.painSignals.length;
    case "nextFollowUpAt":
      return lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).getTime() : Infinity;
    case "updatedAt":
      return new Date(lead.updatedAt).getTime();
  }
}

export function DatabaseView({
  leads,
  busy,
  onOpen,
  onStatus,
  onBulkDiagnose,
  onBulkDelete
}: {
  leads: Lead[];
  busy: string | null;
  onOpen: (id: string) => void;
  onStatus: (lead: Lead, status: LeadStatus) => void;
  onBulkDiagnose: (leads: Lead[]) => void;
  onBulkDelete: (leads: Lead[]) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const lower = query.toLowerCase().trim();
    const filtered = leads.filter((lead) => {
      const statusMatch = statusFilter === "All" || lead.status === statusFilter;
      if (!lower) return statusMatch;
      const haystack =
        `${lead.businessName} ${lead.website ?? ""} ${lead.city} ${lead.country} ${lead.sector} ${lead.source} ${lead.email ?? ""} ${lead.phone ?? ""}`.toLowerCase();
      return statusMatch && haystack.includes(lower);
    });
    const sorted = [...filtered].sort((a, b) => {
      const va = sortValue(a, sortKey);
      const vb = sortValue(b, sortKey);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [leads, query, statusFilter, sortKey, sortDir]);

  const selectedLeads = useMemo(
    () => rows.filter((lead) => selected.has(lead.id)),
    [rows, selected]
  );
  const allVisibleSelected = rows.length > 0 && rows.every((lead) => selected.has(lead.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "businessName" ? "asc" : "desc");
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (allVisibleSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((lead) => lead.id)));
    }
  }

  function exportSelection() {
    const items = selectedLeads.length ? selectedLeads : rows;
    const header = [
      "business",
      "website",
      "city",
      "country",
      "sector",
      "source",
      "status",
      "score",
      "health",
      "psi_mobile",
      "psi_desktop",
      "signals",
      "email",
      "phone",
      "next_follow_up",
      "last_contacted",
      "notes"
    ];
    const escape = (value: unknown) => {
      const text = String(value ?? "");
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [
      header.join(","),
      ...items.map((lead) =>
        [
          lead.businessName,
          lead.website ?? "",
          lead.city,
          lead.country,
          lead.sector,
          lead.source,
          lead.status,
          lead.score,
          numberOrNull.health(lead) ?? "",
          numberOrNull.psiMobile(lead) ?? "",
          numberOrNull.psiDesktop(lead) ?? "",
          lead.painSignals.length,
          lead.email ?? "",
          lead.phone ?? "",
          lead.nextFollowUpAt ? lead.nextFollowUpAt.slice(0, 10) : "",
          lead.lastContactedAt ? lead.lastContactedAt.slice(0, 10) : "",
          lead.notes
        ]
          .map(escape)
          .join(",")
      )
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `leadforge-export-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const bulkBusy = busy === "bulk-diagnose";

  return (
    <Panel className="flex h-full min-h-0 flex-col">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-sm font-semibold tracking-tight">
          Database
          <span className="ml-2 text-2xs font-normal text-soft">
            {rows.length} of {leads.length} leads
          </span>
        </h2>
        <div className="flex gap-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
            <input
              className="input h-8 w-full pl-8 md:w-56"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search all leads"
            />
          </div>
          <select
            className="input h-8 w-32"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as LeadStatus | "All")}
          >
            <option>All</option>
            {leadStatuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={exportSelection} icon={<Download className="h-3.5 w-3.5" />}>
            Export
          </Button>
        </div>
      </div>

      <div className="relative mt-3 min-h-0 flex-1 overflow-auto rounded-md border border-line">
        {rows.length ? (
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-field text-left text-2xs uppercase tracking-wide text-soft">
              <tr>
                <th className="w-8 px-2 py-1.5">
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                  />
                </th>
                <SortHeader label="Lead" sortKey="businessName" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Score" sortKey="score" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Health" sortKey="health" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="PSI M" sortKey="psiMobile" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="PSI D" sortKey="psiDesktop" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Signals" sortKey="signals" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-2.5 py-1.5 font-semibold">Coverage</th>
                <th className="px-2.5 py-1.5 font-semibold">Contact</th>
                <SortHeader label="Follow-up" sortKey="nextFollowUpAt" current={sortKey} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Updated" sortKey="updatedAt" current={sortKey} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr
                  key={lead.id}
                  className={`border-t border-line/70 transition hover:bg-field ${
                    selected.has(lead.id) ? "bg-accent/5" : ""
                  }`}
                >
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      className="accent-accent"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleRow(lead.id)}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <button
                      className="text-left text-xs font-medium hover:text-accent-deep"
                      onClick={() => onOpen(lead.id)}
                      title="Open in Command"
                    >
                      {lead.businessName}
                      <ExternalLink className="ml-1 inline h-2.5 w-2.5 opacity-40" />
                    </button>
                    <div className="text-2xs text-soft">
                      {lead.city} · {lead.sector} · {lead.source}
                    </div>
                  </td>
                  <td className="px-2.5 py-2">
                    <ScorePill score={lead.score} compact />
                  </td>
                  <td className="px-2.5 py-2">
                    <select
                      className="h-7 rounded-md border border-line bg-white px-1.5 text-2xs"
                      value={lead.status}
                      onChange={(event) => onStatus(lead, event.target.value as LeadStatus)}
                      disabled={busy === `status-${lead.id}`}
                    >
                      {leadStatuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </td>
                  <NumberCell value={numberOrNull.health(lead)} suffix="/100" />
                  <NumberCell value={numberOrNull.psiMobile(lead)} />
                  <NumberCell value={numberOrNull.psiDesktop(lead)} />
                  <td className="px-2.5 py-2 text-2xs tabular-nums">
                    <SignalCounts lead={lead} />
                  </td>
                  <td className="px-2.5 py-2">
                    <CoverageDots lead={lead} />
                  </td>
                  <td className="px-2.5 py-2 text-2xs text-soft">
                    <div className="max-w-36 truncate">{lead.email || "—"}</div>
                    <div className="max-w-36 truncate">{lead.phone || ""}</div>
                  </td>
                  <td className="px-2.5 py-2 text-2xs tabular-nums text-soft">
                    {lead.nextFollowUpAt ? (
                      <FollowUpDate iso={lead.nextFollowUpAt} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-2.5 py-2 text-2xs tabular-nums text-soft">
                    {new Date(lead.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="No leads match" text="Adjust the search or status filter." />
        )}
      </div>

      {selected.size > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-accent/30 bg-accent/5 px-3 py-2">
          <span className="text-xs font-semibold text-accent-deep">
            {selected.size} selected
          </span>
          <Button
            onClick={() => onBulkDiagnose(selectedLeads)}
            disabled={bulkBusy}
            busy={bulkBusy}
            icon={<Zap className="h-3.5 w-3.5" />}
          >
            {bulkBusy ? "Running diagnosis queue…" : "Run full diagnosis"}
          </Button>
          <Button variant="secondary" onClick={exportSelection} icon={<Download className="h-3.5 w-3.5" />}>
            Export selection
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  `Delete ${selected.size} lead${selected.size === 1 ? "" : "s"} permanently? This cannot be undone.`
                )
              ) {
                void onBulkDelete(selectedLeads).then(() => setSelected(new Set()));
              }
            }}
            disabled={busy === "bulk-delete"}
            busy={busy === "bulk-delete"}
            icon={<Trash2 className="h-3.5 w-3.5" />}
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={() => setSelected(new Set())} icon={<X className="h-3.5 w-3.5" />}>
            Clear
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  dir,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th className="px-2.5 py-1.5 font-semibold">
      <button
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-ink ${
          active ? "text-ink" : ""
        }`}
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active ? (
          dir === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

function NumberCell({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value == null) {
    return <td className="px-2.5 py-2 text-2xs text-ink/30">—</td>;
  }
  const tone = value >= 75 ? "text-moss" : value >= 50 ? "text-gold" : "text-rust";
  return (
    <td className={`px-2.5 py-2 text-xs font-medium tabular-nums ${tone}`}>
      {value}
      <span className="text-2xs opacity-60">{suffix}</span>
    </td>
  );
}

function SignalCounts({ lead }: { lead: Lead }) {
  const high = lead.painSignals.filter((signal) => signal.severity === "high").length;
  const medium = lead.painSignals.filter((signal) => signal.severity === "medium").length;
  return (
    <span>
      {high > 0 ? <span className="font-semibold text-rust">{high}H</span> : null}
      {high > 0 && medium > 0 ? <span className="text-ink/30"> · </span> : null}
      {medium > 0 ? <span className="text-gold">{medium}M</span> : null}
      {high === 0 && medium === 0 ? <span className="text-ink/30">—</span> : null}
    </span>
  );
}

function CoverageDots({ lead }: { lead: Lead }) {
  const items: { label: string; done: boolean }[] = [
    { label: "Audit", done: Boolean(lead.audit) },
    { label: "Crawl", done: Boolean(lead.audit?.crawlPages?.length) },
    { label: "PageSpeed", done: Boolean(lead.audit?.pagespeed) },
    { label: "Outreach", done: Boolean(lead.outreach) }
  ];
  return (
    <div className="flex gap-1" title={items.map((i) => `${i.label}: ${i.done ? "done" : "missing"}`).join("\n")}>
      {items.map((item) => (
        <span
          key={item.label}
          className={`h-2 w-2 rounded-full ${item.done ? "bg-moss" : "bg-ink/15"}`}
        />
      ))}
    </div>
  );
}

function FollowUpDate({ iso }: { iso: string }) {
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = due < today;
  return (
    <span className={overdue ? "font-semibold text-rust" : ""}>
      {due.toLocaleDateString()}
    </span>
  );
}
