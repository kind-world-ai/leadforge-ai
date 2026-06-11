import { NextResponse } from "next/server";
import { crawlWebsite } from "@/lib/crawler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as { url?: string; maxPages?: number };
  if (!body.url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const audit = await crawlWebsite(body.url, { maxPages: body.maxPages });
    return NextResponse.json({ audit });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Crawler failed" },
      { status: 500 }
    );
  }
}
