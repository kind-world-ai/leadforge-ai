"use client";

import type { Lead } from "@/lib/types";
import { leadStatuses } from "@/lib/types";
import type { View } from "@/components/app-state";
import { ScorePill } from "@/components/ui";

export function PipelinePanel({
  leads,
  onSelect,
  setActiveView
}: {
  leads: Lead[];
  onSelect: (id: string) => void;
  setActiveView: (view: View) => void;
}) {
  return (
    <div className="flex h-full gap-2.5 overflow-x-auto pb-2">
      {leadStatuses.map((status) => {
        const statusLeads = leads.filter((lead) => lead.status === status);
        return (
          <div
            key={status}
            className="flex w-56 shrink-0 flex-col rounded-lg border border-line bg-side/60"
          >
            <div className="flex items-center justify-between px-2.5 pb-1.5 pt-2.5">
              <h2 className="text-2xs font-semibold uppercase tracking-wide text-soft">
                {status}
              </h2>
              <span className="rounded-full bg-ink/10 px-1.5 text-2xs tabular-nums text-soft">
                {statusLeads.length}
              </span>
            </div>
            <div className="grid gap-1.5 overflow-y-auto px-2 pb-2">
              {statusLeads.slice(0, 12).map((lead) => (
                <button
                  key={lead.id}
                  className="rounded-md border border-line bg-white p-2.5 text-left shadow-panel transition hover:border-accent/40"
                  onClick={() => {
                    onSelect(lead.id);
                    setActiveView("command");
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium">{lead.businessName}</span>
                    <ScorePill score={lead.score} compact />
                  </div>
                  <p className="mt-1 line-clamp-2 text-2xs text-soft">{lead.nextAction}</p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
