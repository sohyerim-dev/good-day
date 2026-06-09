"use client";

import { NaverPlace, PlaceCollection, SavedPlace } from "@/types/place";
import { Fragment, Suspense, useState, useRef, useEffect } from "react";
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
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { APIProvider, Map } from "@vis.gl/react-google-maps";
function CreatePage() {
  const user = useUserStore((state) => state.user);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
  );

  // 코스 제목, 설명, 공개 여부
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  // 네이버 장소 검색 입력값과 결과 목록
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NaverPlace[]>([]);

  // 코스에 추가된 장소 목록 (순서 포함))
  const [selectedPlaces, setSelectedPlaces] = useState<
    (NaverPlace & { order: number; _key?: string })[]
  >([]);

  // 검색 결과 패널 표시 여부 / 코스 장소 목록 섹션 표시 여부
  const [searchActive, setSearchActive] = useState(false);
  const [placeActive, setPlaceActive] = useState(false);

  // 내 저장 장소 바텀시트 표시 여부 / 저장된 장소 목록
  const [showSaved, setShowSaved] = useState(false);
  const [savedPlacesList, setSavedPlacesList] = useState<SavedPlace[]>([]);
  const [savedPlacesHasMore, setSavedPlacesHasMore] = useState(false);
  const [collections, setCollections] = useState<PlaceCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  const [savingPlace, setSavingPlace] = useState<NaverPlace | null>(null);
  const SAVED_PAGE_SIZE = 10;
  // 이미 저장된 장소 키(naver_url 또는 google_place_id) 목록 - 검색 결과에서 저장 여부 표시용
  const [savedPlaceKeys, setSavedPlaceKeys] = useState<Set<string>>(new Set());
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

  const [isSaving, setIsSaving] = useState(false);

  // 북마크 코스 바텀시트
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarkedCourses, setBookmarkedCourses] = useState<{ id: string; title: string }[]>([]);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [coursePlacesCache, setCoursePlacesCache] = useState<Record<string, NaverPlace[]>>({});

  // 토스트 메시지 상태 / 타이머 ref (중복 추가 시 하단에 2초간 표시)
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  }

  // 북마크 코스에서 복사 시 장소 자동 로드 (?from=COURSE_ID)
  useEffect(() => {
    const fromCourseId = searchParams.get("from");
    if (!fromCourseId) return;
    supabase
      .from("course_places")
      .select("*, places(*)")
      .eq("course_id", fromCourseId)
      .order("order")
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        const places = data.map((cp) => ({
          id: cp.places.id,
          title: cp.places.name,
          address: cp.places.address,
          roadAddress: cp.places.address,
          mapx: String(cp.places.lng * 10000000),
          mapy: String(cp.places.lat * 10000000),
          link: cp.places.naver_url ?? "",
          naverPlaceUrl: cp.places.naver_url ?? "",
          order: cp.order,
        }));
        setSelectedPlaces(places);
        setPlaceActive(true);
      });
  }, []);

  // 마운트 시 저장된 장소 키 + 컬렉션 로드
  useEffect(() => {
    if (!user) return;
    supabase.from("saved_places").select("places(naver_url, google_place_id)").eq("user_id", user.id)
      .then(({ data }) => {
        const keys = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?.forEach((d: any) => {
          const p = Array.isArray(d.places) ? d.places[0] : d.places;
          if (p?.naver_url) keys.add(p.naver_url);
          if (p?.google_place_id) keys.add(p.google_place_id);
        });
        setSavedPlaceKeys(keys);
      });
    supabase.from("collections").select("*").eq("user_id", user.id).order("created_at")
      .then(({ data }) => setCollections(data ?? []));
  }, [user]);

  function loadSavedPlaces(collection: string | null, offset: number) {
    let q = supabase
      .from("saved_places")
      .select("*, places(*)")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + SAVED_PAGE_SIZE - 1);
    if (collection === "__none__") q = q.is("collection_id", null);
    else if (collection !== null) q = (q as typeof q).eq("collection_id", collection);
    q.then(({ data }) => {
      const items = data?.map((d) => ({ ...d.places, collection_id: d.collection_id })) ?? [];
      if (offset === 0) setSavedPlacesList(items);
      else setSavedPlacesList((prev) => [...prev, ...items]);
      setSavedPlacesHasMore(items.length === SAVED_PAGE_SIZE);
    });
  }

  async function handleSavePlace(place: NaverPlace, collectionId: string | null = null) {
    if (!user) return;
    const isGlobal = !!place.google_place_id;
    const key = isGlobal ? place.google_place_id! : place.naverPlaceUrl;
    if (savedPlaceKeys.has(key)) return;
    const placeData = {
      name: place.title,
      address: place.roadAddress || place.address,
      lat: parseInt(place.mapy) / 10000000,
      lng: parseInt(place.mapx) / 10000000,
      naver_url: isGlobal ? null : place.naverPlaceUrl,
      google_place_id: isGlobal ? place.google_place_id : null,
    };
    const matchCol = isGlobal ? "google_place_id" : "naver_url";
    const matchVal = isGlobal ? place.google_place_id : place.naverPlaceUrl;
    const { data: existing } = await supabase
      .from("places")
      .select("id")
      .eq(matchCol, matchVal)
      .single();
    let placeId = existing?.id;
    if (!placeId) {
      const { data: inserted } = await supabase
        .from("places")
        .insert(placeData)
        .select("id")
        .single();
      if (!inserted) return;
      placeId = inserted.id;
    }
    await supabase.from("saved_places").insert(
      { user_id: user.id, place_id: placeId, collection_id: collectionId },
    );
    setSavedPlaceKeys((prev) => new Set(prev).add(key));
    setSavingPlace(null);
    showToast("장소를 저장했어요.");
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
    if (!directName.trim() || !directAddress || directLat === null || directLng === null) return;
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
      ...(directCategory ? { category: directCategory } : {}),
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

  // 검색 결과에서 장소를 코스에 추가, 첫 추가 시 목록 섹션 표시
  function handleAddPlace(place: NaverPlace) {
    if (selectedPlaces.at(-1)?.id === place.id) {
      showToast("같은 장소를 연속으로 추가할 수 없어요.");
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
      const oldIndex = prev.findIndex((p) => (p._key ?? p.id) === active.id);
      const newIndex = prev.findIndex((p) => (p._key ?? p.id) === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((place, i) => ({
        ...place,
        order: i + 1,
      }));
    });
  }

  // 코스 저장 -> places upsert -> courses insert -> course_places insert 순으로 처리
  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    const now = new Date();
    const dateStr = now.toLocaleDateString("ko-KR");
    const timeStr = now.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const courseTitle =
      title.trim() ||
      `${user?.username || "나"}의 코스 - ${dateStr} ${timeStr}`;
    setTitle(courseTitle);

    if (selectedPlaces.length < 2) return;

    const directPlaces = selectedPlaces.filter((p) => p.id.startsWith("direct-"));
    const seen = new Set<string>();
    const naverPlaces = selectedPlaces.filter((p) => !p.google_place_id && !p.id.startsWith("direct-")).filter((p) => {
      if (seen.has(p.naverPlaceUrl)) return false;
      seen.add(p.naverPlaceUrl); return true;
    });
    const seenG = new Set<string>();
    const googlePlaces = selectedPlaces.filter((p) => !!p.google_place_id).filter((p) => {
      if (seenG.has(p.google_place_id!)) return false;
      seenG.add(p.google_place_id!); return true;
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
            ...(p.category ? { category: p.category } : {}),
          })),
          { onConflict: "naver_url" },
        )
        .select();
      if (error || !data) return;
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
      if (error || !data) return;
      data.forEach((d) => { if (d.google_place_id) placeIdMap[d.google_place_id] = d.id; });
    }

    // 중심 좌표 계산
    const lats = selectedPlaces.map((p) => Number(p.mapy) / 10000000);
    const lngs = selectedPlaces.map((p) => Number(p.mapx) / 10000000);
    const course_lat = lats.reduce((s, v) => s + v, 0) / lats.length;
    const course_lng = lngs.reduce((s, v) => s + v, 0) / lngs.length;

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
      selectedPlaces.map((p) => ({
        course_id: courseData.id,
        place_id: p.id.startsWith("direct-")
          ? placeIdMap[p._key ?? p.id]
          : placeIdMap[p.google_place_id ?? p.naverPlaceUrl],
        order: p.order,
      })),
    );

    router.push("/");
  }

  // 저장된 장소를 NaverPlace 형식으로 변환해서 코스에 추가, 중복 방지
  async function handleOpenBookmarks() {
    const { data } = await supabase
      .from("bookmarks")
      .select("courses(id, title)")
      .eq("user_id", user!.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setBookmarkedCourses((data ?? []).map((d: any) => d.courses).filter(Boolean));
    setShowBookmarks(true);
  }

  async function handleExpandCourse(courseId: string) {
    if (expandedCourseId === courseId) { setExpandedCourseId(null); return; }
    if (coursePlacesCache[courseId]) { setExpandedCourseId(courseId); return; }
    const { data } = await supabase
      .from("course_places")
      .select("*, places(*)")
      .eq("course_id", courseId)
      .order("order");
    const places: NaverPlace[] = (data ?? []).map((cp) => ({
      id: cp.places.id,
      title: cp.places.name,
      address: cp.places.address,
      roadAddress: cp.places.address,
      mapx: String(cp.places.lng * 10000000),
      mapy: String(cp.places.lat * 10000000),
      link: cp.places.naver_url ?? "",
      naverPlaceUrl: cp.places.naver_url ?? "",
    }));
    setCoursePlacesCache((prev) => ({ ...prev, [courseId]: places }));
    setExpandedCourseId(courseId);
  }

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

      {/* 장소 검색 */}
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
            ? <>원하는 결과가 없으면 장소명을 더 구체적으로 입력해보세요.<br />(예: 블루보틀 → 성수동 블루보틀)</>
            : region === "global"
            ? <>현지어나 영어로 검색하면 더 정확해요.<br />(예: Eiffel Tower, 東京タワー)</>
            : <>네이버에 등록되지 않은 장소(집, 개인 장소 등)를 직접 추가할 수 있어요.</>}
        </p>
      </div>
      {region === "direct" ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { setDirectRegion("domestic"); setDirectAddress(""); setDirectAddressInput(""); setDirectLat(null); setDirectLng(null); }}
              className={`text-[12px] rounded-xl px-3 py-1 cursor-pointer ${directRegion === "domestic" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-500"}`}
            >
              국내
            </button>
            <button
              type="button"
              onClick={() => { setDirectRegion("global"); setDirectAddress(""); setDirectAddressInput(""); setDirectLat(null); setDirectLng(null); }}
              className={`text-[12px] rounded-xl px-3 py-1 cursor-pointer ${directRegion === "global" ? "bg-gray-600 text-white" : "bg-gray-100 text-gray-500"}`}
            >
              해외
            </button>
          </div>
          <input
            placeholder="장소 이름"
            value={directName}
            onChange={(e) => setDirectName(e.target.value)}
            className="bg-gray-50 rounded-2xl p-4 w-full focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
          />
          {directRegion === "domestic" ? (
            <div className="flex gap-2">
              <div className="bg-gray-50 rounded-2xl p-4 flex-1 text-[14px] text-gray-500 truncate">
                {directAddress || "주소를 검색해주세요"}
              </div>
              <button
                type="button"
                onClick={openDaumPostcode}
                className="bg-[#EE6300] border hover:border-[#EE6300] hover:text-[#EE6300] hover:bg-white rounded-2xl p-4 w-[30%] cursor-pointer text-white text-[14px] whitespace-nowrap"
              >
                {directGeoLoading ? "검색중..." : "주소 검색"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="flex gap-2">
                <input
                  placeholder="영문 주소 또는 장소명 (예: Eiffel Tower)"
                  value={directAddressInput}
                  onChange={(e) => setDirectAddressInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleGlobalAddressSearch(); }}
                  className="bg-gray-50 rounded-2xl p-4 flex-1 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
                />
                <button
                  type="button"
                  onClick={handleGlobalAddressSearch}
                  className="bg-[#EE6300] border hover:border-[#EE6300] hover:text-[#EE6300] hover:bg-white rounded-2xl p-4 w-[30%] cursor-pointer text-white text-[14px] whitespace-nowrap"
                >
                  {directGeoLoading ? "검색중..." : "주소 확인"}
                </button>
              </div>
              {directAddress && (
                <p className={`text-[12px] px-1 ${directLat ? "text-gray-500" : "text-red-400"}`}>
                  {directAddress}
                </p>
              )}
            </div>
          )}
          <select
            value={directCategory}
            onChange={(e) => setDirectCategory(e.target.value)}
            className="bg-gray-50 rounded-2xl p-4 w-full text-[14px] text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
          >
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
          <button
            type="button"
            onClick={handleAddDirectPlace}
            disabled={!directName.trim() || !directAddress || directLat === null || !directCategory || directGeoLoading}
            className="bg-[#EE6300] text-white rounded-2xl p-4 w-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
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
        onClick={() => {
          setActiveCollection(null);
          loadSavedPlaces(null, 0);
          setShowSaved(true);
        }}
        className="border hover:bg-[#EE6300] hover:text-white border-[#EE6300] text-[#EE6300] rounded-2xl p-3 w-full text-[14px] font-medium cursor-pointer"
      >
        내 저장된 장소에서 추가
      </button>
      <button
        onClick={handleOpenBookmarks}
        className="border hover:bg-[#EE6300] hover:text-white border-[#EE6300] text-[#EE6300] rounded-2xl p-3 w-full text-[14px] font-medium cursor-pointer"
      >
        북마크한 코스에서 추가
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
              <div className="flex gap-1.5 shrink-0">
                {(() => {
                  const isGlobal = !!place.google_place_id;
                  const key = isGlobal ? place.google_place_id! : place.naverPlaceUrl;
                  const isSaved = savedPlaceKeys.has(key);
                  return (
                    <button
                      onClick={() => {
                        if (isSaved) return;
                        if (collections.length > 0) setSavingPlace(place);
                        else handleSavePlace(place, null);
                      }}
                      disabled={isSaved}
                      className={`text-[12px] rounded-xl px-2 py-1 shrink-0 ${
                        isSaved
                          ? "text-gray-400 border border-gray-200 cursor-default"
                          : "text-gray-500 border border-gray-300 hover:border-[#EE6300] hover:text-[#EE6300] cursor-pointer"
                      }`}
                    >
                      {isSaved ? "저장됨" : "저장"}
                    </button>
                  );
                })()}
                <button
                  onClick={() => handleAddPlace(place)}
                  className="text-[12px] hover:bg-[#EE6300] hover:text-white text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 cursor-pointer shrink-0"
                >
                  추가
                </button>
              </div>
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

      {/* 추가된 장소 목록 */}
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
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
      <p className="text-[12px] text-gray-400 -mt-2">
        ✨ 다른 사람들에게도 도움이 될 수 있어요.<br />공개 코스로 등록해보세요.
      </p>
      <button
        onClick={handleSave}
        disabled={!hasHydrated || selectedPlaces.length < 2 || isSaving}
        className="bg-[#EE6300] border hover:border-[#EE6300] hover:bg-white hover:text-[#EE6300] mt-2 rounded-2xl p-5 w-full cursor-pointer text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? "저장 중..." : "저장"}
      </button>
      {selectedPlaces.length < 2 && (
        <p className="text-[12px] text-gray-400 text-center -mt-2">
          장소를 2개 이상 추가해야 코스를 저장할 수 있어요.
        </p>
      )}
      {showSaved && (
        <div className="fixed inset-x-0 top-0 bottom-20 z-9999 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-6 shadow-lg max-h-[60vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-[18px]">내 저장 장소</h2>
              <button
                onClick={() => setShowSaved(false)}
                className="text-[14px] text-gray-400 cursor-pointer hover:text-black"
              >
                닫기
              </button>
            </div>
            {/* 폴더 탭 */}
            {collections.length > 0 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 -mx-1 px-1">
                <button
                  onClick={() => { setActiveCollection(null); loadSavedPlaces(null, 0); }}
                  className={`shrink-0 rounded-2xl px-3 py-1 text-[12px] font-medium border cursor-pointer ${activeCollection === null ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200"}`}
                >
                  전체
                </button>
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => { setActiveCollection(col.id); loadSavedPlaces(col.id, 0); }}
                    className={`shrink-0 rounded-2xl px-3 py-1 text-[12px] font-medium border cursor-pointer ${activeCollection === col.id ? "bg-[#EE6300] text-white border-[#EE6300]" : "bg-white text-gray-500 border-gray-200"}`}
                  >
                    {col.name}
                  </button>
                ))}
              </div>
            )}
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
                {savedPlacesHasMore && (
                  <li className="flex justify-center pt-1">
                    <button
                      onClick={() => loadSavedPlaces(activeCollection, savedPlacesList.length)}
                      className="text-[13px] text-[#EE6300] cursor-pointer hover:underline"
                    >
                      더보기
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 폴더 선택 바텀시트 (저장 시) */}
      {savingPlace && (
        <div className="fixed inset-0 z-9999 flex items-end justify-center bg-black/30">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-[16px]">어느 폴더에 저장할까요?</h2>
              <button onClick={() => setSavingPlace(null)} className="text-gray-400 cursor-pointer hover:text-black text-[14px]">취소</button>
            </div>
            <button
              onClick={() => handleSavePlace(savingPlace, null)}
              className="text-left px-4 py-3 rounded-2xl text-[14px] bg-gray-50 text-gray-700 cursor-pointer hover:bg-[#EE6300]/10 hover:text-[#EE6300]"
            >
              미분류
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => handleSavePlace(savingPlace, col.id)}
                className="text-left px-4 py-3 rounded-2xl text-[14px] bg-gray-50 text-gray-700 cursor-pointer hover:bg-[#EE6300]/10 hover:text-[#EE6300]"
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>
      )}
      {showBookmarks && (
        <div className="fixed inset-x-0 top-0 bottom-20 z-9999 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-6 shadow-lg max-h-[70vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[18px]">북마크한 코스</h2>
              <button
                onClick={() => { setShowBookmarks(false); setExpandedCourseId(null); }}
                className="text-[14px] text-gray-400 cursor-pointer hover:text-black"
              >
                닫기
              </button>
            </div>
            {bookmarkedCourses.length === 0 ? (
              <p className="text-gray-400 text-center py-4">북마크한 코스가 없어요</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {bookmarkedCourses.map((course) => (
                  <li key={course.id} className="bg-gray-50 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="font-medium text-[14px] flex-1 min-w-0 truncate mr-2">{course.title}</span>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleExpandCourse(course.id)}
                          className="text-[12px] text-gray-500 border border-gray-300 rounded-xl px-2 py-1 cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300]"
                        >
                          {expandedCourseId === course.id ? "▲" : "▼"}
                        </button>
                        <button
                          onClick={async () => {
                            let places = coursePlacesCache[course.id];
                            if (!places) {
                              const { data } = await supabase
                                .from("course_places").select("*, places(*)").eq("course_id", course.id).order("order");
                              places = (data ?? []).map((cp) => ({
                                id: cp.places.id, title: cp.places.name,
                                address: cp.places.address, roadAddress: cp.places.address,
                                mapx: String(cp.places.lng * 10000000), mapy: String(cp.places.lat * 10000000),
                                link: cp.places.naver_url ?? "", naverPlaceUrl: cp.places.naver_url ?? "",
                              }));
                              setCoursePlacesCache((prev) => ({ ...prev, [course.id]: places! }));
                            }
                            setSelectedPlaces((prev) => {
                              const existingIds = new Set(prev.map((p) => p.id));
                              const toAdd = places!.filter((p) => !existingIds.has(p.id));
                              if (toAdd.length === 0) { showToast("이미 모두 추가된 장소예요."); return prev; }
                              return [...prev, ...toAdd.map((p, i) => ({ ...p, order: prev.length + i + 1 }))];
                            });
                            setPlaceActive(true);
                          }}
                          className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 cursor-pointer hover:bg-[#EE6300] hover:text-white"
                        >
                          전체 추가
                        </button>
                      </div>
                    </div>
                    {expandedCourseId === course.id && coursePlacesCache[course.id] && (
                      <ul className="border-t border-gray-100 px-4 pb-3 flex flex-col gap-1.5 pt-2">
                        {coursePlacesCache[course.id].map((place) => (
                          <li key={place.id} className="flex items-center justify-between">
                            <span className="text-[13px] text-gray-600 flex-1 min-w-0 truncate mr-2">{place.title}</span>
                            <button
                              onClick={() => handleAddPlace(place)}
                              className="text-[11px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-0.5 cursor-pointer hover:bg-[#EE6300] hover:text-white shrink-0"
                            >
                              추가
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
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

export default function Create() {
  return <Suspense><CreatePage /></Suspense>;
}
