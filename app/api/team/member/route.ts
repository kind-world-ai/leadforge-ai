import { NextResponse } from "next/server";
import { isRemoteBackend } from "@/lib/backend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Remove a member from the team. They get a fresh solo team so they aren't locked out. */
export async function DELETE(request: Request) {
  if (!isRemoteBackend()) {
    return NextResponse.json({ error: "Team features need the Supabase backend." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const { userId: callerId, teamId, role } = await getCurrentRole();
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "Only the team owner or an admin can remove members." }, { status: 403 });
    }
    if (body.userId === callerId) {
      return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const { data: target } = await admin
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", body.userId)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: "Not a member of your team." }, { status: 404 });
    }
    if (target.role === "owner") {
      return NextResponse.json({ error: "The owner cannot be removed." }, { status: 400 });
    }

    // Give them a fresh solo team.
    const { data: newTeam, error: teamError } = await admin
      .from("teams")
      .insert({ name: "My Team" })
      .select("id")
      .single();
    if (teamError) throw new Error(teamError.message);

    const { error: removeError } = await admin
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", body.userId);
    if (removeError) throw new Error(removeError.message);

    await admin
      .from("team_members")
      .insert({ team_id: newTeam.id, user_id: body.userId, role: "owner" });
    await admin.from("profiles").update({ team_id: newTeam.id }).eq("id", body.userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Remove failed" },
      { status: 500 }
    );
  }
}
