"use client";
import CoursePreviewRenderer from "@/components/CoursePreviewRenderer";
import KakaoMarkerRenderer from "@/components/KakaoMarkerRenderer";
import KakaoPreviewRenderer from "@/components/KakaoPreviewRenderer";
import LocationSetter from "@/components/LocationSetter";
import MarkerRenderer from "@/components/MarkerRenderer";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { ExploreCoursePlace } from "@/types/place";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Map as KakaoMap, useKakaoLoader } from "react-kakao-maps-sdk";

function isKoreanCoord(lat: number, lng: number) {
  return lat >= 33 && lat <= 38.5 && lng >= 124 && lng <= 132;
}

function zoomToKakaoLevel(zoom: number): number {
  const table: Record<number, number> = {
    3: 14, 4: 13, 5: 12, 6: 11, 7: 10, 8: 9,
    9: 8, 10: 7, 11: 6, 12: 5, 13: 4, 14: 3, 15: 2,
  };
  return table[zoom] ?? 5;
}

export default function Explore() {
  const [center, setCenter] = useState({ lat: 37.5, lng: 127 });
  const [isKorean, setIsKorean] = useState(true);
  const [kakaoLevel, setKakaoLevel] = useState(5);

  const [kakaoSdkLoading, kakaoSdkError] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY!,
  });

  const showKakao = isKorean && !kakaoSdkLoading && !kakaoSdkError;
  const kakaoFallbackGoogle = isKorean && !!kakaoSdkError;

  const router = useRouter();
  const supabase = createClient();
  const user = useUserStore((state) => state.user);
  const [neLat, setNeLat] = useState<number>();
  const [neLng, setNeLng] = useState<number>();
  const [swLat, setSwLat] = useState<number>();
  const [swLng, setSwLng] = useState<number>();

  const [exploreAllPlaces, setExploreAllPlaces] = useState<ExploreCoursePlace[]>([]);

  type CpType = ExploreCoursePlace["course_places"][number];
  type MarkerPlace = ExploreCoursePlace & { course_places: CpType[] };

  // stable ref: 지도 이동과 무관하게 진짜 가운데 장소에 마커 고정
  const stableMarkersRef = useRef<Record<string, MarkerPlace>>({});
  const [markerPlaces, setMarkerPlaces] = useState<MarkerPlace[]>([]);

  useEffect(() => {
    // 현재 보이는 코스 ID와 각 코스의 메타 정보 수집
    const visibleCourseIds = new Set<string>();
    const courseTotalCount: Record<string, number> = {};
    const courseCpList: Record<string, CpType> = {};
    exploreAllPlaces.forEach((p) => {
      p.course_places.forEach((cp) => {
        visibleCourseIds.add(cp.course_id);
        courseTotalCount[cp.course_id] = cp.courses.course_places?.[0]?.count ?? 1;
        if (!courseCpList[cp.course_id]) courseCpList[cp.course_id] = cp;
      });
    });

    // viewport 밖으로 나간 코스 제거
    Object.keys(stableMarkersRef.current).forEach((courseId) => {
      if (!visibleCourseIds.has(courseId)) delete stableMarkersRef.current[courseId];
    });

    // 새로 나타난 코스만 쿼리
    const newCourseIds = [...visibleCourseIds].filter((id) => !stableMarkersRef.current[id]);
    if (newCourseIds.length === 0) {
      setMarkerPlaces(Object.values(stableMarkersRef.current));
      return;
    }

    supabase
      .from("course_places")
      .select("course_id, order, places!inner(id, lat, lng, name, address, naver_url)")
      .in("course_id", newCourseIds)
      .then(({ data }) => {
        if (!data) return;
        const byCourse: Record<string, typeof data> = {};
        data.forEach((cp) => {
          if (!byCourse[cp.course_id]) byCourse[cp.course_id] = [];
          byCourse[cp.course_id].push(cp);
        });
        Object.entries(byCourse).forEach(([courseId, cps]) => {
          const midOrder = Math.ceil((courseTotalCount[courseId] ?? cps.length) / 2);
          const best = cps.reduce((a, b) =>
            Math.abs(a.order - midOrder) <= Math.abs(b.order - midOrder) ? a : b
          );
          const pl = best.places as unknown as ExploreCoursePlace;
          stableMarkersRef.current[courseId] = {
            ...pl,
            course_places: courseCpList[courseId] ? [courseCpList[courseId]] : [],
          };
        });
        setMarkerPlaces(Object.values(stableMarkersRef.current));
      });
  }, [exploreAllPlaces]);

  const markerCourseIds = new Set(markerPlaces.flatMap((p) => p.course_places.map((cp) => cp.course_id)));

  const placeGroup = exploreAllPlaces.reduce(
    (acc, p) => {
      p.course_places.forEach((cp) => {
        if (!markerCourseIds.has(cp.course_id)) return;
        if (!acc[cp.course_id]) acc[cp.course_id] = [];
        acc[cp.course_id].push(p);
      });
      return acc;
    },
    {} as Record<string, ExploreCoursePlace[]>,
  );
  const [selected, setSelected] = useState<ExploreCoursePlace | null>(null);
  const [selectedCourseIdx, setSelectedCourseIdx] = useState(0);
  const [selectedCoursePlaces, setSelectedCoursePlaces] =
    useState<
      { order: number; places: { name: string; lat: number; lng: number } }[]
    >();
  const [showCourses, setShowCourses] = useState(false);
  const [visibleCourseCount, setVisibleCourseCount] = useState(10);
  const [zoomLevel, setZoomLevel] = useState<number | undefined>();
  const [locationQuery, setLocationQuery] = useState("");

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCenter({ lat, lng });
        if (!isKoreanCoord(lat, lng)) {
          setIsKorean(false);
        }
      },
      () => {},
    );
  }, []);

  useEffect(() => {
    if (!neLat || !neLng || !swLat || !swLng) return;

    const isVisible = (cp: { courses: { is_public: boolean; is_hidden: boolean; user_id: string; course_places?: { count: number }[] } }) =>
      !cp.courses.is_hidden &&
      (cp.courses.is_public || cp.courses.user_id === user?.id) &&
      (cp.courses.course_places?.[0]?.count ?? 0) >= 2;

    supabase
      .from("places")
      .select("*, course_places!inner(*, courses!inner(*, profiles(username), course_places(count)))")
      .gte("lat", swLat)
      .lte("lat", neLat)
      .gte("lng", swLng)
      .lte("lng", neLng)
      .then(({ data }) => {
        const filtered = data?.map((p) => ({
          ...p,
          course_places: p.course_places.filter(isVisible),
        })).filter((p) => p.course_places.length > 0);
        setExploreAllPlaces(filtered ?? []);
        setVisibleCourseCount(10);
      });
  }, [swLat, neLat, swLng, neLng]);

  async function handleLocationSearch() {
    if (!locationQuery.trim()) return;
    const res = await fetch(
      `/api/geocode?query=${encodeURIComponent(locationQuery.trim())}`,
    );
    const data = await res.json();
    if (data.lat && data.lng) {
      setCenter({ lat: data.lat, lng: data.lng });
      const korean = isKoreanCoord(data.lat, data.lng);
      setIsKorean(korean);
      setKakaoLevel(2);
    }
    setZoomLevel(15);
  }

  function handleMarkerClick(place: ExploreCoursePlace) {
    setSelectedCoursePlaces(undefined);
    setSelectedCourseIdx(0);
    setSelected(place);
    supabase
      .from("course_places")
      .select("*, places(*)")
      .eq("course_id", place.course_places[0].course_id)
      .order("order")
      .then(({ data }) => {
        setSelectedCoursePlaces(data ?? []);
      });
    setShowCourses(false);
  }

  function handleKakaoIdle(map: kakao.maps.Map) {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    setSwLat(sw.getLat());
    setSwLng(sw.getLng());
    setNeLat(ne.getLat());
    setNeLng(ne.getLng());
  }

  return (
    <main className="relative h-dvh overflow-hidden">
      <button
        onClick={() => router.back()}
        className="top-4 left-4 absolute z-50 bg-white rounded-2xl px-4 py-2 shadow text-[16px] font-medium cursor-pointer text-[#EE6300] hover:text-black"
      >
        뒤로 가기
      </button>
      <div className="absolute top-16 left-4 right-4 z-50 flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLocationSearch();
            }}
            placeholder="지역 검색 (예: 홍대입구역, 강남, 성수동)"
            className="border border-gray-200 flex-1 bg-white rounded-2xl px-4 py-2 shadow text-[14px] focus:outline-none"
          />
          <button
            onClick={handleLocationSearch}
            className="bg-[#EE6300] hover:bg-white hover:text-[#EE6300] text-white rounded-2xl px-4 py-2 shadow text-[14px] cursor-pointer whitespace-nowrap"
          >
            검색
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { label: "서울", lat: 37.5665, lng: 126.9780, zoom: 12 },
            { label: "부산", lat: 35.1796, lng: 129.0756, zoom: 12 },
            { label: "제주", lat: 33.4996, lng: 126.5312, zoom: 12 },
            { label: "경주", lat: 35.8562, lng: 129.2247, zoom: 13 },
            { label: "강릉", lat: 37.7519, lng: 128.8760, zoom: 13 },
            { label: "전주", lat: 35.8242, lng: 127.1480, zoom: 13 },
            { label: "🌍 해외", lat: 30, lng: 10, zoom: 3 },
          ].map((region) => (
            <button
              key={region.label}
              onClick={() => {
                setCenter({ lat: region.lat, lng: region.lng });
                setZoomLevel(region.zoom);
                const korean = isKoreanCoord(region.lat, region.lng);
                setIsKorean(korean);
                if (korean) setKakaoLevel(zoomToKakaoLevel(region.zoom));
              }}
              className="shrink-0 bg-white rounded-2xl px-4 py-1.5 shadow text-[13px] font-medium text-gray-700 cursor-pointer hover:bg-[#EE6300] hover:text-white"
            >
              {region.label}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                setCenter({ lat, lng });
                setIsKorean(isKoreanCoord(lat, lng));
                setKakaoLevel(5);
              },
              () => {},
            );
          }}
          className="bg-white rounded-2xl px-3 py-2 shadow text-[14px] font-medium cursor-pointer text-[#EE6300]"
        >
          내 위치
        </button>
        <button
          onClick={() => {
            setShowCourses(!showCourses);
            setSelected(null);
            setSelectedCoursePlaces(undefined);
          }}
          className={`rounded-2xl px-4 py-2 shadow text-[16px] font-medium cursor-pointer ${
            showCourses
              ? "bg-gray-800 text-white hover:bg-[#EE6300]"
              : "bg-[#EE6300] text-white hover:bg-gray-800"
          }`}
        >
          {showCourses ? "목록 닫기" : "코스 목록"}
        </button>
      </div>

      {isKorean && kakaoSdkLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-4 border-[#EE6300] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {showKakao ? (
        <KakaoMap
          center={center}
          isPanto
          level={kakaoLevel}
          style={{ width: "100%", height: "100dvh" }}
          onClick={() => { setSelected(null); setSelectedCoursePlaces(undefined); }}
          onIdle={handleKakaoIdle}
        >
          {selectedCoursePlaces && selectedCoursePlaces.length > 0 && (
            <KakaoPreviewRenderer places={selectedCoursePlaces} />
          )}
          {!selected && (
            <KakaoMarkerRenderer
              places={markerPlaces}
              onMarkerClick={handleMarkerClick}
            />
          )}
        </KakaoMap>
      ) : (!isKorean || kakaoFallbackGoogle) && (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
          <Map
            clickableIcons={false}
            mapId="DEMO_MAP_ID"
            style={{ width: "100%", height: "100dvh" }}
            defaultCenter={{ lat: 37.5, lng: 127 }}
            defaultZoom={12}
            mapTypeControl={false}
            onIdle={(e) => {
              const bounds = e.map.getBounds();
              const ne = bounds?.getNorthEast();
              const sw = bounds?.getSouthWest();
              setNeLat(ne?.lat());
              setNeLng(ne?.lng());
              setSwLat(sw?.lat());
              setSwLng(sw?.lng());
            }}
          >
            <LocationSetter lat={center.lat} lng={center.lng} zoom={zoomLevel} />
            {selectedCoursePlaces && selectedCoursePlaces.length > 0 && (
              <CoursePreviewRenderer places={selectedCoursePlaces} />
            )}
            {!selected && (
              <MarkerRenderer
                places={markerPlaces}
                onMarkerClick={handleMarkerClick}
              />
            )}
          </Map>
        </APIProvider>
      )}

      {selected && (
        <div className="z-50 absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-3 gap-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="font-bold text-[18px] leading-tight">
                {selected.course_places[selectedCourseIdx].courses.title}
              </h2>
              <h3 className="text-[13px] text-gray-400">
                {selected.course_places[selectedCourseIdx].courses.profiles?.username}
              </h3>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setSelectedCoursePlaces(undefined);
              }}
              className="text-[14px] text-gray-400 cursor-pointer hover:text-black shrink-0"
            >
              닫기
            </button>
          </div>

          {selected.course_places.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 -mx-1 px-1">
              {selected.course_places.map((cp, i) => (
                <button
                  key={cp.course_id}
                  onClick={() => {
                    setSelectedCourseIdx(i);
                    setSelectedCoursePlaces(undefined);
                    supabase
                      .from("course_places")
                      .select("*, places(*)")
                      .eq("course_id", cp.course_id)
                      .order("order")
                      .then(({ data }) => setSelectedCoursePlaces(data ?? []));
                  }}
                  className={`shrink-0 rounded-2xl px-3 py-1 text-[12px] font-medium border cursor-pointer ${
                    i === selectedCourseIdx
                      ? "bg-[#EE6300] text-white border-[#EE6300]"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {cp.courses.title}
                </button>
              ))}
            </div>
          )}

          {selectedCoursePlaces === undefined ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-4 border-[#EE6300] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : selectedCoursePlaces.length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              장소를 불러올 수 없어요
            </p>
          ) : (
            <ul className="flex flex-col gap-2 mb-4">
              {selectedCoursePlaces.map((p, i) => (
                <li
                  key={i}
                  className="bg-gray-50 rounded-2xl px-4 py-3 text-[14px]"
                >
                  <span className="text-[#EE6300] font-medium mr-2">
                    {i + 1}.
                  </span>
                  {p.places.name}
                </li>
              ))}
            </ul>
          )}

          <Link
            href={`/courses/${selected.course_places[selectedCourseIdx].course_id}`}
            className="block bg-[#EE6300] text-white text-center rounded-2xl py-3 font-medium"
          >
            자세히 보기
          </Link>
        </div>
      )}

      {showCourses && (
        <div className="z-50 absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-[18px]">이 지역 코스</h2>
            <button
              onClick={() => setShowCourses(false)}
              className="text-[14px] text-gray-400 cursor-pointer hover:text-black"
            >
              닫기
            </button>
          </div>
          {Object.entries(placeGroup).length === 0 ? (
            <p className="text-gray-400 text-center py-4">
              이 지역에 등록된 코스가 없어요
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {Object.entries(placeGroup).slice(0, visibleCourseCount).map(([courseId, places]) => {
                const courseInfo = places[0].course_places.find(
                  (cp) => cp.course_id === courseId,
                );
                return (
                  <li key={courseId}>
                    <Link
                      href={`/courses/${courseId}`}
                      className="group flex items-center justify-between bg-gray-50 rounded-2xl p-4"
                    >
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <div>
                          <span className="text-gray-400 text-[14px] mr-2">
                            {courseInfo?.courses.profiles?.username}
                          </span>
                          <span className="font-medium text-[15px]">
                            {courseInfo?.courses.title}
                          </span>
                        </div>
                        <p className="text-[12px] text-gray-400">
                          {places
                            .slice()
                            .sort((a, b) => {
                              const aOrder =
                                a.course_places.find(
                                  (cp) => cp.course_id === courseId,
                                )?.order ?? 0;
                              const bOrder =
                                b.course_places.find(
                                  (cp) => cp.course_id === courseId,
                                )?.order ?? 0;
                              return aOrder - bOrder;
                            })
                            .map((p) => p.name)
                            .join(" → ")}
                        </p>
                      </div>
                      <span className="text-gray-300 group-hover:text-[#EE6300] shrink-0 ml-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </span>
                    </Link>
                  </li>
                );
              })}
              {Object.entries(placeGroup).length > visibleCourseCount && (
                <li className="flex justify-center pt-1">
                  <button
                    onClick={() => setVisibleCourseCount((c) => c + 10)}
                    className="text-[13px] text-[#EE6300] cursor-pointer hover:underline"
                  >
                    더보기
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
