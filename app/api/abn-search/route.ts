import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const name = url.searchParams.get("name")?.trim() ?? "";
  if (name.length < 3) {
    return NextResponse.json({ error: "Business name must be at least 3 characters." }, { status: 400 });
  }

  const guid = process.env.ABN_LOOKUP_GUID;
  if (!guid) {
    return NextResponse.json(
      {
        error:
          "ABN_LOOKUP_GUID missing. Register free at abr.business.gov.au/Tools/WebServices and add the GUID to .env.local."
      },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      name,
      maxResults: "20",
      guid
    });
    const response = await fetch(
      `https://abr.business.gov.au/json/MatchingNames.aspx?${params}`,
      { headers: { accept: "application/json" } }
    );
    const text = await response.text();
    // The endpoint returns JSONP: callback({...})
    const json = text.replace(/^[^(]*\(/, "").replace(/\)\s*$/, "");
    const data = JSON.parse(json) as {
      Message?: string;
      Names?: {
        Abn?: string;
        AbnStatus?: string;
        Name?: string;
        NameType?: string;
        State?: string;
        Postcode?: string;
        Score?: number;
      }[];
    };

    if (data.Message) {
      return NextResponse.json({ error: data.Message }, { status: 502 });
    }

    const results = (data.Names ?? []).map((item) => ({
      abn: item.Abn ?? "",
      status: item.AbnStatus ?? "",
      name: item.Name ?? "",
      nameType: item.NameType ?? "",
      state: item.State ?? "",
      postcode: item.Postcode ?? "",
      score: item.Score ?? 0
    }));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ABN lookup failed" },
      { status: 502 }
    );
  }
}
