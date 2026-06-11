import type { LeadStatus } from "@/lib/types";
import type { ManualMapsForm } from "@/components/app-state";

export function parseMapsPaste(form: ManualMapsForm): ManualMapsForm {
  const raw = form.rawPaste.trim();
  if (!raw) return form;

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const joined = lines.join("\n");
  const urls = lines.flatMap((line) => line.match(/https?:\/\/[^\s,]+/gi) ?? []);
  const mapsUrl = urls.find(isMapsUrl);
  const website = urls.find((url) => !isMapsUrl(url) && !/google\./i.test(url));
  const email = joined.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0];
  const phone = joined.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim();
  const businessName = form.businessName?.trim() || lines.find(isLikelyBusinessName) || "";
  const address = lines.find((line) => isLikelyAddress(line, businessName));

  return {
    ...form,
    businessName,
    website: form.website || website || "",
    sourceUrl: form.sourceUrl || mapsUrl || "",
    email: form.email || email || "",
    phone: form.phone || phone || "",
    notes: mergeStrings([form.notes ?? "", address ? `Address: ${address}` : ""]).join("\n")
  };
}

export function isMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.hostname.includes("maps.app.goo.gl") ||
      url.hostname.includes("goo.gl") ||
      (url.hostname.includes("google.") && url.pathname.includes("/maps"))
    );
  } catch {
    return /google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(value);
  }
}

function isLikelyBusinessName(line: string): boolean {
  if (!line || line.length > 80) return false;
  if (/https?:\/\//i.test(line)) return false;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(line)) return false;
  if (/^\+?\d[\d\s().-]{7,}\d$/.test(line)) return false;
  if (/rating|reviews|directions|website|call|open|closed|hours/i.test(line)) return false;
  return /[a-z]/i.test(line);
}

function isLikelyAddress(line: string, businessName: string): boolean {
  if (!line || line === businessName || /https?:\/\//i.test(line)) return false;
  return /\d|road|street|sector|phase|avenue|suite|shop|sco|market|mohali|chandigarh|panchkula/i.test(
    line
  );
}

export function mergeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const followUpDays: Partial<Record<LeadStatus, number>> = {
  Contacted: 3,
  "Follow-up 1": 4,
  "Follow-up 2": 7,
  Meeting: 1,
  Proposal: 3
};

export function followUpPatchForStatus(status: LeadStatus): {
  lastContactedAt?: string;
  nextFollowUpAt?: string | null;
} {
  const now = new Date();
  const days = followUpDays[status];
  if (days) {
    const next = new Date(now);
    next.setDate(next.getDate() + days);
    next.setHours(9, 0, 0, 0);
    const touched = ["Contacted", "Follow-up 1", "Follow-up 2"].includes(status);
    return {
      ...(touched ? { lastContactedAt: now.toISOString() } : {}),
      nextFollowUpAt: next.toISOString()
    };
  }
  if (status === "Won" || status === "Lost") {
    return { nextFollowUpAt: null };
  }
  return {};
}

export function isFollowUpDue(nextFollowUpAt?: string): boolean {
  if (!nextFollowUpAt) return false;
  const due = new Date(nextFollowUpAt);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return due <= endOfToday;
}

export function nextActionForStatus(status: LeadStatus): string {
  const actions: Record<LeadStatus, string> = {
    New: "Research decision maker",
    Qualified: "Review audit and approve outreach draft",
    Drafted: "Manually approve and send the best outreach draft",
    Contacted: "Wait for reply or schedule follow-up",
    "Follow-up 1": "Send second follow-up if still relevant",
    "Follow-up 2": "Decide whether to pause or call",
    Meeting: "Prepare audit proof and offer",
    Proposal: "Send proposal and track decision",
    Won: "Create project handoff",
    Lost: "Archive or revisit later"
  };
  return actions[status];
}
