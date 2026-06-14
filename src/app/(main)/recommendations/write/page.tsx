"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import TiptapEditor from "@/components/TiptapEditor";
import { NaverPlace } from "@/types/place";

interface PlaceEntry {
  name: string;
  naver_url: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id: string;
  category?: string;
}

const EMPTY_PLACE: PlaceEntry = { name: "", naver_url: "", address: "", lat: 0, lng: 0, google_place_id: "" };

function WritePage() {
  const user = useUserStore((state) => state.user);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<"place" | "course">("place");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<{ file?: File; previewUrl: string; storedUrl?: string }[]>([]);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const [places, setPlaces] = useState<PlaceEntry[]>([EMPTY_PLACE]);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<NaverPlace[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!user || user.role !== "admin") router.replace("/");
  }, [hasHydrated, user]);

  useEffect(() => {
    if (!editId) return;
    supabase
      .from("posts")
      .select("*, post_images(id, url, order), post_places(id, name, naver_url, address, order, category)")
      .eq("id", editId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setTitle(data.title);
        setCategory(data.category);
        setContent(data.content);
        if (data.category === "course" && data.linked_course_id) {
          supabase.from("courses").select("title, description").eq("id", data.linked_course_id).single()
            .then(({ data: course }) => {
              if (course) { setCourseTitle(course.title ?? ""); setCourseDescription(course.description ?? ""); }
            });
        }
        const sortedImages = (data.post_images ?? []).sort((a: { order: number }, b: { order: number }) => a.order - b.order);
        setImages(sortedImages.map((img: { url: string }) => ({ previewUrl: img.url, storedUrl: img.url })));
        if (data.thumbnail_url) {
          const thumbIdx = sortedImages.findIndex((img: { url: string }) => img.url === data.thumbnail_url);
          if (thumbIdx >= 0) setThumbnailIndex(thumbIdx);
        }
        const sortedPlaces = (data.post_places ?? []).sort((a: { order: number }, b: { order: number }) => a.order - b.order);
        if (sortedPlaces.length > 0) {
          const naverUrls = sortedPlaces
            .map((p: { naver_url: string | null }) => p.naver_url)
            .filter(Boolean) as string[];
          if (naverUrls.length > 0) {
            supabase.from("places").select("naver_url, lat, lng, google_place_id")
              .in("naver_url", naverUrls)
              .then(({ data: placesData }) => {
                const latLngMap = Object.fromEntries(
                  (placesData ?? []).map((p) => [p.naver_url, { lat: p.lat ?? 0, lng: p.lng ?? 0, google_place_id: p.google_place_id ?? "" }])
                );
                setPlaces(sortedPlaces.map((p: { name: string; naver_url: string | null; address: string | null }) => ({
                  ...EMPTY_PLACE,
                  name: p.name,
                  naver_url: p.naver_url ?? "",
                  address: p.address ?? "",
                  lat: p.naver_url ? (latLngMap[p.naver_url]?.lat ?? 0) : 0,
                  lng: p.naver_url ? (latLngMap[p.naver_url]?.lng ?? 0) : 0,
                  google_place_id: p.naver_url ? (latLngMap[p.naver_url]?.google_place_id ?? "") : "",
                })));
              });
          } else {
            setPlaces(sortedPlaces.map((p: { name: string; naver_url: string | null; address: string | null }) => ({
              ...EMPTY_PLACE, name: p.name, naver_url: p.naver_url ?? "", address: p.address ?? "",
            })));
          }
        }
      });
  }, [editId]);

  async function handleImageAdd(files: FileList | null) {
    if (!files) return;
    setImages((prev) => [...prev, ...Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))]);
  }

  async function handlePlaceSearch() {
    if (!placeQuery.trim()) return;
    const res = await fetch(`/api/search-places?query=${encodeURIComponent(placeQuery.trim())}`);
    const data = await res.json();
    setPlaceResults(data.items ?? []);
  }

  function handleAddFromSearch(place: NaverPlace) {
    setPlaces((prev) => [...prev, {
      name: place.title,
      naver_url: place.naverPlaceUrl,
      address: place.roadAddress || place.address,
      lat: Number(place.mapy) / 10000000,
      lng: Number(place.mapx) / 10000000,
      google_place_id: place.google_place_id ?? "",
      category: place.category,
    }]);
    setPlaceResults([]);
    setPlaceQuery("");
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of images) {
      if (img.storedUrl) { urls.push(img.storedUrl); continue; }
      if (!img.file) continue;
      const ext = img.file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, img.file);
      if (error) { alert(`이미지 업로드 실패: ${error.message}`); setIsSubmitting(false); return urls; }
      const { data: publicData } = supabase.storage.from("post-images").getPublicUrl(path);
      urls.push(publicData.publicUrl);
    }
    return urls;
  }

  async function upsertCoursePlaces(validPlaces: PlaceEntry[]): Promise<Record<string, string>> {
    const placeIdMap: Record<string, string> = {};
    const naverPlaces = validPlaces.filter((p) => !p.google_place_id && p.naver_url);
    const googlePlaces = validPlaces.filter((p) => !!p.google_place_id);

    if (naverPlaces.length > 0) {
      const seen = new Set<string>();
      const unique = naverPlaces.filter((p) => { if (seen.has(p.naver_url)) return false; seen.add(p.naver_url); return true; });
      const { data } = await supabase.from("places").upsert(
        unique.map((p) => ({ name: p.name, address: p.address, lat: p.lat, lng: p.lng, naver_url: p.naver_url })),
        { onConflict: "naver_url" }
      ).select();
      data?.forEach((d) => { if (d.naver_url) placeIdMap[d.naver_url] = d.id; });
    }
    if (googlePlaces.length > 0) {
      const seen = new Set<string>();
      const unique = googlePlaces.filter((p) => { if (seen.has(p.google_place_id)) return false; seen.add(p.google_place_id); return true; });
      const { data } = await supabase.from("places").upsert(
        unique.map((p) => ({ name: p.name, address: p.address, lat: p.lat, lng: p.lng, google_place_id: p.google_place_id })),
        { onConflict: "google_place_id" }
      ).select();
      data?.forEach((d) => { if (d.google_place_id) placeIdMap[d.google_place_id] = d.id; });
    }
    return placeIdMap;
  }

  async function createOrUpdateCourse(validPlaces: PlaceEntry[], existingCourseId?: string): Promise<string | null> {
    const placeIdMap = await upsertCoursePlaces(validPlaces);
    const lats = validPlaces.filter((p) => p.lat).map((p) => p.lat);
    const lngs = validPlaces.filter((p) => p.lng).map((p) => p.lng);
    const course_lat = lats.length > 0 ? lats.reduce((s, v) => s + v, 0) / lats.length : 0;
    const course_lng = lngs.length > 0 ? lngs.reduce((s, v) => s + v, 0) / lngs.length : 0;

    let courseId = existingCourseId;
    const cTitle = courseTitle.trim() || title.trim();
    const cDesc = courseDescription.trim() || null;
    if (courseId) {
      await supabase.from("courses").update({ title: cTitle, description: cDesc, course_lat, course_lng }).eq("id", courseId);
      await supabase.from("course_places").delete().eq("course_id", courseId);
    } else {
      const { data, error } = await supabase.from("courses").insert({
        user_id: user!.id, title: cTitle, description: cDesc, is_public: true, is_hidden: false, course_lat, course_lng,
      }).select("id").single();
      if (error) { alert(`코스 생성 실패: ${error.message}`); return null; }
      if (!data) return null;
      courseId = data.id;
    }

    const coursePlaces = validPlaces
      .map((p, i) => ({ course_id: courseId!, place_id: placeIdMap[p.google_place_id || p.naver_url], order: i + 1 }))
      .filter((cp) => cp.place_id);
    if (coursePlaces.length > 0) {
      await supabase.from("course_places").insert(coursePlaces);
    }
    return courseId ?? null;
  }

  async function handleSubmit() {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {

    const imageUrls = await uploadImages();
    const thumbnailUrl = imageUrls.length > 0 ? imageUrls[Math.min(thumbnailIndex, imageUrls.length - 1)] : null;
    const validPlaces = places.filter((p) => p.name.trim());

    // 장소 글이면 places 테이블에 upsert (저장하기 기능에서 올바른 좌표로 조회 가능하도록)
    if (category === "place" && validPlaces.length > 0) {
      await upsertCoursePlaces(validPlaces);
    }

    // 코스 글이면 코스 자동 생성/업데이트
    let linkedCourseId: string | null = null;
    if (category === "course" && validPlaces.length > 0) {
      if (editId) {
        const { data: existingPost } = await supabase.from("posts").select("linked_course_id").eq("id", editId).single();
        linkedCourseId = await createOrUpdateCourse(validPlaces, existingPost?.linked_course_id ?? undefined);
      } else {
        linkedCourseId = await createOrUpdateCourse(validPlaces);
      }
    }

    if (editId) {
      await supabase.from("posts").update({
        title: title.trim(), content, category,
        linked_course_id: linkedCourseId,
        thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString(),
      }).eq("id", editId);
      await supabase.from("post_images").delete().eq("post_id", editId);
      await supabase.from("post_places").delete().eq("post_id", editId);
      if (imageUrls.length > 0) {
        await supabase.from("post_images").insert(imageUrls.map((url, i) => ({ post_id: editId, url, order: i })));
      }
      if (validPlaces.length > 0) {
        await supabase.from("post_places").insert(
          validPlaces.map((p, i) => ({ post_id: editId, name: p.name, naver_url: p.naver_url || null, address: p.address || null, order: i + 1, category: p.category || null }))
        );
      }
      router.push(`/recommendations/${editId}`);
    } else {
      const { data: postData } = await supabase.from("posts").insert({
        title: title.trim(), content, category, linked_course_id: linkedCourseId, thumbnail_url: thumbnailUrl,
      }).select("id").single();
      if (!postData) { setIsSubmitting(false); return; }
      if (imageUrls.length > 0) {
        await supabase.from("post_images").insert(imageUrls.map((url, i) => ({ post_id: postData.id, url, order: i })));
      }
      if (validPlaces.length > 0) {
        await supabase.from("post_places").insert(
          validPlaces.map((p, i) => ({ post_id: postData.id, name: p.name, naver_url: p.naver_url || null, address: p.address || null, order: i + 1, category: p.category || null }))
        );
      }
      router.push(`/recommendations/${postData.id}`);
    }
    } catch (e) {
      alert(`저장 중 오류가 발생했어요: ${e}`);
      setIsSubmitting(false);
    }
  }

  if (!hasHydrated) return null;
  if (!user || user.role !== "admin") return null;

  return (
    <main className="p-4 flex flex-col gap-5 pb-32">
      <h1 className="text-[20px] font-bold text-center">
        {editId ? "추천 글 수정" : "추천 글 작성"}
      </h1>

      {/* 제목 */}
      <div className="flex flex-col gap-1">
        <label className="font-medium text-[15px]">제목</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="글 제목을 입력하세요"
          className="bg-gray-50 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
        />
      </div>

      {/* 카테고리 */}
      <div className="flex flex-col gap-1">
        <label className="font-medium text-[15px]">카테고리</label>
        <div className="flex gap-2">
          {(["place", "course"] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-5 py-2 rounded-2xl text-[14px] font-medium cursor-pointer ${
                category === cat ? "bg-[#EE6300] text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {cat === "place" ? "장소 추천" : "코스 추천"}
            </button>
          ))}
        </div>
      </div>

      {/* 코스 전용: 코스 제목·설명 */}
      {category === "course" && (
        <>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-[15px]">코스 제목 <span className="text-gray-400 font-normal text-[12px]">(비우면 글 제목 사용)</span></label>
            <input
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              placeholder="코스 제목"
              className="bg-gray-50 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-medium text-[15px]">코스 설명 <span className="text-gray-400 font-normal text-[12px]">(선택)</span></label>
            <textarea
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              placeholder="코스 설명"
              rows={3}
              className="bg-gray-50 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-[#EE6300] resize-none"
            />
          </div>
        </>
      )}

      {/* 이미지 */}
      <div className="flex flex-col gap-2">
        <label className="font-medium text-[15px]">이미지</label>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20">
              <img
                src={img.previewUrl}
                alt=""
                onClick={() => setThumbnailIndex(i)}
                className={`w-full h-full object-cover rounded-xl cursor-pointer ${thumbnailIndex === i ? "ring-2 ring-[#EE6300]" : ""}`}
              />
              {thumbnailIndex === i && (
                <span className="absolute bottom-1 left-1 bg-[#EE6300] text-white text-[9px] rounded px-1 py-0.5 leading-none">대표</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setImages((prev) => prev.filter((_, j) => j !== i));
                  setThumbnailIndex((prev) => prev > i ? prev - 1 : Math.min(prev, images.length - 2));
                }}
                className="absolute -top-1 -right-1 bg-gray-700 text-white rounded-full w-5 h-5 text-[11px] flex items-center justify-center cursor-pointer"
              >×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-2xl cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300]"
          >+</button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageAdd(e.target.files)} />
      </div>

      {/* 본문 에디터 */}
      <div className="flex flex-col gap-1">
        <label className="font-medium text-[15px]">본문</label>
        <TiptapEditor content={content} onChange={setContent} />
      </div>

      {/* 장소 목록 */}
      <div className="flex flex-col gap-2">
        <label className="font-medium text-[15px]">
          {category === "place" ? "장소 (1개)" : "코스 장소 (순서대로)"}
        </label>
        {category === "course" && (
          <p className="text-[12px] text-gray-400 -mt-1">장소를 검색해서 추가하면 코스가 자동으로 생성돼요.</p>
        )}
        <ul className="flex flex-col gap-2">
          {places.map((place, i) => (
            <li key={i} className="flex gap-2 items-start">
              <div className="flex-1 flex flex-col gap-1">
                <input
                  value={place.name}
                  onChange={(e) => setPlaces((prev) => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                  placeholder="장소명"
                  className="bg-gray-50 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
                />
                <input
                  value={place.address}
                  onChange={(e) => setPlaces((prev) => prev.map((p, j) => j === i ? { ...p, address: e.target.value } : p))}
                  placeholder="주소"
                  className="bg-gray-50 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
                />
                <input
                  value={place.naver_url}
                  onChange={(e) => setPlaces((prev) => prev.map((p, j) => j === i ? { ...p, naver_url: e.target.value } : p))}
                  placeholder="네이버 플레이스 URL"
                  className="bg-gray-50 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
                />
              </div>
              {places.length > 1 && (
                <button
                  type="button"
                  onClick={() => setPlaces((prev) => prev.filter((_, j) => j !== i))}
                  className="mt-2 text-gray-400 hover:text-red-400 text-[18px] cursor-pointer"
                >×</button>
              )}
            </li>
          ))}
        </ul>

        {/* 장소 검색 */}
        <div className="flex gap-2">
          <input
            value={placeQuery}
            onChange={(e) => setPlaceQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handlePlaceSearch(); }}
            placeholder="장소 검색해서 추가"
            className="flex-1 bg-gray-50 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
          />
          <button
            type="button"
            onClick={handlePlaceSearch}
            className="text-[13px] bg-gray-200 text-gray-600 rounded-xl px-3 py-2 cursor-pointer hover:bg-[#EE6300] hover:text-white"
          >검색</button>
        </div>
        {placeResults.length > 0 && (
          <ul className="bg-gray-50 rounded-2xl p-3 flex flex-col gap-1">
            {placeResults.slice(0, 5).map((place, i) => (
              <li key={i} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-[13px] font-medium">{place.title}</p>
                  <p className="text-[11px] text-gray-400">{place.roadAddress || place.address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddFromSearch(place)}
                  className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-0.5 cursor-pointer"
                >추가</button>
              </li>
            ))}
            <button type="button" onClick={() => setPlaceResults([])} className="text-[12px] text-gray-400 text-right mt-1 cursor-pointer">닫기</button>
          </ul>
        )}
        <button
          type="button"
          onClick={() => setPlaces((prev) => [...prev, { ...EMPTY_PLACE }])}
          className="text-[13px] text-[#EE6300] border border-[#EE6300] rounded-xl py-2 cursor-pointer hover:bg-[#EE6300] hover:text-white"
        >+ 장소 직접 추가</button>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!title.trim() || isSubmitting}
        className="bg-[#EE6300] text-white rounded-2xl py-5 font-semibold text-[15px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d45700]"
      >
        {isSubmitting ? "저장 중..." : editId ? "수정 완료" : "글 발행"}
      </button>
    </main>
  );
}

export default function Write() {
  return <Suspense><WritePage /></Suspense>;
}
