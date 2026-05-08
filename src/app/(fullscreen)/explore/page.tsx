"use client";
import MarkerRenderer from "@/components/MarkerRenderer";
import { createClient } from "@/lib/supabase/client";
import { ExploreCoursePlace } from "@/types/place";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
import { useEffect, useState } from "react";

export default function Explore() {
  // defaultCenter는 한번 지정하면 계속 유지되기 때문에 지도 위치가 바뀔 때마다 state를 업데이트하는 방법
  const [center, setCenter] = useState({ lat: 37.5, lng: 127 });

  const supabase = createClient();
  const [neLat, setNeLat] = useState<number>();
  const [neLng, setNeLng] = useState<number>();
  const [swLat, setSwLat] = useState<number>();
  const [swLng, setSwLng] = useState<number>();

  const [explorePlaces, setExplorePlaces] = useState<ExploreCoursePlace[]>([]);
  const [selected, setSelected] = useState<ExploreCoursePlace | null>(null);

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
  }, [swLat, neLat, swLng, neLng]);

  return (
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
        <MarkerRenderer places={explorePlaces} onMarkerClick={setSelected} />
      </Map>
    </APIProvider>
  );
}
