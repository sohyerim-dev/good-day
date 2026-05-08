import { NextRequest, NextResponse } from "next/server";

// 클라이언트에서 fetch("/api/route-directions", { method: "POST" }) 로 호출하면 실행되는 함수
// 출발지·도착지 두 좌표를 받아서, 대중교통 경로(Google)와 도보 경로(T-Map)를 동시에 조회한 뒤
// 하나로 합쳐 클라이언트에 반환하는 API 엔드포인트
export async function POST(req: NextRequest) {
  const { places } = await req.json();

  // 클라이언트에서 [{ lat, lng}, { lat, lng}] 형태로 두 좌표를 보냄.
  const origin = places[0]; // 출발지
  const destination = places[places.length - 1]; // 도착지

  // Google Routes API 요청 body: 출발지·도착지 좌표와 대중교통 모드 지정
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

  // Promise.all은 두 요청(대중교통 경로, 도보 경로)을 동시에 보내서 기다림
  // 결과가 배열로 오면 각각 transitRes(대중교통 경로), tmapRes(도보 경로)에 저장
  // 대중교통은 Google Routes API, 도보는 T-Map API 사용
  const [transitRes, tmapRes] = await Promise.all([
    fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY!,
        // 응답에서 필요한 필드 지정
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
        startX: origin.lng, // 출발점 경도
        startY: origin.lat, // 출발점 위도
        endX: destination.lng, // 도착점 경도
        endY: destination.lat, // 도착점 위도
        reqCoordType: "WGS84GEO", // 입력 좌표 형식
        resCoordType: "WGS84GEO", // 출력 좌표 형식
        startName: "출발",
        endName: "도착",
      }),
    }),
  ]);

  // raw HTTP 응답으로 오는 fetch 응답을 json 형태로 파싱 (.json()도 비동기라 await 붙임)
  const transitData = await transitRes.json();
  const tmapData = await tmapRes.json();

  // T-Map 응답은 GeoJSON 형식
  const summary = tmapData.features?.[0]?.properties; // 전체 경로 요약 정보
  // totalTime이 초 단위 숫자로 오기 때문에 Google 형식과 맞추기 위해 문자열로 저장
  const walkDuration = summary?.totalTime ? `${summary.totalTime}s` : undefined;

  // T-map features 응답 구조는 Point, LineString이 섞여있기 때문에 LineString만 filter로 추리기
  // flatMap은 map + 펼치기 => feature의 좌표 배열을 하나의 배열로 합침.
  // { lat, lng } 객체로 오는 Google Maps와 맞추기 위해 T-Map 좌표 [lng, lat]를 순서를 뒤집어 객체로 바꿔 변환
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

  // 클라이언트에 Google 데이터 + T-Map 데이터를 보냄.
  return NextResponse.json({
    ...transitData,
    walkDuration,
    walkPath,
  });
}
