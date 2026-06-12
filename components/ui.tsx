"use client";

import { Check, ChevronDown, ChevronsRight, Copy, FileText, Loader2, PanelLeftClose } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { serviceOptions, type LeadStatus, type ServiceFocus } from "@/lib/types";

/* ---------- Layout primitives ---------- */

export function Panel({
  title,
  badge,
  children,
  className = "",
  onCollapse
}: {
  title?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onCollapse?: () => void;
}) {
  return (
    <section className={`panel p-3.5 ${className}`}>
      {title ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          <div className="flex items-center gap-1.5">
            {badge}
            {onCollapse ? (
              <button
                onClick={onCollapse}
                className="flex h-6 w-6 items-center justify-center rounded-md text-soft transition hover:bg-ink/5 hover:text-ink"
                title="Collapse panel"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Slim vertical rail shown in place of a collapsed panel — click to expand. */
export function CollapsedRail({
  label,
  count,
  onExpand
}: {
  label: string;
  count?: number;
  onExpand: () => void;
}) {
  return (
    <button
      onClick={onExpand}
      className="panel flex min-h-48 w-full flex-col items-center gap-2 px-1.5 py-3 transition hover:border-accent/40 xl:w-[44px]"
      title={`Expand ${label}`}
    >
      <ChevronsRight className="h-3.5 w-3.5 text-accent" />
      <span
        className="text-2xs font-semibold uppercase tracking-wider text-soft"
        style={{ writingMode: "vertical-rl" }}
      >
        {label}
      </span>
      {typeof count === "number" ? (
        <span className="rounded-full bg-ink/10 px-1.5 text-2xs tabular-nums text-soft">
          {count}
        </span>
      ) : null}
    </button>
  );
}

/** Collapsible content section used inside the lead detail panel. */
export function CollapsibleSection({
  title,
  badge,
  defaultOpen = true,
  children
}: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group/section rounded-md border border-line">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-md bg-field px-2.5 py-2 transition hover:bg-ink/5">
        <span className="flex items-center gap-2 text-2xs font-semibold uppercase tracking-wide text-soft">
          {title}
          {badge}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-soft transition group-open/section:rotate-180" />
      </summary>
      <div className="p-2.5">{children}</div>
    </details>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-2xs font-semibold uppercase tracking-wide text-soft">{children}</div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-2xs font-medium uppercase tracking-wide text-soft">{label}</span>
      {children}
    </label>
  );
}

export function CheckRow({
  checked,
  disabled = false,
  onChange,
  children
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex h-8 cursor-pointer items-center gap-2 rounded-md border border-line bg-field px-2.5 text-xs text-ink/80 transition hover:border-ink/20 ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <input
        type="checkbox"
        className="accent-accent"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {children}
    </label>
  );
}

/* ---------- Buttons ---------- */

export function Button({
  children,
  variant = "primary",
  busy = false,
  icon,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  busy?: boolean;
  icon?: React.ReactNode;
}) {
  const className = {
    primary: "border-accent bg-accent text-white hover:bg-accent-deep hover:border-accent-deep",
    secondary: "border-line bg-white text-ink hover:border-ink/25 hover:bg-field",
    danger: "border-rust/40 bg-white text-rust hover:bg-rust hover:text-white",
    ghost: "border-transparent bg-transparent text-soft hover:bg-ink/5 hover:text-ink"
  }[variant];

  return (
    <button
      {...props}
      className={`inline-flex h-8 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-3 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${className} ${
        props.className ?? ""
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ---------- Pills & badges ---------- */

export function Badge({
  children,
  icon,
  tone = "neutral"
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "green" | "blue" | "gold" | "rust" | "accent" | "neutral";
}) {
  const toneClass = {
    green: "border-moss/25 bg-moss/10 text-moss",
    blue: "border-sky/25 bg-sky/10 text-sky",
    gold: "border-gold/25 bg-gold/10 text-gold",
    rust: "border-rust/25 bg-rust/10 text-rust",
    accent: "border-accent/30 bg-accent/10 text-accent-deep",
    neutral: "border-line bg-field text-soft"
  }[tone];

  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-2xs font-medium ${toneClass}`}
    >
      {icon}
      {children}
    </span>
  );
}

export function ScorePill({ score, compact = false }: { score: number; compact?: boolean }) {
  const tone =
    score >= 75
      ? "bg-moss/10 text-moss border-moss/30"
      : score >= 55
        ? "bg-gold/10 text-gold border-gold/30"
        : "bg-rust/10 text-rust border-rust/30";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border font-semibold tabular-nums ${tone} ${
        compact ? "h-5 min-w-7 px-1.5 text-2xs" : "h-6 min-w-9 px-2 text-xs"
      }`}
    >
      {score}
    </span>
  );
}

const statusTone: Record<LeadStatus, string> = {
  New: "border-line bg-field text-soft",
  Qualified: "border-sky/25 bg-sky/10 text-sky",
  Drafted: "border-plum/25 bg-plum/10 text-plum",
  Contacted: "border-gold/25 bg-gold/10 text-gold",
  "Follow-up 1": "border-gold/25 bg-gold/10 text-gold",
  "Follow-up 2": "border-gold/25 bg-gold/10 text-gold",
  Meeting: "border-accent/30 bg-accent/10 text-accent-deep",
  Proposal: "border-accent/30 bg-accent/10 text-accent-deep",
  Won: "border-moss/25 bg-moss/10 text-moss",
  Lost: "border-line bg-field text-ink/40"
};

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full border px-2 text-2xs font-medium ${statusTone[status]}`}
    >
      {status}
    </span>
  );
}

export function SeverityPill({ severity }: { severity: "high" | "medium" | "low" }) {
  const tone = {
    high: "border-rust/30 bg-rust/10 text-rust",
    medium: "border-gold/30 bg-gold/10 text-gold",
    low: "border-sky/30 bg-sky/10 text-sky"
  }[severity];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-2xs font-medium ${tone}`}>
      {severity}
    </span>
  );
}

/* ---------- Data display ---------- */

export function Metric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: "neutral" | "gold" | "rust" | "sky" | "green";
}) {
  const dot = {
    neutral: "bg-ink/60",
    gold: "bg-gold",
    rust: "bg-rust",
    sky: "bg-sky",
    green: "bg-moss"
  }[tone];

  return (
    <div className="panel flex items-center gap-3 px-3.5 py-2.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <div className="text-base font-semibold tabular-nums leading-5">{value}</div>
        <div className="truncate text-2xs text-soft">{label}</div>
      </div>
    </div>
  );
}

export function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-field px-2.5 py-2">
      <div className="text-2xs uppercase tracking-wide text-soft">{label}</div>
      <div className="mt-0.5 break-words text-xs font-medium">{value}</div>
    </div>
  );
}

export function DraftBox({
  title,
  body,
  icon
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-md border border-line bg-field p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-semibold">
          {icon}
          <span className="truncate">{title}</span>
        </div>
        <button
          onClick={copy}
          className={`inline-flex h-6 shrink-0 items-center gap-1 rounded-md border px-2 text-2xs font-medium transition ${
            copied
              ? "border-moss/40 bg-moss/10 text-moss"
              : "border-line bg-white text-soft hover:border-ink/25 hover:text-ink"
          }`}
          title="Copy to clipboard"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="mt-2 whitespace-pre-wrap rounded-md border border-line/70 bg-white p-2.5 font-sans text-xs leading-5 text-ink/80">
        {body}
      </pre>
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-md bg-field p-5 text-center">
      <FileText className="h-6 w-6 text-ink/25" />
      <h3 className="mt-2.5 text-xs font-semibold">{title}</h3>
      <p className="mt-1 max-w-60 text-2xs text-soft">{text}</p>
    </div>
  );
}

/* ---------- Pickers ---------- */

export function ServicePicker({
  selected,
  onChange
}: {
  selected: ServiceFocus[];
  onChange: (services: ServiceFocus[]) => void;
}) {
  function toggle(service: ServiceFocus) {
    if (selected.includes(service)) {
      onChange(selected.filter((item) => item !== service));
    } else {
      onChange([...selected, service]);
    }
  }

  return (
    <div>
      <SectionLabel>Services</SectionLabel>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {serviceOptions.map((service) => {
          const active = selected.includes(service);
          return (
            <button
              key={service}
              type="button"
              onClick={() => toggle(service)}
              className={`h-7 rounded-full border px-2.5 text-2xs font-medium transition ${
                active
                  ? "border-accent/50 bg-accent/10 text-accent-deep"
                  : "border-line bg-white text-soft hover:border-ink/25 hover:text-ink"
              }`}
            >
              {service}
            </button>
          );
        })}
      </div>
    </div>
  );
}
