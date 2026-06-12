import { NextResponse } from "next/server";
import { isRemoteBackend } from "@/lib/backend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Add an already-registered user to the caller's team by email.
 * Flow: teammate registers normally (gets their own solo team) → owner adds
 * them here → their profile.team_id moves to the owner's team.
 */
export async function POST(request: Request) {
  if (!isRemoteBackend()) {
    return NextResponse.json({ error: "Team features need the Supabase backend." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  try {
    const { teamId, role } = await getCurrentRole();
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "Only the team owner or an admin can add members." }, { status: 403 });
    }

    const { data: profile } = await supabaseAdmin()
      .from("profiles")
      .select("id, full_name, email, team_id")
      .ilike("email", email)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        {
          error: `No account found for ${email}. Ask them to open the app and register first, then add them again.`
        },
        { status: 404 }
      );
    }
    if (profile.team_id === teamId) {
      return NextResponse.json({ error: `${email} is already in your team.` }, { status: 409 });
    }

    const admin = supabaseAdmin();
    const { error: memberError } = await admin
      .from("team_members")
      .upsert({ team_id: teamId, user_id: profile.id, role: "member" });
    if (memberError) throw new Error(memberError.message);

    const { error: profileError } = await admin
      .from("profiles")
      .update({ team_id: teamId })
      .eq("id", profile.id);
    if (profileError) throw new Error(profileError.message);

    return NextResponse.json({
      ok: true,
      member: { userId: profile.id, email: profile.email, fullName: profile.full_name }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite failed" },
      { status: 500 }
    );
  }
}
