import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { isRemoteBackend } from "@/lib/backend";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Add a user to the caller's team by email.
 * - Already registered → moved into the team immediately.
 * - Not registered yet → the account is CREATED with a temporary password,
 *   added to the team, and the temp password is returned for the owner to share.
 */
export async function POST(request: Request) {
  if (!isRemoteBackend()) {
    return NextResponse.json({ error: "Team features need the Supabase backend." }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    role?: "member" | "admin";
  };
  const email = body.email?.trim().toLowerCase();
  const newRole = body.role === "admin" ? "admin" : "member";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  try {
    const { teamId, role } = await getCurrentRole();
    if (role !== "owner" && role !== "admin") {
      return NextResponse.json({ error: "Only the team owner or an admin can add members." }, { status: 403 });
    }

    const admin = supabaseAdmin();
    let profile = (
      await admin
        .from("profiles")
        .select("id, full_name, email, team_id")
        .ilike("email", email)
        .maybeSingle()
    ).data;

    let tempPassword: string | undefined;

    if (!profile) {
      // Create the account directly with a temporary password.
      tempPassword = randomBytes(9).toString("base64url");
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: email.split("@")[0] }
      });
      if (createError || !created.user) {
        throw new Error(createError?.message || "Could not create the account.");
      }
      // The signup trigger creates their profile; fetch it (retry briefly).
      for (let attempt = 0; attempt < 5 && !profile; attempt++) {
        profile = (
          await admin
            .from("profiles")
            .select("id, full_name, email, team_id")
            .eq("id", created.user.id)
            .maybeSingle()
        ).data;
        if (!profile) await new Promise((resolve) => setTimeout(resolve, 300));
      }
      if (!profile) {
        // Trigger missing? Create the profile directly.
        await admin.from("profiles").insert({
          id: created.user.id,
          email,
          full_name: email.split("@")[0],
          team_id: teamId
        });
        profile = { id: created.user.id, full_name: email.split("@")[0], email, team_id: null };
      }
    } else if (profile.team_id === teamId) {
      return NextResponse.json({ error: `${email} is already in your team.` }, { status: 409 });
    }

    const { error: memberError } = await admin
      .from("team_members")
      .upsert({ team_id: teamId, user_id: profile.id, role: newRole });
    if (memberError) throw new Error(memberError.message);

    const { error: profileError } = await admin
      .from("profiles")
      .update({ team_id: teamId })
      .eq("id", profile.id);
    if (profileError) throw new Error(profileError.message);

    return NextResponse.json({
      ok: true,
      created: Boolean(tempPassword),
      tempPassword,
      member: { userId: profile.id, email: profile.email ?? email, fullName: profile.full_name, role: newRole }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invite failed" },
      { status: 500 }
    );
  }
}
