import type { LeadInput, ServiceFocus } from "@/lib/types";

const PLACES_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places";

export type GooglePlacesImportMode = "discovery" | "enriched";

const textSearchFieldMasks: Record<GooglePlacesImportMode, string> = {
  discovery: [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.googleMapsUri",
    "places.primaryType",
    "places.types",
    "places.businessStatus"
  ].join(","),
  enriched: [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.googleMapsUri",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.rating",
    "places.userRatingCount",
    "places.primaryType",
    "places.types",
    "places.businessStatus"
  ].join(",")
};

const detailsFieldMask = [
  "id",
  "displayName",
  "formattedAddress",
  "googleMapsUri",
  "websiteUri",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "rating",
  "userRatingCount",
  "primaryType",
  "types",
  "businessStatus"
].join(",");

export interface GooglePlacesImportOptions {
  query: string;
  city: string;
  country: string;
  sector: string;
  serviceFocus: ServiceFocus;
  mode?: GooglePlacesImportMode;
  limit?: number;
  onlyMissingWebsite?: boolean;
}

export interface GooglePlaceDetailsOptions {
  placeId: string;
  city: string;
  country: string;
  sector: string;
  serviceFocus: ServiceFocus;
}

export interface GooglePlace {
  id?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  googleMapsUri?: string;
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
}

export interface GooglePlacesSearchResult {
  leads: LeadInput[];
  rawCount: number;
  query: string;
  mode: GooglePlacesImportMode;
}

export async function searchGooglePlaces(
  options: GooglePlacesImportOptions
): Promise<GooglePlacesSearchResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY in .env.local");
  }

  const limit = Math.max(1, Math.min(options.limit ?? 20, 20));
  const mode = options.mode ?? "discovery";
  const textQuery = buildTextQuery(options);
  const response = await fetch(PLACES_TEXT_SEARCH_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": textSearchFieldMasks[mode]
    },
    body: JSON.stringify({
      textQuery,
      pageSize: limit,
      languageCode: "en"
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Places request failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as { places?: GooglePlace[] };
  const places = data.places ?? [];
  const filtered = mode === "enriched" && options.onlyMissingWebsite
    ? places.filter((place) => !place.websiteUri)
    : places;

  return {
    query: textQuery,
    mode,
    rawCount: places.length,
    leads: filtered.slice(0, limit).map((place) => placeToLeadInput(place, options, mode))
  };
}

export async function getGooglePlaceDetails(
  options: GooglePlaceDetailsOptions
): Promise<LeadInput> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_PLACES_API_KEY in .env.local");
  }

  const placeId = normalizePlaceId(options.placeId);
  const response = await fetch(`${PLACES_DETAILS_URL}/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": detailsFieldMask
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Place Details request failed: ${response.status} ${errorText}`);
  }

  const place = (await response.json()) as GooglePlace;
  return placeToLeadInput(place, options, "enriched", placeId);
}

function buildTextQuery(options: GooglePlacesImportOptions): string {
  const query = options.query.trim();
  const location = [options.city, options.country].filter(Boolean).join(", ");
  if (query.toLowerCase().includes(options.city.toLowerCase())) return query;
  return `${query} in ${location}`;
}

function placeToLeadInput(
  place: GooglePlace,
  options: Pick<GooglePlacesImportOptions, "city" | "country" | "sector" | "serviceFocus">,
  mode: GooglePlacesImportMode,
  fallbackPlaceId?: string
): LeadInput {
  const placeId = place.id || fallbackPlaceId;
  const name = place.displayName?.text?.trim() || placeId || "Unnamed Google Places lead";
  const phone = place.nationalPhoneNumber || place.internationalPhoneNumber;
  const ratingLine =
    typeof place.rating === "number"
      ? `Rating ${place.rating}${place.userRatingCount ? ` from ${place.userRatingCount} reviews` : ""}.`
      : "";
  const statusLine = place.businessStatus ? `Business status: ${place.businessStatus}.` : "";
  const typeLine = place.primaryType ? `Primary type: ${place.primaryType}.` : "";
  const modeLine =
    mode === "discovery"
      ? "Google Places discovery import. Enrich only after the lead looks relevant."
      : "Google Places enriched import.";

  return {
    businessName: name,
    website: place.websiteUri ?? null,
    city: options.city,
    country: options.country,
    sector: options.sector,
    source: "Google Maps",
    sourceUrl: place.googleMapsUri,
    googlePlaceId: placeId,
    phone,
    services: [options.serviceFocus],
    notes: [place.formattedAddress, ratingLine, statusLine, typeLine, modeLine]
      .filter(Boolean)
      .join("\n"),
    tags: ["google-places", `places-${mode}`, place.businessStatus, place.primaryType].filter(
      Boolean
    ) as string[],
    nextAction: mode === "discovery"
      ? "Decide if this lead is worth enriching with website and phone"
      : place.websiteUri
      ? "Audit website and identify decision maker"
      : "Verify business manually and pitch website plus local SEO"
  };
}

function normalizePlaceId(placeId: string): string {
  return placeId.trim().replace(/^places\//, "");
}
