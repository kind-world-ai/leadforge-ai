/**
 * Backend switch: DATA_BACKEND=sqlite (default, local-first) or supabase (shared online).
 */
export function isRemoteBackend(): boolean {
  return (
    process.env.DATA_BACKEND === "supabase" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/** Auth UI/middleware only activate when Supabase is configured. */
export function isAuthEnabled(): boolean {
  return (
    process.env.DATA_BACKEND === "supabase" &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
