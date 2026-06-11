import type {
  Lead,
  LeadInput,
  LeadStatus,
  PainSignal,
  ScorePart,
  ServiceFocus,
  Severity,
  WebsiteAudit
} from "@/lib/types";

const severityPoints: Record<Severity, number> = {
  high: 6,
  medium: 3.5,
  low: 1.5
};

export function buildPainSignals(input: {
  website?: string | null;
  email?: string;
  phone?: string;
  audit?: WebsiteAudit;
  notes?: string;
}): PainSignal[] {
  const signals: PainSignal[] = [];

  if (!input.website) {
    signals.push({
      id: "no-website",
      severity: "high",
      category: "Website",
      title: "No website found",
      detail: "The business may be relying on maps, social pages, or directories instead of a controlled website.",
      evidence: "Website field is empty"
    });
  }

  if (!input.email && !input.phone) {
    signals.push({
      id: "weak-contact",
      severity: "medium",
      category: "Contact",
      title: "No direct contact captured",
      detail: "The next step should be manual validation from their site, map listing, or public directory.",
      evidence: "No email or phone stored"
    });
  }

  if (input.audit) {
    signals.push(...input.audit.problems);
  }

  if (input.notes?.toLowerCase().includes("manual")) {
    signals.push({
      id: "manual-research",
      severity: "low",
      category: "Market",
      title: "Needs manual decision-maker research",
      detail: "The lead is worth a human check before contact so the pitch can be specific.",
      evidence: "Notes mention manual research"
    });
  }

  return dedupeSignals(signals);
}

export function scoreOpportunity(input: {
  website?: string | null;
  services?: string[];
  painSignals?: PainSignal[];
  audit?: WebsiteAudit;
  sector?: string;
  source?: string;
  email?: string;
  phone?: string;
  decisionMaker?: string;
  status?: LeadStatus;
}): { score: number; fitReason: string; breakdown: ScorePart[] } {
  const breakdown: ScorePart[] = [{ label: "Base", points: 20 }];
  const painSignals = input.painSignals ?? [];

  /* --- Pain / opportunity fit --- */
  if (!input.website) {
    breakdown.push({ label: "No website (full build opportunity)", points: 30 });
  }

  if (input.audit && input.audit.status !== 0) {
    const deficit = Math.round(
      Math.min(30, Math.max(0, (70 - input.audit.healthScore) * 0.45))
    );
    if (deficit > 0) {
      breakdown.push({
        label: `Weak site health (${input.audit.healthScore}/100)`,
        points: deficit
      });
    }
  }

  const signalPoints = Math.round(
    Math.min(
      24,
      painSignals.reduce((sum, signal) => sum + severityPoints[signal.severity], 0)
    )
  );
  if (signalPoints > 0) {
    breakdown.push({
      label: `${painSignals.length} pain signal${painSignals.length === 1 ? "" : "s"}`,
      points: signalPoints
    });
  }

  const psiMobile = input.audit?.pagespeed?.mobile?.performance;
  if (psiMobile != null && psiMobile < 50) {
    breakdown.push({ label: `Poor mobile PageSpeed (${psiMobile}/100)`, points: 6 });
  }

  /* --- Reachability (can we actually contact them?) --- */
  if (input.email) breakdown.push({ label: "Email captured", points: 8 });
  if (input.phone) breakdown.push({ label: "Phone captured", points: 6 });
  if (input.decisionMaker) breakdown.push({ label: "Decision maker known", points: 4 });
  if (!input.email && !input.phone) {
    breakdown.push({ label: "No way to contact yet", points: -10 });
  }

  /* --- Service & source momentum --- */
  if (input.services?.includes("AI Automation")) {
    breakdown.push({ label: "AI Automation focus", points: 4 });
  }
  if (input.services?.includes("SEO")) breakdown.push({ label: "SEO focus", points: 3 });
  if (input.services?.includes("Website")) breakdown.push({ label: "Website focus", points: 3 });
  if (input.source === "Google Maps") {
    breakdown.push({ label: "Verified Maps listing", points: 4 });
  }
  if (input.source === "BuiltWith/Wappalyzer") {
    breakdown.push({ label: "Tech-stack sourced", points: 4 });
  }
  if (input.source === "Referral") breakdown.push({ label: "Referral (warm)", points: 10 });

  /* --- Negative signals --- */
  if (input.audit && input.audit.status === 0) {
    breakdown.push({
      label: "Website unreachable — verify business is active",
      points: -12
    });
  }

  let score = breakdown.reduce((sum, part) => sum + part.points, 0);
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (input.status === "Lost" && score > 25) {
    breakdown.push({ label: "Marked Lost (capped)", points: 25 - score });
    score = 25;
  }

  return { score, fitReason: buildFitReason(input, painSignals), breakdown };
}

