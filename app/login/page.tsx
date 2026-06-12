"use client";

import { Loader2, LogIn, Mail, Target, UserPlus } from "lucide-react";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "magic";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit() {
    setBusy(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        setMessage("Account created. Check your email to confirm, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/` }
        });
        if (error) throw error;
        setMessage("Magic link sent — check your email.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-white">
            <Target className="h-5 w-5" />
          </div>
          <div className="font-display text-lg font-semibold tracking-tight">LeadForge</div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-md bg-field p-1">
            {(
              [
                ["signin", "Sign in"],
                ["signup", "Register"],
                ["magic", "Magic link"]
              ] as [Mode, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                className={`h-7 rounded text-xs font-medium transition ${
                  mode === value ? "bg-white shadow-panel" : "text-soft hover:text-ink"
                }`}
                onClick={() => {
                  setMode(value);
                  setMessage("");
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-2.5">
            {mode === "signup" ? (
              <label className="grid gap-1 text-sm">
                <span className="text-2xs font-medium uppercase tracking-wide text-soft">
                  Full name
                </span>
                <input
                  className="input"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Amit Sharma"
                />
              </label>
            ) : null}
            <label className="grid gap-1 text-sm">
              <span className="text-2xs font-medium uppercase tracking-wide text-soft">Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
            </label>
            {mode !== "magic" ? (
              <label className="grid gap-1 text-sm">
                <span className="text-2xs font-medium uppercase tracking-wide text-soft">
                  Password
                </span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void submit();
                  }}
                />
              </label>
            ) : null}

            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-accent bg-accent text-xs font-medium text-white transition hover:bg-accent-deep disabled:opacity-50"
              onClick={() => void submit()}
              disabled={busy || !email || (mode !== "magic" && !password)}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : mode === "signin" ? (
                <LogIn className="h-3.5 w-3.5" />
              ) : mode === "signup" ? (
                <UserPlus className="h-3.5 w-3.5" />
              ) : (
                <Mail className="h-3.5 w-3.5" />
              )}
              {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send magic link"}
            </button>

            {message ? <p className="text-2xs leading-4 text-soft">{message}</p> : null}
          </div>
        </div>

        <p className="mt-4 text-center text-2xs text-soft">
          Shared team workspace · data stored in Supabase Postgres
        </p>
      </div>
    </main>
  );
}
