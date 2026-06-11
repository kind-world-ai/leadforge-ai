const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const USER_AGENT = "LeadForgeAI/0.1 (local lead research tool; human-approved outreach)";

export interface OsmBusiness {
  osmId: string;
  name: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  category?: string;
  sourceUrl: string;
}

/** Maps common search words to OSM tag filters. */
const tagMap: Record<string, string[]> = {
  dentist: ['["amenity"="dentist"]', '["healthcare"="dentist"]'],
  clinic: ['["amenity"="clinic"]', '["healthcare"="clinic"]', '["amenity"="doctors"]'],
  doctor: ['["amenity"="doctors"]', '["healthcare"="doctor"]'],
  hospital: ['["amenity"="hospital"]'],
  pharmacy: ['["amenity"="pharmacy"]'],
  restaurant: ['["amenity"="restaurant"]'],
  cafe: ['["amenity"="cafe"]'],
  bakery: ['["shop"="bakery"]'],
  gym: ['["leisure"="fitness_centre"]'],
  salon: ['["shop"="beauty"]', '["shop"="hairdresser"]'],
  spa: ['["leisure"="spa"]', '["shop"="massage"]'],
  hotel: ['["tourism"="hotel"]', '["tourism"="guest_house"]'],
  lawyer: ['["office"="lawyer"]'],
  accountant: ['["office"="accountant"]'],
  "real estate": ['["office"="estate_agent"]'],
  school: ['["amenity"="school"]'],
  college: ['["amenity"="college"]'],
  veterinary: ['["amenity"="veterinary"]'],
  electrician: ['["craft"="electrician"]'],
  plumber: ['["craft"="plumber"]'],
  carpenter: ['["craft"="carpenter"]'],
  tailor: ['["craft"="tailor"]', '["shop"="tailor"]'],
  jeweller: ['["shop"="jewelry"]'],
  furniture: ['["shop"="furniture"]'],
  optician: ['["shop"="optician"]'],
  "car repair": ['["shop"="car_repair"]'],
  garage: ['["shop"="car_repair"]'],
  supermarket: ['["shop"="supermarket"]'],
  shop: ['["shop"]']
};

export async function searchOsmBusinesses(input: {
  query: string;
  city: string;
  country: string;
  limit: number;
}): Promise<{ businesses: OsmBusiness[]; rawCount: number }> {
  const bbox = await geocodeCity(input.city, input.country);
  if (!bbox) {
    throw new Error(`Could not geocode "${input.city}, ${input.country}" via Nominatim.`);
  }

  const filters = buildFilters(input.query);
  const bboxStr = `(${bbox.south},${bbox.west},${bbox.north},${bbox.east})`;
  const blocks = filters
    .flatMap((filter) => [
      `node["name"]${filter}${bboxStr};`,
      `way["name"]${filter}${bboxStr};`
    ])
    .join("\n");

  const query = `[out:json][timeout:30];\n(\n${blocks}\n);\nout center tags ${Math.min(200, Math.max(input.limit * 4, 50))};`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": USER_AGENT },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Overpass API error (${response.status}). Try again in a minute — public servers are rate-limited.`);
    }
    const data = (await response.json()) as {
      elements?: {
        type: string;
        id: number;
        tags?: Record<string, string>;
      }[];
    };

    const seen = new Set<string>();
    const businesses: OsmBusiness[] = [];
    for (const element of data.elements ?? []) {
      const tags = element.tags ?? {};
      const name = tags.name?.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      businesses.push({
        osmId: `${element.type}/${element.id}`,
        name,
        website: tags.website || tags["contact:website"] || tags.url || undefined,
        phone: tags.phone || tags["contact:phone"] || undefined,
        email: tags.email || tags["contact:email"] || undefined,
        address: buildAddress(tags),
        category:
          tags.amenity || tags.shop || tags.office || tags.craft || tags.healthcare ||
          tags.tourism || tags.leisure || undefined,
        sourceUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`
      });
    }
    return { businesses, rawCount: data.elements?.length ?? 0 };
  } finally {
    clearTimeout(timeout);
  }
}

function buildFilters(rawQuery: string): string[] {
  const query = rawQuery.trim().toLowerCase();
  for (const [keyword, filters] of Object.entries(tagMap)) {
    if (query.includes(keyword)) return filters;
  }
  // Fallback: name regex across any business-like element.
  const safe = query.replace(/[^a-z0-9 ]/gi, "").trim();
  return [
    `["name"~"${safe}",i][~"^(amenity|shop|office|craft|healthcare|tourism|leisure)$"~"."]`
  ];
}

async function geocodeCity(
  city: string,
  country: string
): Promise<{ south: number; west: number; north: number; east: number } | null> {
  const params = new URLSearchParams({
    q: `${city}, ${country}`,
    format: "json",
    limit: "1"
  });
  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params}`, {
    headers: { "user-agent": USER_AGENT }
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { boundingbox?: [string, string, string, string] }[];
  const box = data[0]?.boundingbox;
  if (!box) return null;
  return {
    south: Number(box[0]),
    north: Number(box[1]),
    west: Number(box[2]),
    east: Number(box[3])
  };
}

function buildAddress(tags: Record<string, string>): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:suburb"],
    tags["addr:city"],
    tags["addr:postcode"]
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}