function buildFitReason(
  input: {
    website?: string | null;
    services?: string[];
    audit?: WebsiteAudit;
    sector?: string;
    email?: string;
    phone?: string;
  },
  painSignals: PainSignal[]
): string {
  const highSignals = painSignals.filter((signal) => signal.severity === "high").length;
  const service = input.services?.[0] ?? "Website";
  const sector = input.sector || "local business";
  const reachable = Boolean(input.email || input.phone);
  const reachNote = reachable ? "" : " Capture an email or phone before outreach.";

  if (input.audit && input.audit.status === 0) {
    return `Caution: website could not be reached. Verify the business is still active before pitching.${reachNote}`;
  }
  if (!input.website) {
    return `Strong fit: ${sector} business has no website captured, so a simple website plus local SEO pitch is relevant.${reachNote}`;
  }
  const psiMobile = input.audit?.pagespeed?.mobile?.performance;
  if (input.audit && input.audit.healthScore < 55) {
    const psiNote = psiMobile != null ? ` Mobile PageSpeed is ${psiMobile}/100.` : "";
    return `Strong fit: website audit score is ${input.audit.healthScore}/100 with clear conversion or SEO issues.${psiNote}${reachNote}`;
  }
  if (highSignals > 0) {
    return `Good fit: ${highSignals} high-priority issue${highSignals === 1 ? "" : "s"} found during research.${reachNote}`;
  }
  return `${sector} lead with ${service.toLowerCase()} opportunity.${reachNote}`;
}

export function refreshLeadScore(lead: Lead): Lead {
  const painSignals = buildPainSignals({
    website: lead.website,
    email: lead.email,
    phone: lead.phone,
    audit: lead.audit,
    notes: lead.notes
  });
  const { score, fitReason, breakdown } = scoreOpportunity({
    website: lead.website,
    services: lead.services,
    painSignals,
    audit: lead.audit,
    sector: lead.sector,
    source: lead.source,
    email: lead.email,
    phone: lead.phone,
    decisionMaker: lead.decisionMaker,
    status: lead.status
  });

  return {
    ...lead,
    painSignals,
    score,
    scoreBreakdown: breakdown,
    fitReason
  };
}

export function leadFromInput(input: LeadInput, id: string): Lead {
  const now = new Date().toISOString();
  const painSignals = buildPainSignals({
    website: input.website,
    email: input.email,
    phone: input.phone,
    notes: input.notes
  });
  const services: ServiceFocus[] = input.services?.length ? input.services : ["Website", "SEO"];
  const { score, fitReason, breakdown } = scoreOpportunity({
    website: input.website,
    services,
    painSignals,
    sector: input.sector,
    source: input.source,
    email: input.email,
    phone: input.phone,
    decisionMaker: input.decisionMaker,
    status: input.status
  });

  return {
    id,
    businessName: input.businessName.trim(),
    website: normalizeOptional(input.website),
    city: input.city?.trim() || "Unknown city",
    country: input.country?.trim() || "Unknown country",
    sector: input.sector?.trim() || "Unknown sector",
    source: input.source ?? "Manual",
    sourceUrl: normalizeOptional(input.sourceUrl) ?? undefined,
    googlePlaceId: normalizeOptional(input.googlePlaceId) ?? undefined,
    decisionMaker: input.decisionMaker?.trim() || undefined,
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    socials: input.socials?.filter(Boolean) ?? [],
    services,
    status: input.status ?? "New",
    score,
    scoreBreakdown: breakdown,
    fitReason,
    painSignals,
    nextAction: input.nextAction?.trim() || "Research decision maker",
    notes: input.notes?.trim() || "",
    tags: input.tags?.filter(Boolean) ?? [],
    createdAt: now,
    updatedAt: now
  };
}

function dedupeSignals(signals: PainSignal[]): PainSignal[] {
  const seen = new Set<string>();
  return signals.filter((signal) => {
    const key = `${signal.category}:${signal.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeOptional(value?: string | null): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}
