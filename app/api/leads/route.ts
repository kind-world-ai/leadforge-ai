import { NextResponse } from "next/server";
import { auditWebsite } from "@/lib/audit";
import { createLead, listLeads, replaceLead } from "@/lib/store";
import { leadStatuses, type LeadInput, type LeadStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const query = url.searchParams.get("q")?.toLowerCase().trim();
  const country = url.searchParams.get("country")?.toLowerCase().trim();
  const sector = url.searchParams.get("sector")?.toLowerCase().trim();

  let leads = await listLeads();

  if (status && isLeadStatus(status)) {
    leads = leads.filter((lead) => lead.status === status);
  }

  if (query) {
    leads = leads.filter((lead) =>
      [
        lead.businessName,
        lead.website ?? "",
        lead.city,
        lead.country,
        lead.sector,
        lead.fitReason,
        lead.notes
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  if (country) {
    leads = leads.filter((lead) => lead.country.toLowerCase().includes(country));
  }

  if (sector) {
    leads = leads.filter((lead) => lead.sector.toLowerCase().includes(sector));
  }

  return NextResponse.json({ leads });
}

export async function POST(request: Request) {
  const body = (await request.json()) as LeadInput & { autoAudit?: boolean };

  if (!body.businessName?.trim()) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 });
  }

  let lead = await createLead(body);

  if (body.autoAudit && lead.website) {
    const audit = await auditWebsite(lead.website);
    lead = await replaceLead({
      ...lead,
      audit,
      status: lead.status === "New" ? "Qualified" : lead.status,
      nextAction: "Review audit and approve outreach draft"
    });
  }

  return NextResponse.json({ lead }, { status: 201 });
}

function isLeadStatus(value: string): value is LeadStatus {
  return leadStatuses.includes(value as LeadStatus);
}
