"use client";

import { Crown, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge, Button, EmptyState, Panel } from "@/components/ui";

type Member = {
  userId: string;
  role: string;
  fullName: string | null;
  email: string | null;
  isSelf: boolean;
};

type TeamData = {
  team: { id: string; name: string } | null;
  members: Member[];
  myRole: string;
};

export function TeamView({ onNotice }: { onNotice: (message: string) => void }) {
  const [data, setData] = useState<TeamData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/team", { cache: "no-store" });
      const json = (await response.json()) as TeamData & { error?: string };
      if (!response.ok) throw new Error(json.error || "Team fetch failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Team fetch failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function invite() {
    setBusy(true);
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail })
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error || "Invite failed");
      onNotice(`${inviteEmail} added to your team.`);
      setInviteEmail("");
      await load();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: Member) {
    if (!confirm(`Remove ${member.email ?? member.fullName ?? "this member"} from the team?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/team/member", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: member.userId })
      });
      const json = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(json.error || "Remove failed");
      onNotice("Member removed.");
      await load();
    } catch (err) {
      onNotice(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <Panel>
        <EmptyState title="Team unavailable" text={error} />
      </Panel>
    );
  }

  const canManage = data?.myRole === "owner" || data?.myRole === "admin";

  return (
    <div className="grid max-w-2xl gap-3">
      <Panel
        title={data?.team?.name ?? "Team"}
        badge={
          <Badge icon={<Users className="h-3 w-3" />} tone="accent">
            {data?.members.length ?? 0} member{(data?.members.length ?? 0) === 1 ? "" : "s"}
          </Badge>
        }
      >
        {loading ? (
          <p className="text-xs text-soft">Loading…</p>
        ) : (
          <div className="grid gap-1.5">
            {data?.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-field px-2.5 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    {member.fullName || member.email || member.userId.slice(0, 8)}
                    {member.role === "owner" ? (
                      <Crown className="h-3 w-3 text-gold" />
                    ) : null}
                    {member.isSelf ? (
                      <span className="text-2xs font-normal text-soft">(you)</span>
                    ) : null}
                  </div>
                  <div className="truncate text-2xs text-soft">
                    {member.email} · {member.role}
                  </div>
                </div>
                {canManage && !member.isSelf && member.role !== "owner" ? (
                  <Button
                    variant="ghost"
                    onClick={() => void remove(member)}
                    disabled={busy}
                    title="Remove from team"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Panel>

      {canManage ? (
        <Panel title="Add member">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink/35" />
              <input
                className="input pl-8"
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="teammate@company.com"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && inviteEmail.includes("@")) void invite();
                }}
              />
            </div>
            <Button
              onClick={() => void invite()}
              disabled={busy || !inviteEmail.includes("@")}
              busy={busy}
              icon={<UserPlus className="h-3.5 w-3.5" />}
            >
              Add to team
            </Button>
          </div>
          <p className="mt-2 text-2xs leading-4 text-soft">
            They must register in the app first (it creates their account), then add their
            email here — they'll move into your team and see all shared leads.
          </p>
        </Panel>
      ) : null}
    </div>
  );
}
