"use client";
import MarkerRenderer from "@/components/MarkerRenderer";
import { createClient } from "@/lib/supabase/client";
import { ExploreCoursePlace } from "@/types/place";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Explore() {
  // defaultCenter는 한번 지정하면 계속 유지되기 때문에 지도 위치가 바뀔 때마다 state를 업데이트하는 방법
  const [center, setCenter] = useState({ lat: 37.5, lng: 127 });

  const router = useRouter();
  const supabase = createClient();
  const [neLat, setNeLat] = useState<number>();
  const [neLng, setNeLng] = useState<number>();
  const [swLat, setSwLat] = useState<number>();
  const [swLng, setSwLng] = useState<number>();

  const [explorePlaces, setExplorePlaces] = useState<ExploreCoursePlace[]>([]);
  const [exploreAllPlaces, setExploreAllPlaces] = useState<
    ExploreCoursePlace[]
  >([]);
  const placeGroup = exploreAllPlaces.reduce(
    (acc, p) => {
      const courseId = p.course_places[0].course_id;
      if (!acc[courseId]) acc[courseId] = [];
      acc[courseId].push(p);
      return acc;
    },
    {} as Record<string, ExploreCoursePlace[]>,
  );
  const [selected, setSelected] = useState<ExploreCoursePlace | null>(null);
  const [selectedCoursePlaces, setSelectedCoursePlaces] =
    useState<{ order: number; places: { name: string } }[]>();
  const [showCourses, setShowCourses] = useState(false);

  useEffect(() => {
    // 현재 위치 기반 좌표를 center에 저장
    navigator.geolocation.getCurrentPosition((position) => {
      setCenter({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    });
  }, []);
  useEffect(() => {
    if (!neLat || !neLng || !swLat || !swLng) return;
    supabase
      .from("places")
      .select("*, course_places!inner(*, courses(*))")
      .gte("lat", swLat)
      .lte("lat", neLat)
      .gte("lng", swLng)
      .lte("lng", neLng)
      .then(({ data }) => {
        const filtered = data?.filter((p) =>
          p.course_places.some((cp: { order: number }) => cp.order === 1),
        );
        // console.log(filtered);
        setExplorePlaces(filtered ?? []);
      });
    supabase
      .from("places")
      .select("*, course_places!inner(*, courses(*))")
      .gte("lat", swLat)
      .lte("lat", neLat)
      .gte("lng", swLng)
      .lte("lng", neLng)
      .then(({ data }) => {
        setExploreAllPlaces(data ?? []);
      });
  }, [swLat, neLat, swLng, neLng]);

  return (
    <main className="relative h-screen overflow-hidden max-h-svh">
      <button
        onClick={() => router.back()}
        className="top-4 left-4 absolute z-50 bg-white rounded-2xl px-4 py-2 shadow text-[16px] font-medium cursor-pointer text-[#EE6300] hover:text-black"
      >
        뒤로 가기
      </button>
      <button
        onClick={() => {
          setShowCourses(!showCourses);
          setSelected(null);
        }}
        className={`absolute top-4 right-4 z-50 rounded-2xl px-4 py-2 shadow text-[16px] font-medium cursor-pointer ${
          showCourses ? "bg-gray-800 text-white" : "bg-[#EE6300] text-white"
        }`}
      >
        {showCourses ? "목록 닫기" : "목록 보기"}
      </button>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
        <Map
          mapId="DEMO_MAP_ID"
          style={{ width: "100%", height: "100vh" }}
          // 첫 페이지 화면 - 현재 위치 기반으로 지도 보여주기
          defaultCenter={center}
          defaultZoom={12}
          mapTypeControl={false}
          onIdle={(e) => {
            const bounds = e.map.getBounds();
            // console.log("bounds", bounds);
            const ne = bounds?.getNorthEast(); // 북동
            const sw = bounds?.getSouthWest(); // 남서
            // console.log(ne?.lat(), ne?.lng(), sw?.lat(), sw?.lng());
            setNeLat(ne?.lat());
            setNeLng(ne?.lng());
            setSwLat(sw?.lat());
            setSwLng(sw?.lng());
          }}
        >
          <MarkerRenderer
            places={explorePlaces}
            onMarkerClick={(place) => {
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
        </Map>
      </APIProvider>
      {selected && (
        <div className="z-50 absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 shadow-lg max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-[18px]">
              {selected.course_places[0].courses.title}
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="text-[14px] text-gray-400"
            >
              닫기
            </button>
          </div>
          <ul className="flex flex-col gap-2 mb-4">
            {selectedCoursePlaces?.map((p, i) => (
              <li key={i} className="bg-gray-50 rounded-2xl px-4 py-3 text-[14px]">
                <span className="text-[#EE6300] font-medium mr-2">{i + 1}.</span>
                {p.places.name}
              </li>
            ))}
          </ul>
          <Link
            href={`/courses/${selected.course_places[0].course_id}`}
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
              className="text-[14px] text-gray-400"
            >
              닫기
            </button>
          </div>
          <ul className="flex flex-col gap-3">
            {Object.entries(placeGroup).map(([courseId, places], i) => (
              <li key={courseId}>
                <Link href={`/courses/${courseId}`} className="block bg-gray-50 rounded-2xl p-4">
                  <p className="font-medium text-[15px] mb-1">
                    {i + 1}. {places[0].course_places[0].courses.title}
                  </p>
                  <p className="text-[12px] text-gray-400">
                    {places.map((p) => p.name).join(" → ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
