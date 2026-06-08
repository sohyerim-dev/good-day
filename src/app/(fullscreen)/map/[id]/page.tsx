"use client";

import KakaoRouteRenderer, { decodeRoutePaths, SegmentPaths } from "@/components/KakaoRouteRenderer";
import RouteRenderer from "@/components/RouteRenderer";
import { createClient } from "@/lib/supabase/client";
import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import { APIProvider, Map as GoogleMap } from "@vis.gl/react-google-maps";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { Map as KakaoMap, useKakaoLoader } from "react-kakao-maps-sdk";

function isKoreanCoord(lat: number, lng: number) {
  return lat >= 33 && lat <= 38.5 && lng >= 124 && lng <= 132;
}

export default function RoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [places, setPlace] = useState<CoursePlace[]>([]);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTransit, setShowTransit] = useState(searchParams.get("transit") === "true");
  const [routeData, setRouteData] = useState<{ optimized: RouteSegment[]; bus: RouteSegment[]; subway: RouteSegment[] }>({
    optimized: [], bus: [], subway: [],
  });
  const [kakaoSegmentPaths, setKakaoSegmentPaths] = useState<SegmentPaths[]>([]);
  const [segmentVariants, setSegmentVariants] = useState<Record<number, "optimized" | "bus" | "subway">>({});
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [routeLoading, setRouteLoading] = useState(true);
  const isTransitMode = searchParams.get("transit") === "true";

  const [kakaoSdkLoading, kakaoSdkError] = useKakaoLoader({ appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY! });

  useEffect(() => {
    supabase
      .from("course_places")
      .select("*, places(*)")
      .eq("course_id", id)
      .order("order")
      .then(({ data, error }) => {
        if (data) setPlace(data);
        setLoading(false);
        if (!data || error) setError("경로를 불러올 수 없어요");
      });
  }, [id]);

  const isKorean = places.length > 0 && places.every(p => isKoreanCoord(p.places.lat, p.places.lng));
  // Kakao SDK 오류 시 구글맵 폴백
  const useKakao = isKorean && !kakaoSdkError;

  // 카카오맵용 route 데이터를 SDK와 별도로 미리 fetch
  useEffect(() => {
    if (!useKakao || places.length < 2) return;
    let cancelled = false;

    async function fetchRoutes() {
      const results = await Promise.all(
        Array.from({ length: places.length - 1 }, (_, i) => {
          const segPlaces = [
            { lat: places[i].places.lat, lng: places[i].places.lng },
            { lat: places[i + 1].places.lat, lng: places[i + 1].places.lng },
          ];
          const isGlobal = !places[i].places.naver_url || !places[i + 1].places.naver_url;
          return Promise.all([
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "transit" }) }).then(r => r.json()),
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "transit", transitMode: "bus" }) }).then(r => r.json()),
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "transit", transitMode: "subway" }) }).then(r => r.json()),
            fetch("/api/route-directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ places: segPlaces, mode: "walk", isGlobal }) }).then(r => r.json()),
          ]);
        })
      );

      if (cancelled) return;
      const { paths, optimized, bus, subway } = decodeRoutePaths(results);
      setKakaoSegmentPaths(paths);
      setRouteData({ optimized, bus, subway });
      setRouteLoading(false);
    }

    fetchRoutes();
    return () => { cancelled = true; };
  }, [useKakao, places]);

  const handleGoogleRouteData = useCallback((data: { optimized: RouteSegment[]; bus: RouteSegment[]; subway: RouteSegment[] }) => {
    setRouteData(data);
    setRouteLoading(false);
  }, []);

  function setSegmentVariant(i: number, v: "optimized" | "bus" | "subway") {
    setSegmentVariants((prev) => ({ ...prev, [i]: v }));
  }

  function segmentCurrentData(i: number) {
    const variant = segmentVariants[i] ?? "optimized";
    return routeData[variant]?.[i];
  }

  function segmentHasBusAlt(i: number) {
    return routeData.bus[i]?.steps?.some((s) => s.transitDetails?.transitLine?.vehicle?.type === "BUS") ?? false;
  }

  function segmentHasSubwayAlt(i: number) {
    return routeData.subway[i]?.steps?.some((s) => {
      const t = s.transitDetails?.transitLine?.vehicle?.type;
      return t === "SUBWAY" || t === "METRO_RAIL";
    }) ?? false;
  }

  function segmentCurrentHasSubway(i: number) {
    return segmentCurrentData(i)?.steps?.some((s) => {
      const t = s.transitDetails?.transitLine?.vehicle?.type;
      return t === "SUBWAY" || t === "METRO_RAIL";
    }) ?? false;
  }

  function segmentCurrentHasBus(i: number) {
    return segmentCurrentData(i)?.steps?.some((s) => s.transitDetails?.transitLine?.vehicle?.type === "BUS") ?? false;
  }

  const activeSegments = routeData.optimized;

  if (loading)
    return (
      <main className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-[#EE6300] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  if (error)
    return (
      <main className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-400">{error}</p>
        <button onClick={() => router.back()} className="text-[#EE6300]">
          뒤로 가기
        </button>
      </main>
    );
  return (
    <main className="relative h-dvh overflow-hidden">
      <div className="z-50 absolute top-4 left-4 right-4 flex justify-between">
        <button
          onClick={() => router.back()}
          className="bg-white rounded-2xl px-4 py-2 shadow text-[16px] font-medium cursor-pointer text-[#EE6300] hover:text-black"
        >
          뒤로 가기
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => { if (isTransitMode) setShowTransit(false); router.push(isTransitMode ? `/map/${id}` : `/map/${id}?transit=true`); }}
            className="bg-[#EE6300] text-white rounded-2xl px-4 py-2 shadow text-[14px] font-medium cursor-pointer"
          >
            {isTransitMode ? "도보 경로 보기" : "교통수단・경로 보기"}
          </button>
          {isTransitMode && (
            <button
              onClick={() => setShowTransit(!showTransit)}
              className={`rounded-2xl px-4 py-2 shadow text-[14px] font-medium cursor-pointer ${
                showTransit ? "bg-gray-800 text-white" : "bg-white text-gray-700"
              }`}
            >
              {showTransit ? "교통수단 닫기" : "교통수단 보기"}
            </button>
          )}
        </div>
      </div>

      {/* 구간 선택 버튼 */}
      {activeSegments.length > 0 && (
        <div className="z-50 absolute top-16 left-0 right-0 flex gap-2 overflow-x-auto px-4 py-1 scrollbar-hide">
          <button
            onClick={() => setSelectedSegment(null)}
            className={`shrink-0 rounded-2xl px-4 py-1.5 text-[13px] font-medium shadow cursor-pointer ${
              selectedSegment === null ? "bg-gray-800 text-white" : "bg-white text-gray-700"
            }`}
          >
            전체
          </button>
          {activeSegments.map((seg, i) => {
            const walkMin = !isTransitMode && seg.walkDuration
              ? Math.round(parseInt(seg.walkDuration.replace("s", "")) / 60)
              : null;
            return (
              <button
                key={i}
                onClick={() => setSelectedSegment(selectedSegment === i ? null : i)}
                className={`shrink-0 rounded-2xl px-4 py-1.5 text-[13px] font-medium shadow cursor-pointer ${
                  selectedSegment === i ? "bg-[#EE6300] text-white" : "bg-white text-gray-700"
                }`}
              >
                {i + 1}→{i + 2}{walkMin !== null && walkMin > 0 ? ` · ${walkMin}분` : ""}
              </button>
            );
          })}
        </div>
      )}

      {/* 경로 로딩 오버레이 */}
      {routeLoading && (
        <div className="z-50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl px-6 py-4 shadow-lg flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-4 border-[#EE6300] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] text-gray-500">경로를 불러오는 중이에요</p>
        </div>
      )}

      {/* 범례 + 도보 총 소요 시간 */}
      <div className="z-50 absolute bottom-8 left-4 bg-white rounded-2xl px-4 py-2 shadow text-[12px] flex flex-col gap-1">
        {isTransitMode && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.75 bg-gray-700 rounded" />
            <span>교통수단 경로</span>
          </div>
        )}
        {!isTransitMode && (
          <div className="flex items-center gap-2">
            <div className="w-6 flex items-center gap-0.5">
              {[0,1,2].map((i) => <div key={i} className="w-1 h-1 rounded-full bg-gray-400" />)}
            </div>
            <span>도보 경로</span>
          </div>
        )}
        {!isTransitMode && activeSegments.length > 0 && (() => {
          const totalSec = activeSegments.reduce((sum, seg) =>
            sum + parseInt(seg.walkDuration?.replace("s", "") ?? "0"), 0);
          const totalMin = Math.round(totalSec / 60);
          return totalMin > 0 ? (
            <span className="text-gray-500 text-[11px]">총 도보 약 {totalMin}분</span>
          ) : null;
        })()}
      </div>

      {/* 지도 렌더링: 국내 → 카카오맵, 해외 또는 Kakao 오류 → 구글맵 */}
      {useKakao ? (
        !kakaoSdkLoading && (
          <KakaoMap
            center={{ lat: 37.5, lng: 127 }}
            style={{ width: "100%", height: "100dvh" }}
            level={5}
          >
            <KakaoRouteRenderer
              places={places}
              segmentPaths={kakaoSegmentPaths}
              selectedSegment={selectedSegment}
              showTransit={isTransitMode}
              showWalk={!isTransitMode}
              segmentVariants={segmentVariants}
            />
          </KakaoMap>
        )
      ) : (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <GoogleMap
            mapId="DEMO_MAP_ID"
            style={{ width: "100%", height: "100dvh" }}
            defaultCenter={{ lat: 37.5, lng: 127 }}
            defaultZoom={12}
            mapTypeControl={false}
          >
            <RouteRenderer
              places={places}
              onRouteData={handleGoogleRouteData}
              selectedSegment={selectedSegment}
              showTransit={isTransitMode}
              showWalk={!isTransitMode}
              segmentVariants={segmentVariants}
            />
          </GoogleMap>
        </APIProvider>
      )}

      {/* 바텀시트 */}
      {showTransit && (
        <div className="z-50 absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-[18px]">교통수단 정보</h2>
            <button
              onClick={() => setShowTransit(false)}
              className="text-gray-400 cursor-pointer hover:text-black"
            >
              닫기
            </button>
          </div>
          {activeSegments.map((_, i) => {
            const segment = segmentCurrentData(i) ?? activeSegments[i];
            const seconds = parseInt(segment?.duration?.replace("s", "") ?? "0");
            const minutes = Math.round(seconds / 60);
            const variant = segmentVariants[i] ?? "optimized";
            const showBusBtn = segmentCurrentHasSubway(i) && segmentHasBusAlt(i) && variant !== "bus";
            const showSubwayBtn = segmentCurrentHasBus(i) && segmentHasSubwayAlt(i) && variant !== "subway";
            const showBackBtn = variant !== "optimized";

            return (
              <div key={i} className="mb-3 bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <p className="font-medium text-[14px]">
                    구간 {i + 1} → {i + 2} · 교통수단 {minutes}분
                    {segment.walkDuration && (
                      <span className="text-gray-400 ml-2 font-normal text-[12px]">
                        / 도보 {Math.round(parseInt(segment.walkDuration.replace("s", "")) / 60)}분
                      </span>
                    )}
                  </p>
                  <div className="flex gap-1">
                    {showBusBtn && (
                      <button onClick={() => setSegmentVariant(i, "bus")} className="text-[11px] px-2 py-1 rounded-xl bg-white border border-gray-200 text-gray-600 cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300]">
                        🚌 버스로 보기
                      </button>
                    )}
                    {showSubwayBtn && (
                      <button onClick={() => setSegmentVariant(i, "subway")} className="text-[11px] px-2 py-1 rounded-xl bg-white border border-gray-200 text-gray-600 cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300]">
                        🚇 지하철로 보기
                      </button>
                    )}
                    {showBackBtn && (
                      <button onClick={() => setSegmentVariant(i, "optimized")} className="text-[11px] px-2 py-1 rounded-xl bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300">
                        최적 경로
                      </button>
                    )}
                  </div>
                </div>
                {segment?.steps
                  ?.reduce((acc: typeof segment.steps, step) => {
                    const last = acc[acc.length - 1];
                    if (step.travelMode === "WALK" && last?.travelMode === "WALK") {
                      const prevSec = parseInt(last.staticDuration?.replace("s", "") ?? "0");
                      const curSec = parseInt(step.staticDuration?.replace("s", "") ?? "0");
                      acc[acc.length - 1] = { ...last, staticDuration: `${prevSec + curSec}s` };
                      return acc;
                    }
                    return [...acc, step];
                  }, [])
                  .map((step, j) => {
                    if (step.travelMode === "WALK") {
                      const walkMinutes = Math.round(
                        parseInt(step.staticDuration?.replace("s", "") ?? "0") / 60,
                      );
                      if (walkMinutes === 0) return null;
                      return (
                        <div key={j} className="flex items-start gap-3 mb-2">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-1" />
                            <div className="w-px h-6 bg-gray-200" />
                          </div>
                          <span className="text-[12px] text-gray-400">🚶 도보 {walkMinutes}분</span>
                        </div>
                      );
                    }
                    if (step.transitDetails) {
                      return (
                        <div key={j} className="flex items-start gap-3 mb-2">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-[#EE6300] mt-1" />
                            <div className="w-px h-6 bg-gray-200" />
                          </div>
                          <div className="text-[12px] flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-gray-700 font-medium">
                                {(() => {
                                  const type = step.transitDetails?.transitLine?.vehicle?.type;
                                  if (type === "SUBWAY" || type === "METRO_RAIL") return "🚇";
                                  if (type === "RAIL" || type === "COMMUTER_TRAIN" || type === "HEAVY_RAIL") return "🚆";
                                  if (type === "TRAM" || type === "LIGHT_RAIL") return "🚊";
                                  if (type === "FERRY") return "⛴";
                                  return "🚌";
                                })()} {step.transitDetails?.transitLine?.name}
                              </span>
                              {step.transitDetails?.transitLine?.nameShort && (
                                <span className="bg-gray-200 text-gray-600 rounded px-1.5 py-0.5 text-[11px] font-medium">
                                  {step.transitDetails.transitLine.nameShort}
                                </span>
                              )}
                              {step.staticDuration && (() => {
                                const min = Math.round(parseInt(step.staticDuration.replace("s", "")) / 60);
                                return min > 0 ? (
                                  <span className="text-gray-400 text-[11px]">{min}분</span>
                                ) : null;
                              })()}
                            </div>
                            <span className="text-gray-400 leading-relaxed">
                              {step.transitDetails?.stopDetails?.departureStop?.name}
                              {" → "}
                              {step.transitDetails?.stopDetails?.arrivalStop?.name}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
