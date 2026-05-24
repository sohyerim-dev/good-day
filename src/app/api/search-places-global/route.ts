import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query")?.trim();
  if (!query) return NextResponse.json({ items: [] });

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
    },
    body: JSON.stringify({ textQuery: query }),
  });

  const data = await res.json();
  if (!data.places) return NextResponse.json({ items: [] });

  const items = (data.places as any[]).slice(0, 5).map((place) => ({
    id: place.id,
    title: place.displayName?.text ?? "",
    address: place.formattedAddress ?? "",
    roadAddress: place.formattedAddress ?? "",
    mapx: String(Math.round(place.location.longitude * 10000000)),
    mapy: String(Math.round(place.location.latitude * 10000000)),
    link: `https://www.google.com/maps/search/?api=1&query_place_id=${place.id}`,
    naverPlaceUrl: "",
    google_place_id: place.id,
    source: "google",
  }));

  return NextResponse.json({ items });
}
