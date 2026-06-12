import { NextResponse } from "next/server";
import { brandingFromEnv, buildReportHtml } from "@/lib/report/report-html";
import { renderPdf } from "@/lib/report/pdf";
import { getLead } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!lead.audit) {
    return NextResponse.json(
      { error: "Run an audit (or Full diagnosis) first — the report is built from real audit data." },
      { status: 400 }
    );
  }

  try {
    const html = buildReportHtml(lead, brandingFromEnv());
    const pdf = await renderPdf(html);
    const safeName = lead.businessName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="website-audit-${safeName}.pdf"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `PDF generation failed: ${error.message}. The report needs Playwright (run on the machine that has it).`
            : "PDF generation failed"
      },
      { status: 500 }
    );
  }
}
