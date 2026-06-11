import type { Lead, OutreachDraft, PainSignal, ServiceFocus } from "@/lib/types";

export function generateOutreach(lead: Lead): OutreachDraft {
  const primaryService = lead.services[0] ?? "Website";
  const topSignals = lead.painSignals.slice(0, 3);
  const problemLine = summarizeProblems(topSignals, lead);
  const serviceLine = serviceOutcome(primaryService);
  const cityLine = lead.city && lead.city !== "Unknown city" ? ` in ${lead.city}` : "";
  const subject = buildSubject(lead, primaryService);

  return {
    generatedAt: new Date().toISOString(),
    subject,
    shortEmail: [
      `Hi ${lead.decisionMaker || "there"},`,
      "",
      `I was reviewing ${lead.businessName}${cityLine} and noticed ${problemLine}`,
      "",
      `${serviceLine} I can share a quick 2-3 point audit first, so you can decide if it is worth a call.`,
      "",
      "Would it be okay if I send the quick audit?"
    ].join("\n"),
    callOpener: [
      `Hi, is this the right number for ${lead.businessName}?`,
      `I am calling because I noticed ${problemLine}`,
      `${serviceLine}`,
      "I am not asking you to decide now. I can send a short audit and you can check if it is useful."
    ].join(" "),
    linkedinNote: [
      `Hi ${lead.decisionMaker || "there"}, I noticed a few ${primaryService.toLowerCase()} opportunities for ${lead.businessName}.`,
      "I can send a short manual audit first, no automated pitch."
    ].join(" "),
    contactFormMessage: [
      `Hi ${lead.businessName} team,`,
      "",
      `I reviewed your online presence and noticed ${problemLine}`,
      `${serviceLine}`,
      "",
      "I can send a short audit with the main fixes and expected business impact. Please let me know the right email to share it."
    ].join("\n")
  };
}

function summarizeProblems(signals: PainSignal[], lead: Lead): string {
  if (!lead.website) {
    return "there does not seem to be a clear website captured for customers who search online.";
  }

  if (!signals.length) {
    return "a few places where the website and lead flow can probably be tightened.";
  }

  const important = signals.find((signal) => signal.severity === "high") ?? signals[0];
  return `${important.title.toLowerCase()} (${important.detail.toLowerCase()}).`;
}

function serviceOutcome(service: ServiceFocus): string {
  const outcomes: Record<ServiceFocus, string> = {
    Website:
      "My focus would be a cleaner website that makes the service, trust proof, and contact path obvious.",
    SEO:
      "My focus would be local SEO fixes that help customers find the business before competitors.",
    "AI Automation":
      "My focus would be simple automation for missed inquiries, follow-ups, forms, and admin work.",
    "UI/UX":
      "My focus would be improving the page flow so more visitors understand the offer and contact you.",
    Ecommerce:
      "My focus would be product-page and checkout improvements that make buying easier.",
    "CRM Automation":
      "My focus would be a lightweight CRM flow so every inquiry is tracked and followed up."
  };

  return outcomes[service];
}

function buildSubject(lead: Lead, service: ServiceFocus): string {
  if (!lead.website) return `Website opportunity for ${lead.businessName}`;
  if (lead.audit && lead.audit.healthScore < 55) return `Quick website audit for ${lead.businessName}`;
  return `${service} improvement idea for ${lead.businessName}`;
}
