"use client";

import { NaverPlace } from "@/types/place";
import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SortablePlaceItem from "@/components/SortablePlaceItem";
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

  async function handleSearch() {
    if (!query.trim()) return;
    const res = await fetch(
      `/api/search-places?query=${encodeURIComponent(query.trim())}`,
    );
    const data = await res.json();
    setSearchResults(data.items ?? []);
  }

  function handleAddPlace(place: NaverPlace) {
    setSelectedPlaces((prev) => [
      ...prev,
      { ...place, order: prev.length + 1 },
    ]);
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
        className="border border-gray-400 rounded-2xl p-5 w-full focus:outline-[#EE6300]"
        onChange={(e) => setTitle(e.target.value)}
      />
      <label htmlFor="course-description" className="font-medium text-[18px]">
        코스 설명
      </label>
      <textarea
        id="course-description"
        placeholder="코스 설명"
        value={description}
        className="border border-gray-400 rounded-2xl p-5 w-full focus:outline-[#EE6300]"
        onChange={(e) => setDescription(e.target.value)}
      />

      {/* 장소 검색 */}
      <label
        htmlFor="place-search"
        className="font-medium text-[18px] focus:outline-[#EE6300]"
      >
        장소 검색
      </label>
      <div className="flex gap-2">
        <input
          id="place-search"
          placeholder="장소 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-400 rounded-2xl p-5 w-[70%] focus:outline-[#EE6300]"
        />
        <button
          onClick={handleSearch}
          className="bg-[#EE6300] rounded-2xl p-5 w-[30%] cursor-pointer text-white "
        >
          검색
        </button>
      </div>

      {/* 검색 결과 */}
      <ul className="border border-gray-700 bg-gray-200 rounded-2xl p-5 w-full">
        {searchResults.map((place: NaverPlace, index: number) => (
          <li key={index} className="p-2">
            <div className="flex items-center pb-2">
              <span className="font-medium mr-2 text-[14px]">
                {place.title}
              </span>
              <button
                onClick={() => handleAddPlace(place)}
                className="bg-gray-800 text-[14px] text-white rounded-xl px-2 py-1 cursor-pointer"
              >
                추가
              </button>
            </div>
            <span className="text-[12px] mr-2">
              {place.roadAddress || place.address}
            </span>

            <div />
          </li>
        ))}
      </ul>

      {/* 추가된 장소 목록 */}
      <h2 className="text-[18px] font-medium">나의 코스</h2>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={selectedPlaces.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="border-2 rounded-2xl p-5 border-[#EE6300]">
            {selectedPlaces.map((place, index) => (
              <SortablePlaceItem
                key={place.id}
                place={place}
                onRemove={() => handleRemovePlace(index)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <label>
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
        />
        공개
      </label>
      <button>저장</button>
    </main>
  );
}
