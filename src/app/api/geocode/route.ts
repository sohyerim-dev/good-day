import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  if (!query) return NextResponse.json({ error: "No query" }, { status: 400 });
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=ko&region=KR&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  const location = data.results?.[0]?.geometry?.location;

  if (!location)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ lat: location.lat, lng: location.lng, formatted_address: data.results[0].formatted_address });
}
