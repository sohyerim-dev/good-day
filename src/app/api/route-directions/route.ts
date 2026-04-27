import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { places } = await req.json();
  const origin = places[0];
  const destination = places[places.length - 1];

  const transitBody = JSON.stringify({
    origin: {
      location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
    },
    destination: {
      location: {
        latLng: { latitude: destination.lat, longitude: destination.lng },
      },
    },
    travelMode: "TRANSIT",
  });

  const [transitRes, tmapRes] = await Promise.all([
    fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
        "X-Goog-FieldMask":
          "routes.polyline.encodedPolyline,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.nameShort,routes.legs.steps.transitDetails.stopDetails,routes.legs.steps.staticDuration,routes.legs.steps.travelMode,routes.legs.duration",
      },
      body: transitBody,
    }),
    fetch("https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        appKey: process.env.TMAP_API_KEY!,
      },
      body: JSON.stringify({
        startX: origin.lng,
        startY: origin.lat,
        endX: destination.lng,
        endY: destination.lat,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName: "출발",
        endName: "도착",
      }),
    }),
  ]);

  const transitData = await transitRes.json();
  const tmapData = await tmapRes.json();

  const summary = tmapData.features?.[0]?.properties;
  const walkDuration = summary?.totalTime ? `${summary.totalTime}s` : undefined;

  const walkPath = tmapData.features
    ?.filter((f: { geometry: { type: string } }) => f.geometry.type === "LineString")
    .flatMap((f: { geometry: { coordinates: [number, number][] } }) =>
      f.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
    ) ?? [];

  return NextResponse.json({
    ...transitData,
    walkDuration,
    walkPath,
  });
}
