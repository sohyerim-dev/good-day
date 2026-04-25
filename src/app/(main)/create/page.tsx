"use client";

import { NaverPlace } from "@/types/place";
import { Fragment, useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SortablePlaceItem from "@/components/SortablePlaceItem";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export default function Create() {
  // 코스 정보
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // 장소 검색
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NaverPlace[]>([]);

  // 추가된 장소 목록
  const [selectedPlaces, setSelectedPlaces] = useState<
    (NaverPlace & { order: number })[]
  >([]);

  const [searchActive, setSearchActive] = useState(false);
  const [placeActive, setPlaceActive] = useState(false);

  const user = useUserStore((state) => state.user);
  const router = useRouter();

  const supabase = createClient();

  async function handleSearch() {
    if (!query.trim()) return;
    const res = await fetch(
      `/api/search-places?query=${encodeURIComponent(query.trim())}`,
    );
    const data = await res.json();
    setSearchResults(data.items ?? []);
    setSearchActive(true);
  }

  function handleAddPlace(place: NaverPlace) {
    setSelectedPlaces((prev) => [
      ...prev,
      { ...place, order: prev.length + 1 },
    ]);
    if (placeActive === false) {
      setPlaceActive(true);
    }
  }

  function handleRemovePlace(index: number) {
    setSelectedPlaces((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((place, i) => ({ ...place, order: i + 1 })),
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSelectedPlaces((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id);
      const newIndex = prev.findIndex((p) => p.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((place, i) => ({
        ...place,
        order: i + 1,
      }));
    });
  }

  async function handleSave() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR");
    const timeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const courseTitle = title.trim() || `나의 코스 - ${dateStr} ${timeStr}`;
    setTitle(courseTitle);

    if (selectedPlaces.length === 0) return;

    // places 테이블에 upsert
    const { data: placesData, error: placesError } = await supabase
      .from("places")
      .upsert(
        selectedPlaces.map((p) => ({
          name: p.title,
          address: p.roadAddress || p.address,
          lat: Number(p.mapy) / 10000000,
          lng: Number(p.mapx) / 10000000,
          naver_url: p.naverPlaceUrl,
        })),
        { onConflict: "naver_url" },
      )
      .select();

    if (placesError || !placesData) return;

    // 중심 좌표 계산
    const course_lat =
      placesData.reduce((sum, p) => sum + p.lat, 0) / placesData.length;
    const course_lng =
      placesData.reduce((sum, p) => sum + p.lng, 0) / placesData.length;

    // courses 테이블에 insert
    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .insert({
        user_id: user!.id,
        title: courseTitle,
        description,
        is_public: isPublic,
        course_lat,
        course_lng,
      })
      .select()
      .single();

    if (courseError || !courseData) return;

    // course_places 테이블에 insert
    await supabase.from("course_places").insert(
      placesData.map((place, i) => ({
        course_id: courseData.id,
        place_id: place.id,
        order: selectedPlaces[i].order,
      })),
    );

    router.push("/");
  }

  return (
    <main className="p-4 flex flex-col gap-4">
      <h1 className="text-[20px] text-center font-bold">코스 추가하기</h1>

      {/* 코스 정보 */}
      <label htmlFor="course-title" className="font-medium text-[18px]">
        코스 제목
      </label>
      <input
        id="course-title"
        placeholder="코스 제목"
        value={title}
        className="bg-gray-50 rounded-2xl p-4 w-full focus:outline-[#EE6300]"
        onChange={(e) => setTitle(e.target.value)}
      />
      <label htmlFor="course-description" className="font-medium text-[18px]">
        코스 설명
      </label>
      <textarea
        id="course-description"
        placeholder="코스 설명"
        value={description}
        className="bg-gray-50 rounded-2xl p-4 w-full focus:outline-[#EE6300]"
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* 장소 검색 */}
      <label htmlFor="place-search" className="font-medium text-[18px]">
        장소 검색
      </label>
      <div className="flex gap-2">
        <input
          id="place-search"
          placeholder="장소 검색"
          value={query}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-gray-50 rounded-2xl p-4 w-[70%] focus:outline-[#EE6300]"
        />
        <button
          onClick={handleSearch}
          className="bg-[#EE6300] rounded-2xl p-4 w-[30%] cursor-pointer text-white"
        >
          검색
        </button>
      </div>

      {/* 검색 결과 */}
      <ul className={searchActive ? "bg-gray-50 rounded-2xl p-4 w-full" : ""}>
        {searchResults.length !== 0 ? (
          searchResults.map((place: NaverPlace, index: number) => (
            <li
              key={index}
              className={
                searchActive
                  ? "flex items-center justify-between bg-white rounded-2xl p-3 mb-2"
                  : "hidden"
              }
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-[14px]">{place.title}</span>
                <span className="text-[12px] text-gray-400">
                  {place.roadAddress || place.address}
                </span>
              </div>
              <button
                onClick={() => handleAddPlace(place)}
                className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 cursor-pointer shrink-0"
              >
                추가
              </button>
            </li>
          ))
        ) : (
          <li
            className={
              searchActive
                ? "text-[14px] text-gray-400 text-center py-2"
                : "hidden"
            }
          >
            검색 결과가 없습니다.
          </li>
        )}
        <li className={searchActive ? "flex justify-end mt-1" : "hidden"}>
          <button
            onClick={() => setSearchActive(false)}
            className="text-[12px] text-gray-400"
          >
            닫기
          </button>
        </li>
      </ul>

      {/* 추가된 장소 목록 */}
      <div className="flex">
        <h2 className={placeActive ? "text-[18px] font-medium" : "hidden"}>
          나의 코스
        </h2>
        <Image
          src="/icons/sparkles.svg"
          width={20}
          height={20}
          alt=""
          className={placeActive ? "ml-2" : "hidden"}
        />
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={selectedPlaces.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            className={
              placeActive ? "border-2 rounded-2xl p-5 border-[#EE6300]" : ""
            }
          >
            {selectedPlaces.map((place, index) => (
              <Fragment key={place.id}>
                <SortablePlaceItem
                  key={place.id}
                  place={place}
                  onRemove={() => handleRemovePlace(index)}
                />
                {index !== selectedPlaces.length - 1 && (
                  <li>
                    <Image
                      src="/icons/arrow-big-down.svg"
                      alt=""
                      width={20}
                      height={20}
                      className="ml-25 mb-2"
                    />
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <label className="flex items-center gap-2 cursor-pointer">
        <span className="font-medium">코스 공개</span>
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`relative w-12 h-6 rounded-full transition-colors ${isPublic ? "bg-[#EE6300]" : "bg-gray-300"}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? "translate-x-7" : "translate-x-1"}`}
          />
        </div>
      </label>
      <button
        onClick={handleSave}
        className="bg-[#EE6300] mt-2 rounded-2xl p-5 w-full cursor-pointer text-white"
      >
        저장
      </button>
    </main>
  );
}
