import { NextRequest, NextResponse } from "next/server";

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let result = 0, shift = 0, b: number;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

export async function POST(req: NextRequest) {
  const { places, isGlobal, mode, transitMode } = await req.json();

  const origin = places[0];
  const destination = places[places.length - 1];

  // 도보 경로
  if (mode === "walk") {
    if (isGlobal) {
      // 해외: Google Routes WALK
      const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask": "routes.polyline.encodedPolyline,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
          destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
          travelMode: "WALK",
        }),
      });
      const data = await res.json();
      const encoded = data.routes?.[0]?.polyline?.encodedPolyline;
      return NextResponse.json({
        walkDuration: data.routes?.[0]?.duration,
        walkPath: encoded ? decodePolyline(encoded) : [],
      });
    }

    // 국내: T-Map 도보
    const res = await fetch("https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1", {
      method: "POST",
      headers: { "Content-Type": "application/json", appKey: process.env.TMAP_API_KEY! },
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
    });
    const data = await res.json();
    const summary = data.features?.[0]?.properties;
    const walkPath =
      data.features
        ?.filter((f: { geometry: { type: string } }) => f.geometry.type === "LineString")
        .flatMap((f: { geometry: { coordinates: [number, number][] } }) =>
          f.geometry.coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })),
        ) ?? [];
    return NextResponse.json({
      walkDuration: summary?.totalTime ? `${summary.totalTime}s` : undefined,
      walkPath,
    });
  }

  // 교통수단 경로
  const transitPreferences =
    transitMode === "bus" ? { allowedTravelModes: ["BUS"] } :
    transitMode === "subway" ? { allowedTravelModes: ["SUBWAY", "RAIL"] } :
    undefined;

  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask":
        "routes.polyline.encodedPolyline,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.nameShort,routes.legs.steps.transitDetails.transitLine.vehicle,routes.legs.steps.transitDetails.stopDetails,routes.legs.steps.staticDuration,routes.legs.steps.travelMode,routes.legs.duration",
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      travelMode: "TRANSIT",
      ...(transitPreferences && { transitPreferences }),
    }),
  });
  return NextResponse.json(await res.json());
}
