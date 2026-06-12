"use client";

import {
  Activity,
  CalendarClock,
  ClipboardList,
  Compass,
  Download,
  Import,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Table2,
  Target,
  Users
} from "lucide-react";
import type React from "react";
import type { View } from "@/components/app-state";

type NavItem = {
  view: View;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

export default function Sidebar({
  activeView,
  onNavigate,
  totalLeads,
  hotLeads,
  dueCount,
  refreshing,
  onRefresh
}: {
  activeView: View;
  onNavigate: (view: View) => void;
  totalLeads: number;
  hotLeads: number;
  dueCount: number;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const workspace: NavItem[] = [
    { view: "command", label: "Command", icon: <Activity className="h-4 w-4" />, count: hotLeads },
    { view: "schedule", label: "Schedule", icon: <CalendarClock className="h-4 w-4" />, count: dueCount },
    { view: "pipeline", label: "Pipeline", icon: <ClipboardList className="h-4 w-4" /> },
    { view: "database", label: "Database", icon: <Table2 className="h-4 w-4" />, count: totalLeads }
  ];
  const acquisition: NavItem[] = [
    { view: "search", label: "Source Engine", icon: <Compass className="h-4 w-4" /> },
    { view: "import", label: "Import", icon: <Import className="h-4 w-4" /> }
  ];
  const teamEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  return (
    <aside className="flex h-screen w-52 shrink-0 flex-col border-r border-line bg-side">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pb-4 pt-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-white">
          <Target className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[15px] font-semibold tracking-tight">LeadForge</div>
          <div className="text-2xs text-soft">Lead workspace</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5">
        <NavGroup label="Workspace">
          {workspace.map((item) => (
            <NavButton key={item.view} item={item} active={activeView === item.view} onClick={() => onNavigate(item.view)} />
          ))}
        </NavGroup>
        <NavGroup label="Acquisition">
          {acquisition.map((item) => (
            <NavButton key={item.view} item={item} active={activeView === item.view} onClick={() => onNavigate(item.view)} />
          ))}
        </NavGroup>
        {teamEnabled ? (
          <NavGroup label="Settings">
            <NavButton
              item={{ view: "team", label: "Team", icon: <Users className="h-4 w-4" /> }}
              active={activeView === "team"}
              onClick={() => onNavigate("team")}
            />
          </NavGroup>
        ) : null}
      </nav>

      {/* Footer actions */}
      <div className="grid gap-1 border-t border-line px-2.5 py-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-2xs text-moss">
          <ShieldCheck className="h-3.5 w-3.5" />
          Human approve mode
        </div>
        <button
          className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-soft transition hover:bg-ink/5 hover:text-ink"
          onClick={onRefresh}
        >
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh data
        </button>
        <a
          className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-soft transition hover:bg-ink/5 hover:text-ink"
          href="/api/export"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </a>
        <SignOutButton />
      </div>
    </aside>
  );
}

function SignOutButton() {
  const authEnabled = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!authEnabled) return null;

  async function signOut() {
    const { createSupabaseBrowserClient } = await import("@/lib/supabase/client");
    await createSupabaseBrowserClient().auth.signOut();
    window.location.href = "/login";
  }

  return (
    <button
      className="flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-soft transition hover:bg-ink/5 hover:text-ink"
      onClick={() => void signOut()}
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-soft/80">
        {label}
      </div>
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition ${
        active
          ? "bg-white font-medium text-ink shadow-panel"
          : "text-ink/65 hover:bg-ink/5 hover:text-ink"
      }`}
    >
      <span className={active ? "text-accent" : "text-soft"}>{item.icon}</span>
      <span className="flex-1 text-left">{item.label}</span>
      {typeof item.count === "number" && item.count > 0 ? (
        <span
          className={`rounded-full px-1.5 text-2xs tabular-nums ${
            active ? "bg-accent/10 text-accent-deep" : "bg-ink/10 text-soft"
          }`}
        >
          {item.count}
        </span>
      ) : null}
    </button>
  );
}
