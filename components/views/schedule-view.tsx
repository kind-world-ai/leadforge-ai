"use client";

import { CalendarClock, CheckCircle2, ChevronRight, Clock } from "lucide-react";
import { useMemo } from "react";
import type { Lead, LeadStatus } from "@/lib/types";
import { Button, EmptyState, Panel, ScorePill, StatusPill } from "@/components/ui";

type Group = {
  key: string;
  title: string;
  tone: "rust" | "accent" | "neutral";
  leads: Lead[];
};

const activeStatuses: LeadStatus[] = [
  "Contacted",
  "Follow-up 1",
  "Follow-up 2",
  "Meeting",
  "Proposal"
];

export function ScheduleView({
  leads,
  busy,
  onOpen,
  onMarkContacted,
  onPush
}: {
  leads: Lead[];
  busy: string | null;
  onOpen: (id: string) => void;
  onMarkContacted: (lead: Lead) => void;
  onPush: (lead: Lead, days: number) => void;
}) {
  const groups = useMemo<Group[]>(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const open = leads.filter((lead) => lead.status !== "Won" && lead.status !== "Lost");
    const withDate = open
      .filter((lead) => lead.nextFollowUpAt)
      .sort(
        (a, b) =>
          new Date(a.nextFollowUpAt ?? 0).getTime() - new Date(b.nextFollowUpAt ?? 0).getTime()
      );

    const overdue = withDate.filter((lead) => new Date(lead.nextFollowUpAt!) < startOfToday);
    const today = withDate.filter((lead) => {
      const due = new Date(lead.nextFollowUpAt!);
      return due >= startOfToday && due <= endOfToday;
    });
    const week = withDate.filter((lead) => {
      const due = new Date(lead.nextFollowUpAt!);
      return due > endOfToday && due <= endOfWeek;
    });
    const later = withDate.filter((lead) => new Date(lead.nextFollowUpAt!) > endOfWeek);
    const unscheduled = open.filter(
      (lead) => !lead.nextFollowUpAt && activeStatuses.includes(lead.status)
    );

    return [
      { key: "overdue", title: "Overdue", tone: "rust" as const, leads: overdue },
      { key: "today", title: "Today", tone: "accent" as const, leads: today },
      { key: "week", title: "This week", tone: "neutral" as const, leads: week },
      { key: "later", title: "Later", tone: "neutral" as const, leads: later },
      {
        key: "unscheduled",
        title: "Active but unscheduled",
        tone: "neutral" as const,
        leads: unscheduled
      }
    ].filter((group) => group.leads.length > 0);
  }, [leads]);

  if (!groups.length) {
    return (
      <Panel>
        <EmptyState
          title="Nothing scheduled"
          text="Move leads to Contacted or set a follow-up date and they will appear here."
        />
      </Panel>
    );
  }

  return (
    <div className="grid gap-3">
      {groups.map((group) => (
        <Panel key={group.key}>
          <div className="mb-2.5 flex items-center gap-2">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                group.tone === "rust"
                  ? "bg-rust/10 text-rust"
                  : group.tone === "accent"
                    ? "bg-accent/10 text-accent-deep"
                    : "bg-ink/5 text-soft"
              }`}
            >
              {group.tone === "rust" ? (
                <Clock className="h-3 w-3" />
              ) : (
                <CalendarClock className="h-3 w-3" />
              )}
            </span>
            <h2
              className={`text-sm font-semibold tracking-tight ${
                group.tone === "rust" ? "text-rust" : ""
              }`}
            >
              {group.title}
            </h2>
            <span className="rounded-full bg-ink/10 px-1.5 text-2xs tabular-nums text-soft">
              {group.leads.length}
            </span>
          </div>
          <div className="grid gap-1.5">
            {group.leads.map((lead) => (
              <ScheduleRow
                key={lead.id}
                lead={lead}
                busy={busy}
                showDate={group.key !== "today"}
                onOpen={onOpen}
                onMarkContacted={onMarkContacted}
                onPush={onPush}
              />
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function ScheduleRow({
  lead,
  busy,
  showDate,
  onOpen,
  onMarkContacted,
  onPush
}: {
  lead: Lead;
  busy: string | null;
  showDate: boolean;
  onOpen: (id: string) => void;
  onMarkContacted: (lead: Lead) => void;
  onPush: (lead: Lead, days: number) => void;
}) {
  const rowBusy = busy === `status-${lead.id}` || busy === `follow-${lead.id}`;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-field px-2.5 py-2">
      <ScorePill score={lead.score} compact />
      <button
        className="min-w-0 flex-1 text-left"
        onClick={() => onOpen(lead.id)}
        title="Open in Command"
      >
        <span className="block truncate text-xs font-medium hover:text-accent-deep">
          {lead.businessName}
        </span>
        <span className="block truncate text-2xs text-soft">{lead.nextAction}</span>
      </button>
      <StatusPill status={lead.status} />
      {showDate && lead.nextFollowUpAt ? (
        <span className="text-2xs tabular-nums text-soft">
          {new Date(lead.nextFollowUpAt).toLocaleDateString()}
        </span>
      ) : null}
      <div className="flex gap-1">
        <Button
          variant="secondary"
          onClick={() => onMarkContacted(lead)}
          disabled={rowBusy}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title="Mark contacted — auto-schedules the next follow-up"
        >
          Contacted
        </Button>
        <Button
          variant="ghost"
          onClick={() => onPush(lead, 3)}
          disabled={rowBusy}
          title="Push follow-up 3 days"
        >
          +3d
        </Button>
        <Button variant="ghost" onClick={() => onOpen(lead.id)} title="Open lead">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
