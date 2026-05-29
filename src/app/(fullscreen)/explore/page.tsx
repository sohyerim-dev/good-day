"use client";
import CoursePreviewRenderer from "@/components/CoursePreviewRenderer";
import LocationSetter from "@/components/LocationSetter";
import MarkerRenderer from "@/components/MarkerRenderer";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { ExploreCoursePlace } from "@/types/place";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Explore() {
  // 현재 위치를 가져와서 LocationSetter를 통해 지도를 이동시킴
  const [center, setCenter] = useState({ lat: 37.5, lng: 127 });

  const router = useRouter();
  const supabase = createClient();
  const user = useUserStore((state) => state.user);
  const [neLat, setNeLat] = useState<number>();
  const [neLng, setNeLng] = useState<number>();
  const [swLat, setSwLat] = useState<number>();
  const [swLng, setSwLng] = useState<number>();

  const [explorePlaces, setExplorePlaces] = useState<ExploreCoursePlace[]>([]);
  const [exploreAllPlaces, setExploreAllPlaces] = useState<
    ExploreCoursePlace[]
  >([]);
  // 마커가 찍힌 코스(첫 번째 장소가 뷰포트 내에 있는 코스)의 ID 집합
  const markerCourseIds = new Set(
    explorePlaces.flatMap((p) =>
      p.course_places
        .filter((cp: { order: number }) => cp.order === 1)
        .map((cp: { course_id: string }) => cp.course_id),
    ),
  );

  // 마커가 있는 코스만 그룹화 (첫 번째 장소가 뷰포트 밖인 코스는 목록에서 제외)
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
    // 현재 위치 기반 좌표를 center에 저장
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {},
    );
  }, []);
  useEffect(() => {
    // 지도 영역(bounds)이 설정된 후에만 조회
    if (!neLat || !neLng || !swLat || !swLng) return;

    // 공개 코스 또는 본인 코스만 표시 + 장소 2개 이상 + 숨김 처리된 코스 제외
    const isVisible = (cp: { courses: { is_public: boolean; is_hidden: boolean; user_id: string; course_places?: { count: number }[] } }) =>
      !cp.courses.is_hidden &&
      (cp.courses.is_public || cp.courses.user_id === user?.id) &&
      (cp.courses.course_places?.[0]?.count ?? 0) >= 2;

    // 마커용: 현재 지도 영역 내에서 코스의 첫 번째 장소(order=1)만 가져옴
    // 코스 시작점에만 마커를 표시해 지도가 복잡해지지 않게 함
    supabase
      .from("places")
      .select("*, course_places!inner(*, courses!inner(*, profiles(username), course_places(count)))")
      .gte("lat", swLat)
      .lte("lat", neLat)
      .gte("lng", swLng)
      .lte("lng", neLng)
      .then(({ data }) => {
        const filtered = data?.filter((p) =>
          p.course_places.some((cp: { order: number; courses: { is_public: boolean; is_hidden: boolean; user_id: string; course_places?: { count: number }[] } }) =>
            cp.order === 1 && isVisible(cp)
          ),
        );
        setExplorePlaces(filtered ?? []);
      });

    // 목록용: 현재 지도 영역 내 모든 장소를 가져와서 코스 단위로 그룹화에 사용
    supabase
      .from("places")
      .select("*, course_places!inner(*, courses!inner(*, profiles(username), course_places(count)))")
      .gte("lat", swLat)
      .lte("lat", neLat)
      .gte("lng", swLng)
      .lte("lng", neLng)
      .then(({ data }) => {
        // 비공개 코스 장소 및 장소 1개 코스는 제외 (본인 코스는 유지)
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
    if (data.lat && data.lng) setCenter({ lat: data.lat, lng: data.lng });
    setZoomLevel(15);
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
              onClick={() => { setCenter({ lat: region.lat, lng: region.lng }); setZoomLevel(region.zoom); }}
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
                setCenter({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                });
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
          {showCourses ? "목록 닫기" : "목록 보기"}
        </button>
      </div>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          clickableIcons={false}
          mapId="DEMO_MAP_ID"
          style={{ width: "100%", height: "100dvh" }}
          // 첫 페이지 화면 - 현재 위치 기반으로 지도 보여주기
          defaultCenter={{ lat: 37.5, lng: 127 }}
          defaultZoom={12}
          mapTypeControl={false}
          onIdle={(e) => {
            const bounds = e.map.getBounds();
            const ne = bounds?.getNorthEast(); // 북동
            const sw = bounds?.getSouthWest(); // 남서
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
              places={explorePlaces}
              onMarkerClick={(place) => {
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
              }}
            />
          )}
        </Map>
      </APIProvider>
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

          {/* 코스 탭 (여러 코스에 포함된 경우) */}
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
                // 현재 courseId에 해당하는 course_places 항목을 찾아서 코스 정보(제목, 작성자) 추출
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
                            // 현재 코스의 order 기준으로 정렬 (course_places[0]이 다른 코스 항목일 수 있으므로 find 사용)
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
