import { NextResponse } from "next/server";
import { isRemoteBackend } from "@/lib/backend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isRemoteBackend()) {
    return NextResponse.json({ error: "Team features need the Supabase backend." }, { status: 400 });
  }

  try {
    const { userId, teamId, role } = await getCurrentRole();

    const [{ data: team }, { data: memberRows }] = await Promise.all([
      supabaseAdmin().from("teams").select("id, name").eq("id", teamId).single(),
      supabaseAdmin()
        .from("team_members")
        .select("user_id, role, created_at")
        .eq("team_id", teamId)
        .order("created_at", { ascending: true })
    ]);

    const userIds = (memberRows ?? []).map((row) => row.user_id);
    const { data: profiles } = await supabaseAdmin()
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

    const members = (memberRows ?? []).map((row) => {
      const profile = profiles?.find((item) => item.id === row.user_id);
      return {
        userId: row.user_id,
        role: row.role,
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
        isSelf: row.user_id === userId
      };
    });

    return NextResponse.json({ team, members, myRole: role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Team fetch failed" },
      { status: 401 }
    );
  }
}
