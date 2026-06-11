"use client";

import { Import } from "lucide-react";
import type { LeadInput } from "@/lib/types";
import { Button, Field, Panel } from "@/components/ui";

export function ImportPanel({
  text,
  setText,
  defaults,
  setDefaults,
  busy,
  onImport
}: {
  text: string;
  setText: (value: string) => void;
  defaults: Partial<LeadInput>;
  setDefaults: (value: Partial<LeadInput>) => void;
  busy: boolean;
  onImport: () => void;
}) {
  return (
    <Panel title="Import Leads">
      <div className="grid gap-2.5">
        <div className="grid gap-2.5 sm:grid-cols-3">
          <Field label="Default city">
            <input
              className="input"
              value={defaults.city ?? ""}
              onChange={(event) => setDefaults({ ...defaults, city: event.target.value })}
            />
          </Field>
          <Field label="Default country">
            <input
              className="input"
              value={defaults.country ?? ""}
              onChange={(event) => setDefaults({ ...defaults, country: event.target.value })}
            />
          </Field>
          <Field label="Default sector">
            <input
              className="input"
              value={defaults.sector ?? ""}
              onChange={(event) => setDefaults({ ...defaults, sector: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Rows">
          <textarea
            className="input min-h-[320px] resize-y font-mono text-xs"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Business, https://site.com, City, Country, Sector, Phone, Email, Google Maps, Website; SEO, Notes"
          />
        </Field>
        <Button
          onClick={onImport}
          disabled={busy || !text.trim()}
          busy={busy}
          icon={<Import className="h-3.5 w-3.5" />}
          className="justify-self-start"
        >
          Import rows
        </Button>
      </div>
    </Panel>
  );
}

export function ImportHelpPanel() {
  return (
    <Panel title="Accepted CSV columns">
      <div className="space-y-2 text-xs text-soft">
        <p>business, website, city, country, sector, phone, email, source, services, notes</p>
        <p>
          Services can use semicolon or pipe:{" "}
          <code className="rounded bg-field px-1">Website; SEO; AI Automation</code>.
        </p>
        <p>One website URL per line also works.</p>
      </div>
    </Panel>
  );
}
