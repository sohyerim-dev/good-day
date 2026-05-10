"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { SavedPlace } from "@/types/place";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();
  const user = useUserStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("saved_places")
      .select("*, places(*)")
      .eq("user_id", user?.id)
      .then(({ data, error }) => {
        if (error) setError("장소를 불러올 수 없어요");
        setPlaces(data?.map((d) => d.places) ?? []);
        setLoading(false);
      });
  }, [user?.id]);

  async function handleDeletePlace(placeId: string) {
    if (!confirm("저장을 취소할까요?")) return;
    await supabase
      .from("saved_places")
      .delete()
      .eq("user_id", user?.id)
      .eq("place_id", placeId);
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
  }

  return (
    <main className="flex flex-col min-h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-[22px] font-bold">저장된 장소</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-[14px] hover:text-black"
        >
          뒤로 가기
        </button>
      </div>

      {/* 목록 */}
      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))
        ) : error ? (
          <p className="text-gray-400 text-center py-10">{error}</p>
        ) : places.length === 0 ? (
          <p className="text-gray-400 text-center py-10">
            저장된 장소가 없어요
          </p>
        ) : (
          places.map((place) => (
            <div
              key={place.id}
              className="flex items-center justify-between bg-gray-50 rounded-2xl p-4"
            >
              <div className="flex flex-col gap-1">
                <p className="font-medium">{place.name}</p>
                <p className="text-[12px] text-gray-400">{place.address}</p>
                <a
                  href={place.naver_url}
                  target="_blank"
                  className="text-[12px] text-[#EE6300]"
                >
                  네이버 플레이스
                </a>
              </div>
              <button
                onClick={() => handleDeletePlace(place.id)}
                className="text-[12px] text-red-400 border border-red-300 rounded-xl px-2 py-1 shrink-0 ml-3"
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
