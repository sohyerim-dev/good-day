"use client";

import { NaverPlace, SavedPlace } from "@/types/place";
import { Fragment, useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
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
  const user = useUserStore((state) => state.user);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const router = useRouter();
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // 코스 제목, 설명, 공개 여부
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  // 네이버 장소 검색 입력값과 결과 목록
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NaverPlace[]>([]);

  // 코스에 추가된 장소 목록 (순서 포함))
  const [selectedPlaces, setSelectedPlaces] = useState<
    (NaverPlace & { order: number })[]
  >([]);

  // 검색 결과 패널 표시 여부 / 코스 장소 목록 섹션 표시 여부
  const [searchActive, setSearchActive] = useState(false);
  const [placeActive, setPlaceActive] = useState(false);

  // 내 저장 장소 바텀시트 표시 여부 / 저장된 장소 목록
  const [showSaved, setShowSaved] = useState(false);
  const [savedPlacesList, setSavedPlacesList] = useState<SavedPlace[]>([]);

  // 토스트 메시지 상태 / 타이머 ref (중복 추가 시 하단에 2초간 표시)
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  }

  // 네이버 장소 검색 API 호출, 결과를 searchResults에 저장
  async function handleSearch() {
    if (!query.trim()) return;
    const res = await fetch(
      `/api/search-places?query=${encodeURIComponent(query.trim())}`,
    );
    const data = await res.json();
    setSearchResults(data.items ?? []);
    setSearchActive(true);
  }

  // 검색 결과에서 장소를 코스에 추가, 첫 추가 시 목록 섹션 표시
  function handleAddPlace(place: NaverPlace) {
    if (selectedPlaces.some((p) => p.id === place.id)) {
      showToast("이미 추가된 장소예요.");
      return;
    }
    setSelectedPlaces((prev) => [
      ...prev,
      { ...place, order: prev.length + 1 },
    ]);
    // 추가 후 검색 결과 닫아서 코스 목록 바로 확인 가능하게 함
    setSearchResults([]);
    setSearchActive(false);
    setQuery("");
    if (placeActive === false) {
      setPlaceActive(true);
    }
  }

  // 장소 삭제 후 order 재정렬, 모두 삭제되면 목록 섹션 숨김
  function handleRemovePlace(index: number) {
    setSelectedPlaces((prev) => {
      const next = prev
        .filter((_, i) => i !== index)
        .map((place, i) => ({ ...place, order: i + 1 }));
      if (next.length === 0) setPlaceActive(false);
      return next;
    });
  }

  // 드래그 완료 시 순서 변경 후 order 재정렬
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

  // 코스 저장 -> places upsert -> courses insert -> course_places insert 순으로 처리
  async function handleSave() {
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR");
    const timeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const courseTitle = title.trim() || `${user?.username || "나"}의 코스 - ${dateStr} ${timeStr}`;
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

  // 저장된 장소를 NaverPlace 형식으로 변환해서 코스에 추가, 중복 방지
  function handleAddFromSaved(place: SavedPlace) {
    if (selectedPlaces.some((p) => p.id === place.id)) return;
    const asNaverPlace: NaverPlace = {
      id: place.id,
      title: place.name,
      address: place.address,
      roadAddress: place.address,
      mapx: String(place.lng * 10000000),
      mapy: String(place.lat * 10000000),
      link: place.naver_url,
      naverPlaceUrl: place.naver_url,
    };
    handleAddPlace(asNaverPlace);
  }

  return (
    <main className="p-4 flex flex-col gap-4 pb-32">
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-[13px] px-5 py-2.5 rounded-2xl shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
      <h1 className="text-[20px] text-center font-bold">코스 추가하기</h1>
      <p className="text-[13px] text-gray-400 text-center -mt-2">
        장소를 검색해서 추가하고, 드래그로 순서를 바꿔보세요.
      </p>

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
          className="bg-[#EE6300] border hover:border-[#EE6300] hover:text-[#EE6300] hover:bg-white rounded-2xl p-4 w-[30%] cursor-pointer text-white"
        >
          검색
        </button>
      </div>
      <button
        onClick={() => {
          supabase
            .from("saved_places")
            .select("*, places(*)")
            .eq("user_id", user?.id)
            .then(({ data }) => {
              setSavedPlacesList(data?.map((d) => d.places) ?? []);
              setShowSaved(true);
            });
        }}
        className="border hover:bg-[#EE6300] hover:text-white border-[#EE6300] text-[#EE6300] rounded-2xl p-3 w-full text-[14px] font-medium cursor-pointer"
      >
        내 저장된 장소에서 추가
      </button>
      <p className="text-[12px] text-gray-400 -mt-2">
        코스 상세에서 저장해둔 장소를 바로 불러올 수 있어요.
      </p>
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
                className="text-[12px] hover:bg-[#EE6300] hover:text-white text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 cursor-pointer shrink-0"
              >
                추가
              </button>
            </li>
          ))
        ) : (
          <li className={searchActive ? "flex flex-col items-center gap-1 py-3" : "hidden"}>
            <span className="text-[14px] text-gray-400">검색 결과가 없어요.</span>
            <span className="text-[12px] text-gray-300">장소명을 더 구체적으로 입력해보세요. (예: 성수 카페 → 성수동 블루보틀)</span>
          </li>
        )}
        <li className={searchActive ? "flex justify-end mt-1" : "hidden"}>
          <button
            onClick={() => setSearchActive(false)}
            className="text-[12px] text-gray-400 hover:text-black"
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
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                      className="mx-auto mb-2"
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
      <p className="text-[12px] text-gray-400 -mt-2">
        공개로 설정하면 코스 탐색에서 다른 사용자에게 보여요.
      </p>
      <button
        onClick={handleSave}
        disabled={!hasHydrated}
        className="bg-[#EE6300] border hover:border-[#EE6300] hover:bg-white hover:text-[#EE6300] mt-2 rounded-2xl p-5 w-full cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        저장
      </button>
      {showSaved && (
        <div className="fixed inset-x-0 top-0 bottom-20 z-9999 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-6 shadow-lg max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[18px]">내 저장 장소</h2>
              <button
                onClick={() => setShowSaved(false)}
                className="text-[14px] text-gray-400 cursor-pointer hover:text-black"
              >
                닫기
              </button>
            </div>
            {savedPlacesList.length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                저장된 장소가 없어요
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {savedPlacesList.map((place) => (
                  <li
                    key={place.id}
                    className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-[14px]">
                        {place.name}
                      </span>
                      <span className="text-[12px] text-gray-400">
                        {place.address}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        handleAddFromSaved(place);
                        setShowSaved(false);
                      }}
                      className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 shrink-0"
                    >
                      추가
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
