import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/** Cookie-session client for server components / route handlers. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — middleware handles refresh.
          }
        }
      }
    }
  );
}

/** Resolve the signed-in user's team id (used to scope all data access). */
export async function getCurrentTeamId(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("team_id")
    .eq("id", user.id)
    .single();
  if (error || !data?.team_id) {
    throw new Error("No team found for this user. Re-run the signup trigger or check the profiles table.");
  }
  return data.team_id as string;
}

/** Role of the signed-in user within their team ('owner' | 'admin' | 'member'). */
export async function getCurrentRole(): Promise<{
  userId: string;
  teamId: string;
  role: string;
}> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const teamId = await getCurrentTeamId();
  const { data } = await supabaseAdmin()
    .from("team_members")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();
  return { userId: user.id, teamId, role: (data?.role as string) ?? "member" };
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
