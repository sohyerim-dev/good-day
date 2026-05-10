"use client";

import RouteRenderer from "@/components/RouteRenderer";
import { createClient } from "@/lib/supabase/client";
import { CoursePlace } from "@/types/course";
import { RouteSegment } from "@/types/route";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function RoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [places, setPlace] = useState<CoursePlace[]>([]); // 코스 장소 목록

  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showTransit, setShowTransit] = useState(
    searchParams.get("transit") === "true",
  ); // 바텀시트 열림/닫힘
  const [routeData, setRouteData] = useState<RouteSegment[]>([]); // 경로 데이터
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // 해당 코스의 장소 목록 불러오기
  // course_places와 places 테이블을 JOIN해서 좌표, 이름 등을 한 번에 가져옴
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
    <main className="relative h-screen overflow-hidden max-h-svh">
      <div className="z-50 absolute top-4 left-4 right-4 flex justify-between">
        <button
          onClick={() => router.back()}
          className="bg-white rounded-2xl px-4 py-2 shadow text-[16px] font-medium cursor-pointer text-[#EE6300] hover:text-black"
        >
          뒤로 가기
        </button>
        <button
          onClick={() => setShowTransit(!showTransit)}
          className={`rounded-2xl px-4 py-2 shadow text-[16px] font-medium cursor-pointer ${
            showTransit ? "bg-gray-800 text-white" : "bg-[#EE6300] text-white"
          }`}
        >
          {showTransit ? "교통수단 닫기" : "교통수단 보기"}
        </button>
      </div>

      {/* 범례 */}
      <div className="z-50 absolute bottom-8 left-4 bg-white rounded-2xl px-4 py-2 shadow text-[12px] flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-0.75 bg-gray-700 rounded" />
          <span>교통수단 경로</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 border-t-2 border-dashed border-gray-400" />
          <span>도보 경로</span>
        </div>
      </div>

      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          mapId="DEMO_MAP_ID"
          style={{ width: "100%", height: "100vh" }}
          defaultCenter={{ lat: 37.5, lng: 127 }}
          defaultZoom={12}
          mapTypeControl={false}
        >
          <RouteRenderer places={places} onRouteData={setRouteData} />
        </Map>
      </APIProvider>

      {/* 바텀시트 */}
      {showTransit && (
        <div className="z-50 absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-[18px]">교통수단 정보</h2>
            <button
              onClick={() => setShowTransit(false)}
              className="text-gray-400"
            >
              닫기
            </button>
          </div>
          {routeData.map((segment, i) => {
            const seconds = parseInt(
              segment?.duration?.replace("s", "") ?? "0",
            );
            const minutes = Math.round(seconds / 60);

            return (
              <div key={i} className="mb-3 bg-gray-50 rounded-2xl p-4">
                <p className="font-medium text-[14px] mb-2">
                  구간 {i + 1} → {i + 2} · 교통수단 {minutes}분
                  {segment.walkDuration && (
                    <span className="text-gray-400 ml-2 font-normal text-[12px]">
                      / 도보{" "}
                      {Math.round(
                        parseInt(segment.walkDuration.replace("s", "")) / 60,
                      )}
                      분
                    </span>
                  )}
                </p>
                {segment?.steps?.map((step, j) => {
                  if (step.travelMode === "WALK") {
                    const walkMinutes = Math.round(
                      parseInt(step.staticDuration?.replace("s", "") ?? "0") /
                        60,
                    );
                    return (
                      <div key={j} className="flex items-start gap-3 mb-2">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-gray-300 mt-1" />
                          <div className="w-px h-6 bg-gray-200" />
                        </div>
                        <span className="text-[12px] text-gray-400">
                          🚶 도보 {walkMinutes}분
                        </span>
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
                        <div className="text-[12px]">
                          <span className="text-gray-700 font-medium">
                            🚌 {step.transitDetails?.transitLine?.name}
                            {step.transitDetails?.transitLine?.nameShort && (
                              <span className="ml-1 text-gray-400">
                                ({step.transitDetails.transitLine.nameShort})
                              </span>
                            )}
                          </span>
                          <span className="text-gray-400 ml-2">
                            {
                              step.transitDetails?.stopDetails?.departureStop
                                ?.name
                            }{" "}
                            →{" "}
                            {
                              step.transitDetails?.stopDetails?.arrivalStop
                                ?.name
                            }
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
