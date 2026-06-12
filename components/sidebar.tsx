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
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ShieldCheck,
  Table2,
  Target,
  Users
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import type { View } from "@/components/app-state";

type NavItem = {
  view: View;
  label: string;
  icon: React.ReactNode;
  count?: number;
};

const STORAGE_KEY = "leadforge-sidebar-collapsed";

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
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  }

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
    <aside
      className={`flex h-screen shrink-0 flex-col border-r border-line bg-side transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-52"
      }`}
    >
      {/* Brand + toggle */}
      <div className={`flex items-center pb-4 pt-5 ${collapsed ? "flex-col gap-2 px-2" : "gap-2.5 px-4"}`}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-white">
          <Target className="h-4 w-4" />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1 leading-tight">
            <div className="font-display text-[15px] font-semibold tracking-tight">LeadForge</div>
            <div className="text-2xs text-soft">Lead workspace</div>
          </div>
        ) : null}
        <button
          onClick={toggle}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-soft transition hover:bg-ink/5 hover:text-ink"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-2" : "px-2.5"}`}>
        <NavGroup label="Workspace" collapsed={collapsed}>
          {workspace.map((item) => (
            <NavButton
              key={item.view}
              item={item}
              collapsed={collapsed}
              active={activeView === item.view}
              onClick={() => onNavigate(item.view)}
            />
          ))}
        </NavGroup>
        <NavGroup label="Acquisition" collapsed={collapsed}>
          {acquisition.map((item) => (
            <NavButton
              key={item.view}
              item={item}
              collapsed={collapsed}
              active={activeView === item.view}
              onClick={() => onNavigate(item.view)}
            />
          ))}
        </NavGroup>
        {teamEnabled ? (
          <NavGroup label="Settings" collapsed={collapsed}>
            <NavButton
              item={{ view: "team", label: "Team", icon: <Users className="h-4 w-4" /> }}
              collapsed={collapsed}
              active={activeView === "team"}
              onClick={() => onNavigate("team")}
            />
          </NavGroup>
        ) : null}
      </nav>

      {/* Footer actions */}
      <div className={`grid gap-1 border-t border-line py-3 ${collapsed ? "px-2" : "px-2.5"}`}>
        {!collapsed ? (
          <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-2xs text-moss">
            <ShieldCheck className="h-3.5 w-3.5" />
            Human approve mode
          </div>
        ) : (
          <div className="flex justify-center py-1.5 text-moss" title="Human approve mode">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        )}
        <FooterButton collapsed={collapsed} label="Refresh data" onClick={onRefresh}>
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        </FooterButton>
        <a
          className={`flex h-8 items-center gap-2 rounded-md text-xs font-medium text-soft transition hover:bg-ink/5 hover:text-ink ${
            collapsed ? "justify-center" : "px-2"
          }`}
          href="/api/export"
          title="Export CSV"
        >
          <Download className="h-3.5 w-3.5" />
          {!collapsed ? "Export CSV" : null}
        </a>
        <SignOutButton collapsed={collapsed} />
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  collapsed,
  children
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      {!collapsed ? (
        <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-soft/80">
          {label}
        </div>
      ) : (
        <div className="mx-auto mb-1 h-px w-6 bg-line" />
      )}
      <div className="grid gap-0.5">{children}</div>
    </div>
  );
}

function NavButton({
  item,
  active,
  collapsed,
  onClick
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={`${item.label}${typeof item.count === "number" && item.count > 0 ? ` (${item.count})` : ""}`}
        className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-md transition ${
          active ? "bg-white text-accent shadow-panel" : "text-ink/60 hover:bg-ink/5 hover:text-ink"
        }`}
      >
        {item.icon}
        {typeof item.count === "number" && item.count > 0 ? (
          <span
            className={`absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[9px] font-semibold tabular-nums ${
              active ? "bg-accent text-white" : "bg-ink/15 text-ink/70"
            }`}
          >
            {item.count > 99 ? "99" : item.count}
          </span>
        ) : null}
      </button>
    );
  }

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

function FooterButton({
  collapsed,
  label,
  onClick,
  children
}: {
  collapsed: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`flex h-8 items-center gap-2 rounded-md text-xs font-medium text-soft transition hover:bg-ink/5 hover:text-ink ${
        collapsed ? "justify-center" : "px-2"
      }`}
      onClick={onClick}
      title={label}
    >
      {children}
      {!collapsed ? label : null}
    </button>
  );
}

function SignOutButton({ collapsed }: { collapsed: boolean }) {
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
      className={`flex h-8 items-center gap-2 rounded-md text-xs font-medium text-soft transition hover:bg-ink/5 hover:text-ink ${
        collapsed ? "justify-center" : "px-2"
      }`}
      onClick={() => void signOut()}
      title="Sign out"
    >
      <LogOut className="h-3.5 w-3.5" />
      {!collapsed ? "Sign out" : null}
    </button>
  );
}
