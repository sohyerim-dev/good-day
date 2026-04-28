import { NextRequest, NextResponse } from "next/server";

// 클라이언트에서 fetch("/api/route-directions", { method: "POST" }) 로 호출하면 실행되는 함수
export async function POST(req: NextRequest) {
  const { places } = await req.json();

  // 클라이언트에서 [{ lat, lng}, { lat, lng}] 형태로 두 좌표를 보냄.
  const origin = places[0]; // 출발지
  const destination = places[places.length - 1]; // 도착지

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

  // Promise.all은 두 요청을 동시에 보내서 기다림.
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

  const walkPath =
    tmapData.features
      ?.filter(
        (f: { geometry: { type: string } }) => f.geometry.type === "LineString",
      )
      .flatMap((f: { geometry: { coordinates: [number, number][] } }) =>
        f.geometry.coordinates.map(([lng, lat]: [number, number]) => ({
          lat,
          lng,
        })),
      ) ?? [];

  return NextResponse.json({
    ...transitData,
    walkDuration,
    walkPath,
  });
}
