import { listLeads } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const leads = await listLeads();
  const header = [
    "Business",
    "Website",
    "City",
    "Country",
    "Sector",
    "Source",
    "Source URL",
    "Google Place ID",
    "Status",
    "Score",
    "Services",
    "Email",
    "Phone",
    "Next action",
    "Fit reason",
    "Top signals"
  ];

  const rows = leads.map((lead) => [
    lead.businessName,
    lead.website ?? "",
    lead.city,
    lead.country,
    lead.sector,
    lead.source,
    lead.sourceUrl ?? "",
    lead.googlePlaceId ?? "",
    lead.status,
    String(lead.score),
    lead.services.join("; "),
    lead.email ?? "",
    lead.phone ?? "",
    lead.nextAction,
    lead.fitReason,
    lead.painSignals
      .slice(0, 4)
      .map((signal) => signal.title)
      .join("; ")
  ]);

  const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leadforge-export-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`
    }
  });
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
