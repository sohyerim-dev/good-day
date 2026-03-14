"use client";

import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useNaverMap } from "@/hooks/useNaverMap";

interface Place {
  id: string;
  name: string;
  address: string;
  category: string | null;
  lat: number;
  lng: number;
}

export default function PlaceDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const { id } = useParams();
  const placeId = id as string;
  const { isLoaded } = useNaverMap();
  const mapRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [saved, setSaved] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);

      const { data: placeData } = await supabase
        .from("places")
        .select("id, name, address, category, lat, lng")
        .eq("id", placeId)
        .single();

      if (placeData) setPlace(placeData as Place);

      if (user) {
        const { data: saveData } = await supabase
          .from("place_saves")
          .select("id")
          .eq("place_id", placeId)
          .eq("user_id", user.id)
          .single();

        setSaved(!!saveData);
      }
    }

    fetchData();
  }, [placeId, supabase]);

  // 네이버 지도 초기화
  useEffect(() => {
    if (!isLoaded || !place || !mapRef.current) return;

    const map = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(place.lat, place.lng),
      zoom: 16,
    });

    new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(place.lat, place.lng),
      map,
    });
  }, [isLoaded, place]);

  async function handleSave() {
    if (!userId) return;

    if (saved) {
      await supabase
        .from("place_saves")
        .delete()
        .eq("place_id", placeId)
        .eq("user_id", userId);
    } else {
      await supabase
        .from("place_saves")
        .insert({ place_id: placeId, user_id: userId });
    }
    setSaved(!saved);
  }

  if (!place) return null;

  return (
    <div className="min-h-svh bg-white">
      {/* 상단바 */}
      <header className="fixed top-0 left-0 right-0 bg-white z-10 border-b border-gray-100">
        <div className="flex justify-between items-center h-14 px-4">
          <button onClick={() => router.back()} aria-label="뒤로가기">
            <Image src="/icons/arrow-left.svg" alt="" width={24} height={24} />
          </button>
          <div className="flex items-center gap-1">
            <Image src="/icons/place.svg" alt="" width={14} height={20.5} />
            <span className="text-[16px] font-semibold">{place.name}</span>
          </div>
          <button
            onClick={handleSave}
            aria-label="북마크"
            className="cursor-pointer"
          >
            <Image
              src={saved ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"}
              alt=""
              width={22}
              height={22}
            />
          </button>
        </div>
      </header>

      <main className="pt-14">
        {/* 네이버 지도 */}
        <div ref={mapRef} className="w-full h-80 bg-gray-200" />

        {/* 장소 정보 */}
        <div className="px-4 py-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Image src="/icons/pin.svg" alt="" width={14} height={20.5} />
            <span className="text-[14px]">{place.address}</span>
          </div>
          <a
            href={`https://map.naver.com/p/search/${encodeURIComponent(`${place.category} ${place.name}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[14px] underline font-bold"
          >
            <Image src="/icons/link.svg" alt="" width={14} height={14} />
            네이버 플레이스
          </a>
        </div>
      </main>
    </div>
  );
}
