"use client";

import { NaverPlace, SavedPlace } from "@/types/place";
import { Fragment, use, useEffect, useState } from "react";
import Script from "next/script";
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
import CoursePreviewRenderer from "@/components/CoursePreviewRenderer";
import Image from "next/image";
import { useUserStore } from "@/store/userStore";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Course, CoursePlace } from "@/types/course";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { APIProvider, Map } from "@vis.gl/react-google-maps";

async function fetchCourse(id: string): Promise<Course> {
  const supabase = createClient();
  const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
  if (!data || error) throw new Error("코스를 찾을 수 없어요");
  return data;
}

async function fetchCoursePlaces(id: string): Promise<CoursePlace[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("course_places")
    .select("*, places(id, name, address, lat, lng, naver_url, google_place_id)")
    .eq("course_id", id)
    .order("order");
  if (error) throw new Error("장소 목록을 불러올 수 없어요");
  return data ?? [];
}

async function fetchSavedPlaces(userId: string): Promise<SavedPlace[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("saved_places")
    .select("*, places(*)")
    .eq("user_id", userId);
  return data?.map((d) => d.places) ?? [];
}

export default function EditCourse({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useUserStore((state) => state.user);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const router = useRouter();
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NaverPlace[]>([]);

  const [selectedPlaces, setSelectedPlaces] = useState<
    (NaverPlace & { order: number; _key?: string })[]
  >([]);

  const [searchActive, setSearchActive] = useState(false);
  const [placeActive, setPlaceActive] = useState(false);

  const [showSaved, setShowSaved] = useState(false);
  const [region, setRegion] = useState<"domestic" | "global" | "direct">("domestic");
  const [directName, setDirectName] = useState("");
  const [directAddress, setDirectAddress] = useState("");
  const [directAddressInput, setDirectAddressInput] = useState("");
  const [directLat, setDirectLat] = useState<number | null>(null);
  const [directLng, setDirectLng] = useState<number | null>(null);
  const [directGeoLoading, setDirectGeoLoading] = useState(false);
  const [directRegion, setDirectRegion] = useState<"domestic" | "global">("domestic");
  const [directCategory, setDirectCategory] = useState("");
  const [directDetailAddress, setDirectDetailAddress] = useState("");

  const { data: courseData } = useQuery({
    queryKey: ["course", id],
    queryFn: () => fetchCourse(id),
  });

  const { data: coursePlacesData } = useQuery({
    queryKey: ["coursePlaces", id],
    queryFn: () => fetchCoursePlaces(id),
  });

  const { data: savedPlacesList = [] } = useQuery({
    queryKey: ["savedPlaces", user?.id],
    queryFn: () => fetchSavedPlaces(user!.id),
    enabled: showSaved && !!user?.id,
  });

  useEffect(() => {
    if (!courseData) return;
    setTitle(courseData.title);
    setDescription(courseData.description ?? "");
    setIsPublic(courseData.is_public);
  }, [courseData]);

  useEffect(() => {
    if (!coursePlacesData) return;
    const asNaverPlaces = coursePlacesData.map((cp) => ({
      id: cp.places.id,
      title: cp.places.name,
      address: cp.places.address,
      roadAddress: cp.places.address,
      mapx: String(Math.round(cp.places.lng * 10000000)),
      mapy: String(Math.round(cp.places.lat * 10000000)),
      link: cp.places.naver_url ?? "",
      naverPlaceUrl: cp.places.naver_url ?? "",
      google_place_id: cp.places.google_place_id ?? undefined,
      source: (cp.places.google_place_id ? "google" : "naver") as "naver" | "google",
      order: cp.order,
      _key: `${cp.places.id}-${cp.order}`,
    }));
    setSelectedPlaces(asNaverPlaces);
    if (asNaverPlaces.length > 0) setPlaceActive(true);
  }, [coursePlacesData]);

  async function handleGlobalAddressSearch() {
    if (!directAddressInput.trim()) return;
    setDirectGeoLoading(true);
    setDirectAddress("");
    setDirectLat(null);
    setDirectLng(null);
    const res = await fetch(`/api/geocode?query=${encodeURIComponent(directAddressInput.trim())}`);
    const geo = await res.json();
    if (geo.lat && geo.lng) {
      setDirectAddress(geo.formatted_address ?? directAddressInput.trim());
      setDirectLat(geo.lat);
      setDirectLng(geo.lng);
    } else {
      setDirectAddress("주소를 찾을 수 없어요");
    }
    setDirectGeoLoading(false);
  }

  function openDaumPostcode() {
    new window.daum.Postcode({
      oncomplete: async (data: { roadAddress: string; address: string }) => {
        const addr = data.roadAddress || data.address;
        setDirectAddress(addr);
        setDirectLat(null);
        setDirectLng(null);
        setDirectGeoLoading(true);
        const res = await fetch(`/api/geocode?query=${encodeURIComponent(addr)}`);
        const geo = await res.json();
        if (geo.lat && geo.lng) {
          setDirectLat(geo.lat);
          setDirectLng(geo.lng);
        }
        setDirectGeoLoading(false);
      },
    }).open();
  }

  function handleAddDirectPlace() {
    if (!directName.trim() || !directAddress || directLat === null || directLng === null || !directCategory) return;
    const place: NaverPlace & { order: number; _key?: string } = {
      id: `direct-${Date.now()}`,
      title: directName.trim(),
      address: directAddress,
      roadAddress: directAddress,
      mapx: String(Math.round(directLng * 10000000)),
      mapy: String(Math.round(directLat * 10000000)),
      link: "",
      naverPlaceUrl: "",
      order: selectedPlaces.length + 1,
      _key: `direct-${Date.now()}`,
      category: directCategory,
      ...(directDetailAddress.trim() ? { detail_address: directDetailAddress.trim() } : {}),
    };
    setSelectedPlaces((prev) => [...prev, { ...place, order: prev.length + 1 }]);
    setDirectName("");
    setDirectAddress("");
    setDirectLat(null);
    setDirectLng(null);
    setDirectCategory("");
    setDirectDetailAddress("");
    if (!placeActive) setPlaceActive(true);
  }

  async function handleSearch() {
    if (!query.trim()) return;
    const endpoint = region === "global"
      ? `/api/search-places-global?query=${encodeURIComponent(query.trim())}`
      : `/api/search-places?query=${encodeURIComponent(query.trim())}`;
    const res = await fetch(endpoint);
    const data = await res.json();
    setSearchResults(data.items ?? []);
    setSearchActive(true);
  }

  function handleAddPlace(place: NaverPlace) {
    if (selectedPlaces.at(-1)?.id === place.id) {
      return;
    }
    setSelectedPlaces((prev) => [
      ...prev,
      { ...place, order: prev.length + 1, _key: `${place.id}-${Date.now()}` },
    ]);
    // 추가 후 검색 결과 닫아서 코스 목록 바로 확인 가능하게 함
    setSearchResults([]);
    setSearchActive(false);
    setQuery("");
    if (placeActive === false) {
      setPlaceActive(true);
    }
  }

  function handleRemovePlace(index: number) {
    setSelectedPlaces((prev) => {
      const next = prev
        .filter((_, i) => i !== index)
        .map((place, i) => ({ ...place, order: i + 1 }));
      if (next.length === 0) setPlaceActive(false);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setSelectedPlaces((prev) => {
      const oldIndex = prev.findIndex((p) => (p._key ?? p.id) === active.id);
      const newIndex = prev.findIndex((p) => (p._key ?? p.id) === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((place, i) => ({
        ...place,
        order: i + 1,
      }));
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();

      const now = new Date();
      const dateStr = now.toLocaleDateString("ko-KR");
      const timeStr = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });

      const courseTitle = title.trim() || `${user?.username || "나"}의 코스 - ${dateStr} ${timeStr}`;
      setTitle(courseTitle);

      const directPlaces = selectedPlaces.filter((p) => p.id.startsWith("direct-"));
      const seenNaver = new Set<string>();
      const naverPlaces = selectedPlaces.filter((p) => !p.google_place_id && !p.id.startsWith("direct-")).filter((p) => {
        if (seenNaver.has(p.naverPlaceUrl)) return false;
        seenNaver.add(p.naverPlaceUrl); return true;
      });
      const seenGoogle = new Set<string>();
      const googlePlaces = selectedPlaces.filter((p) => !!p.google_place_id).filter((p) => {
        if (seenGoogle.has(p.google_place_id!)) return false;
        seenGoogle.add(p.google_place_id!); return true;
      });
      const placeIdMap: Record<string, string> = {};

      for (const p of directPlaces) {
        const { data } = await supabase.from("places").insert({
          name: p.title,
          address: p.roadAddress || p.address,
          lat: Number(p.mapy) / 10000000,
          lng: Number(p.mapx) / 10000000,
          category: p.category || null,
          detail_address: p.detail_address || null,
        }).select().single();
        if (data) placeIdMap[p._key ?? p.id] = data.id;
      }

      if (naverPlaces.length > 0) {
        const { data, error } = await supabase
          .from("places")
          .upsert(
            naverPlaces.map((p) => ({
              name: p.title,
              address: p.roadAddress || p.address,
              lat: Number(p.mapy) / 10000000,
              lng: Number(p.mapx) / 10000000,
              naver_url: p.naverPlaceUrl,
            })),
            { onConflict: "naver_url" },
          )
          .select();
        if (error || !data) throw new Error("장소 저장 실패");
        data.forEach((d) => { if (d.naver_url) placeIdMap[d.naver_url] = d.id; });
      }

      if (googlePlaces.length > 0) {
        const { data, error } = await supabase
          .from("places")
          .upsert(
            googlePlaces.map((p) => ({
              name: p.title,
              address: p.roadAddress || p.address,
              lat: Number(p.mapy) / 10000000,
              lng: Number(p.mapx) / 10000000,
              google_place_id: p.google_place_id,
            })),
            { onConflict: "google_place_id" },
          )
          .select();
        if (error || !data) throw new Error("장소 저장 실패");
        data.forEach((d) => { if (d.google_place_id) placeIdMap[d.google_place_id] = d.id; });
      }

      const lats = selectedPlaces.map((p) => Number(p.mapy) / 10000000);
      const lngs = selectedPlaces.map((p) => Number(p.mapx) / 10000000);
      const course_lat = lats.reduce((s, v) => s + v, 0) / lats.length;
      const course_lng = lngs.reduce((s, v) => s + v, 0) / lngs.length;

      const { error: courseError } = await supabase
        .from("courses")
        .update({
          title: courseTitle,
          description,
          is_public: isPublic,
          course_lat,
          course_lng,
        })
        .eq("id", id);

      if (courseError) throw new Error("코스 저장 실패");

      const coursePlacesPayload = selectedPlaces
        .map((p) => ({
          course_id: id,
          place_id: p.id.startsWith("direct-")
            ? placeIdMap[p._key ?? p.id]
            : (placeIdMap[p.google_place_id ?? p.naverPlaceUrl] ?? p.id),
          order: p.order,
        }))
        .filter((cp) => !!cp.place_id);

      if (coursePlacesPayload.length === 0) throw new Error("장소 저장 실패");

      await supabase.from("course_places").delete().eq("course_id", id);
      const { error: insertError } = await supabase.from("course_places").insert(coursePlacesPayload);
      if (insertError) throw new Error("장소 저장 실패");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course", id] });
      queryClient.invalidateQueries({ queryKey: ["coursePlaces", id] });
      router.push(`/courses/${id}`);
    },
  });

  function handleAddFromSaved(place: SavedPlace) {
    if (selectedPlaces.at(-1)?.id === place.id) return;
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
      <Script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js" strategy="afterInteractive" />
      <h1 className="text-[20px] text-center font-bold">코스 수정하기</h1>

      <label htmlFor="course-title" className="font-medium text-[18px]">
        코스 제목
      </label>
      <input
        id="course-title"
        placeholder="코스 제목"
        value={title}
        autoComplete="off"
        className="bg-gray-50 rounded-2xl p-4 w-full focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
        onChange={(e) => setTitle(e.target.value)}
      />
      <label htmlFor="course-description" className="font-medium text-[18px]">
        코스 설명
      </label>
      <textarea
        id="course-description"
        placeholder="코스 설명"
        value={description}
        autoComplete="off"
        className="bg-gray-50 rounded-2xl p-4 w-full focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="place-search" className="font-medium text-[18px]">
          장소 검색
        </label>
        <div className="flex gap-1 mt-1">
          <button
            type="button"
            onClick={() => { setRegion("domestic"); setSearchResults([]); setSearchActive(false); }}
            className={`text-[13px] rounded-xl px-3 py-1 cursor-pointer ${region === "domestic" ? "bg-[#EE6300] text-white" : "bg-gray-100 text-gray-500"}`}
          >
            국내
          </button>
          <button
            type="button"
            onClick={() => { setRegion("global"); setSearchResults([]); setSearchActive(false); }}
            className={`text-[13px] rounded-xl px-3 py-1 cursor-pointer ${region === "global" ? "bg-[#EE6300] text-white" : "bg-gray-100 text-gray-500"}`}
          >
            해외
          </button>
          <button
            type="button"
            onClick={() => { setRegion("direct"); setSearchResults([]); setSearchActive(false); }}
            className={`text-[13px] rounded-xl px-3 py-1 cursor-pointer ${region === "direct" ? "bg-[#EE6300] text-white" : "bg-gray-100 text-gray-500"}`}
          >
            직접 입력
          </button>
        </div>
        <p className="text-[12px] text-gray-300">
          {region === "domestic"
            ? <>결과가 없으면 장소명을 더 구체적으로 입력해보세요.<br />(예: 블루보틀 → 성수동 블루보틀)</>
            : region === "global"
            ? <>현지어나 영어로 검색하면 더 정확해요.<br />(예: Eiffel Tower, 東京タワー)</>
            : <>네이버에 등록되지 않은 장소(집, 개인 장소 등)를 직접 추가할 수 있어요.</>}
        </p>
      </div>
      {region === "direct" ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            <button type="button" onClick={() => { setDirectRegion("domestic"); setDirectAddress(""); setDirectAddressInput(""); setDirectLat(null); setDirectLng(null); }}
              className={`text-[12px] rounded-xl px-3 py-1 cursor-pointer ${directRegion === "domestic" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-500"}`}>국내</button>
            <button type="button" onClick={() => { setDirectRegion("global"); setDirectAddress(""); setDirectAddressInput(""); setDirectLat(null); setDirectLng(null); }}
              className={`text-[12px] rounded-xl px-3 py-1 cursor-pointer ${directRegion === "global" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-500"}`}>해외</button>
          </div>
          <input placeholder="장소 이름" value={directName} onChange={(e) => setDirectName(e.target.value)}
            className="bg-gray-50 rounded-2xl p-4 w-full focus:outline-none focus:ring-2 focus:ring-[#EE6300]" />
          {directRegion === "domestic" ? (
            <div className="flex gap-2">
              <div className="bg-gray-50 rounded-2xl p-4 flex-1 text-[14px] text-gray-500 truncate">
                {directAddress || "주소를 검색해주세요"}
              </div>
              <button type="button" onClick={openDaumPostcode}
                className="bg-[#EE6300] border hover:border-[#EE6300] hover:text-[#EE6300] hover:bg-white rounded-2xl p-4 w-[30%] cursor-pointer text-white text-[14px] whitespace-nowrap">
                {directGeoLoading ? "검색중..." : "주소 검색"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input placeholder="영문 주소 또는 장소명 (예: Eiffel Tower)" value={directAddressInput}
                  onChange={(e) => setDirectAddressInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleGlobalAddressSearch(); }}
                  className="bg-gray-50 rounded-2xl p-4 flex-1 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]" />
                <button type="button" onClick={handleGlobalAddressSearch}
                  className="bg-[#EE6300] border hover:border-[#EE6300] hover:text-[#EE6300] hover:bg-white rounded-2xl p-4 w-[30%] cursor-pointer text-white text-[14px] whitespace-nowrap">
                  {directGeoLoading ? "검색중..." : "주소 확인"}
                </button>
              </div>
              {directAddress && (
                <p className={`text-[12px] px-1 ${directLat ? "text-gray-500" : "text-red-400"}`}>{directAddress}</p>
              )}
            </div>
          )}
          <select value={directCategory} onChange={(e) => setDirectCategory(e.target.value)}
            className="bg-gray-50 rounded-2xl p-4 w-full text-[14px] text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EE6300]">
            <option value="">카테고리 선택</option>
            <option value="개인 장소">🏠 개인 장소</option>
            <option value="카페">☕ 카페</option>
            <option value="음식점">🍽️ 음식점</option>
            <option value="술집">🍸 술집/바</option>
            <option value="쇼핑">🛍️ 쇼핑</option>
            <option value="서점">📚 서점</option>
            <option value="사진">📸 사진/스튜디오</option>
            <option value="문화시설">🎭 문화/예술</option>
            <option value="여행명소">🏛️ 여행 명소</option>
            <option value="숙박">🏨 숙박/호텔</option>
            <option value="교통,운수">🚉 교통</option>
            <option value="교육">🎓 교육</option>
            <option value="스포츠">🏃 스포츠/체육</option>
            <option value="오락시설">🎡 오락</option>
            <option value="생활,편의">🛠️ 생활편의</option>
            <option value="미용">💇 미용</option>
            <option value="병원">🏥 병원</option>
          </select>
          <input
            placeholder="상세 주소 (동/호수 등, 선택사항)"
            value={directDetailAddress}
            onChange={(e) => setDirectDetailAddress(e.target.value)}
            className="bg-gray-50 rounded-2xl p-4 w-full text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
          />
          <button type="button" onClick={handleAddDirectPlace}
            disabled={!directName.trim() || !directAddress || directLat === null || !directCategory || directGeoLoading}
            className="bg-[#EE6300] text-white rounded-2xl p-4 w-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
            장소 추가
          </button>
        </div>
      ) : (
      <div className="flex gap-2">
        <input
          id="place-search"
          placeholder="장소 검색"
          value={query}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-gray-50 rounded-2xl p-4 w-[70%] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
        />
        <button
          onClick={handleSearch}
          className="bg-[#EE6300] border hover:border-[#EE6300] hover:text-[#EE6300] hover:bg-white rounded-2xl p-4 w-[30%] cursor-pointer text-white"
        >
          검색
        </button>
      </div>
      )}
      <button
        onClick={() => setShowSaved(true)}
        className="border hover:bg-[#EE6300] hover:text-white border-[#EE6300] text-[#EE6300] rounded-2xl p-3 w-full text-[14px] font-medium cursor-pointer"
      >
        내 저장된 장소에서 추가
      </button>
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
          <li className={searchActive ? "text-[14px] text-gray-400 text-center py-2" : "hidden"}>
            검색 결과가 없어요.
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

      <div className={placeActive ? "flex flex-col gap-0.5" : "hidden"}>
        <div className="flex items-center">
          <h2 className="text-[18px] font-medium">나의 코스</h2>
          <Image src="/icons/sparkles.svg" width={20} height={20} alt="" className="ml-2" />
        </div>
        <p className="text-[12px] text-gray-400">왼쪽 아이콘을 길게 누르면 순서를 바꿀 수 있어요.</p>
      </div>
      {selectedPlaces.length >= 2 && (
        <div className="rounded-2xl overflow-hidden h-64">
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            <Map
              key={selectedPlaces.length}
              mapId="DEMO_MAP_ID"
              style={{ width: "100%", height: "100%" }}
              defaultCenter={{
                lat: selectedPlaces.reduce((s, p) => s + Number(p.mapy) / 10000000, 0) / selectedPlaces.length,
                lng: selectedPlaces.reduce((s, p) => s + Number(p.mapx) / 10000000, 0) / selectedPlaces.length,
              }}
              defaultZoom={13}
              mapTypeControl={false}
              clickableIcons={false}
            >
              <CoursePreviewRenderer
                places={selectedPlaces.map((p) => ({
                  order: p.order,
                  places: {
                    name: p.title,
                    lat: Number(p.mapy) / 10000000,
                    lng: Number(p.mapx) / 10000000,
                  },
                }))}
              />
            </Map>
          </APIProvider>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={selectedPlaces.map((p) => p._key ?? p.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            className={
              placeActive ? "border-2 rounded-2xl p-5 border-[#EE6300]" : ""
            }
          >
            {selectedPlaces.map((place, index) => (
              <Fragment key={place._key ?? place.id}>
                <SortablePlaceItem
                  key={place._key ?? place.id}
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
        {isPublic && selectedPlaces.some((p) => !p.google_place_id && !p.naverPlaceUrl) && (
          <p className="text-[12px] text-amber-500 mt-1 w-full">개인 장소가 포함된 코스를 공개하면 해당 장소의 주소가 다른 사람에게 노출될 수 있어요.</p>
        )}
      </label>
      <button
        onClick={() => saveMutation.mutate()}
        disabled={!hasHydrated || selectedPlaces.length < 2 || saveMutation.isPending}
        className="bg-[#EE6300] border hover:border-[#EE6300] hover:bg-white hover:text-[#EE6300] mt-2 rounded-2xl p-5 w-full cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saveMutation.isPending ? "저장 중..." : "저장"}
      </button>
      {selectedPlaces.length < 2 && (
        <p className="text-[12px] text-gray-400 text-center -mt-2">
          장소를 2개 이상 추가해야 코스를 저장할 수 있어요.
        </p>
      )}

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
