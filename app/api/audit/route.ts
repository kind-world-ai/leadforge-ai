import { NextResponse } from "next/server";
import { auditWebsite } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string };
  if (!body.url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const audit = await auditWebsite(body.url);
  return NextResponse.json({ audit });
}
