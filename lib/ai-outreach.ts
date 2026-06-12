import type { Lead, OutreachDraft } from "@/lib/types";
import { generateOutreach } from "@/lib/outreach";
import { brandingFromEnv } from "@/lib/report/report-html";

const API_URL = "https://api.anthropic.com/v1/messages";

export function aiOutreachAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** AI pack when a key is configured, template fallback otherwise/on error. */
export async function bestOutreach(
  lead: Lead
): Promise<{ outreach: OutreachDraft; usedAi: boolean; aiError?: string }> {
  if (aiOutreachAvailable()) {
    try {
      return { outreach: await generateAiOutreach(lead), usedAi: true };
    } catch (error) {
      return {
        outreach: generateOutreach(lead),
        usedAi: false,
        aiError: error instanceof Error ? error.message : "AI generation failed"
      };
    }
  }
  return { outreach: generateOutreach(lead), usedAi: false };
}

/**
 * Generates a fully personalized outreach pack from the lead's REAL audit data
 * using the Claude API. Throws on failure — callers fall back to templates.
 */
export async function generateAiOutreach(lead: Lead): Promise<OutreachDraft> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: buildPrompt(lead) }]
    })
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    content?: { type: string; text?: string }[];
  };
  if (!response.ok) {
    throw new Error(data.error?.message || `Claude API error ${response.status}`);
  }

  const text = data.content?.find((block) => block.type === "text")?.text ?? "";
  const parsed = parseJsonBlock(text);

  return {
    generatedAt: new Date().toISOString(),
    subject: str(parsed.subject) || `Quick findings about ${lead.businessName}'s website`,
    subjectOptions: arr(parsed.subjectOptions).slice(0, 3),
    shortEmail: str(parsed.email),
    whatsapp: str(parsed.whatsapp) || undefined,
    linkedinConnect: str(parsed.linkedinConnect) || undefined,
    linkedinNote: str(parsed.linkedinDm) || str(parsed.linkedinConnect),
    callOpener: str(parsed.callOpener),
    contactFormMessage: str(parsed.contactForm),
    followUps: Array.isArray(parsed.followUps)
      ? (parsed.followUps as { day?: number; channel?: string; message?: string }[])
          .filter((item) => item?.message)
          .slice(0, 3)
          .map((item) => ({
            day: Number(item.day ?? 3),
            channel: String(item.channel ?? "email"),
            message: String(item.message)
          }))
      : undefined,
    replyPlaybook: Array.isArray(parsed.replyPlaybook)
      ? (parsed.replyPlaybook as { intent?: string; response?: string }[])
          .filter((item) => item?.intent && item?.response)
          .slice(0, 6)
          .map((item) => ({ intent: String(item.intent), response: String(item.response) }))
      : undefined,
    aiGenerated: true
  };
}

function buildPrompt(lead: Lead): string {
  const brand = brandingFromEnv();
  const audit = lead.audit;
  const psiM = audit?.pagespeed?.mobile;
  const psiD = audit?.pagespeed?.desktop;

  const facts: string[] = [];
  facts.push(`Business: ${lead.businessName} — ${lead.sector} in ${lead.city}, ${lead.country}`);
  if (lead.website) facts.push(`Website: ${lead.website}`);
  if (lead.decisionMaker) facts.push(`Decision maker: ${lead.decisionMaker}`);
  if (audit?.technologies?.length) facts.push(`Built with: ${audit.technologies.join(", ")}`);
  if (psiM?.performance != null) {
    facts.push(
      `Google PageSpeed MOBILE: ${psiM.performance}/100${psiM.lcpMs ? ` (main content appears in ${(psiM.lcpMs / 1000).toFixed(1)}s, Google's good benchmark is 2.5s)` : ""}`
    );
  }
  if (psiD?.performance != null) facts.push(`Google PageSpeed DESKTOP: ${psiD.performance}/100`);
  if (audit && audit.status !== 0) facts.push(`Our site health score: ${audit.healthScore}/100`);
  if (audit?.crawlerSummary) facts.push(`Crawl: ${audit.crawlerSummary}`);

  const positives: string[] = [];
  if (audit?.hasSsl) positives.push("SSL in place");
  if (audit?.hasAnalytics) positives.push("analytics installed");
  if (audit?.hasContactForm) positives.push("working contact forms");
  if (lead.socials.length) positives.push(`active profiles: ${lead.socials.slice(0, 4).join(", ")}`);

  const issues = lead.painSignals
    .slice(0, 6)
    .map((signal) => `- [${signal.severity}] ${signal.title}${signal.evidence ? ` (evidence: ${signal.evidence})` : ""}`)
    .join("\n");

  return `You are an expert B2B copywriter for ${brand.name} (${brand.tagline}), a web/SEO/automation agency. Write a personalized cold outreach pack for the business below, based ONLY on the real audit facts given. A branded 3-page PDF audit report is ATTACHED to the email — reference it as the free value being given.

AUDIT FACTS (real, verifiable):
${facts.join("\n")}

ISSUES FOUND:
${issues || "- (no specific issues recorded)"}

WHAT THEY DO WELL (mention one genuinely):
${positives.join("; ") || "(nothing recorded)"}

SERVICES TO PITCH: ${lead.services.join(", ") || "Website, SEO"}

RULES:
- Lead with ONE specific verifiable number from the facts (e.g. the mobile score or load time). Never invent data.
- Genuine, human, helpful tone. No hype words ("skyrocket", "unlock", "revolutionary"). No em-dash overuse.
- Email under 120 words, 3 short paragraphs max, ends with a low-pressure permission question (not "book a call").
- Mention the attached free audit PDF as theirs to keep, even if they use their own developer.
- WhatsApp: under 60 words, casual, asks who the right contact is.
- LinkedIn connect note: under 280 characters.
- Compliment what they do well in one clause before the problem (genuine, not flattery).
- Reply playbook: short responses the sender can copy for each intent.
- Match spelling to the country (${lead.country === "Australia" ? "Australian English" : "neutral English"}).

Return ONLY valid JSON (no markdown fences) with exactly these keys:
{
  "subject": "best subject line",
  "subjectOptions": ["option 1", "option 2", "option 3"],
  "email": "the email body, plain text, no subject line, sign off as ${brand.name}",
  "whatsapp": "whatsapp message",
  "linkedinConnect": "connection request note",
  "linkedinDm": "message after they accept",
  "callOpener": "20-second phone opener",
  "contactForm": "message for their website contact form",
  "followUps": [
    {"day": 3, "channel": "email", "message": "..."},
    {"day": 7, "channel": "whatsapp", "message": "..."},
    {"day": 14, "channel": "email", "message": "breakup email"}
  ],
  "replyPlaybook": [
    {"intent": "Interested — send the audit", "response": "..."},
    {"intent": "How much does it cost?", "response": "..."},
    {"intent": "We already have a developer", "response": "..."},
    {"intent": "Not now / not interested", "response": "..."},
    {"intent": "Is this automated/spam?", "response": "..."}
  ]
}`;
}

function parseJsonBlock(text: string): Record<string, unknown> {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI did not return JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arr(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
