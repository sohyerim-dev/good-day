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
}

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
  const [content, setContent] = useState("");
  const [linkedCourseId, setLinkedCourseId] = useState("");
  const [images, setImages] = useState<{ file?: File; previewUrl: string; storedUrl?: string }[]>([]);
  const [places, setPlaces] = useState<PlaceEntry[]>([{ name: "", naver_url: "", address: "" }]);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<NaverPlace[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 관리자 체크
  useEffect(() => {
    if (!hasHydrated) return;
    if (!user || user.role !== "admin") {
      router.replace("/");
    }
  }, [hasHydrated, user]);

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (!editId) return;
    supabase
      .from("posts")
      .select("*, post_images(id, url, order), post_places(id, name, naver_url, order)")
      .eq("id", editId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setTitle(data.title);
        setCategory(data.category);
        setContent(data.content);
        setLinkedCourseId(data.linked_course_id ?? "");
        const sortedImages = (data.post_images ?? []).sort((a: { order: number }, b: { order: number }) => a.order - b.order);
        setImages(sortedImages.map((img: { url: string }) => ({ previewUrl: img.url, storedUrl: img.url })));
        const sortedPlaces = (data.post_places ?? []).sort((a: { order: number }, b: { order: number }) => a.order - b.order);
        if (sortedPlaces.length > 0) {
          setPlaces(sortedPlaces.map((p: { name: string; naver_url: string | null; address: string | null }) => ({ name: p.name, naver_url: p.naver_url ?? "", address: p.address ?? "" })));
        }
      });
  }, [editId]);

  async function handleImageAdd(files: FileList | null) {
    if (!files) return;
    const newImages = Array.from(files).map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }

  async function handlePlaceSearch() {
    if (!placeQuery.trim()) return;
    const res = await fetch(`/api/search-places?query=${encodeURIComponent(placeQuery.trim())}`);
    const data = await res.json();
    setPlaceResults(data.items ?? []);
  }

  function handleAddFromSearch(place: NaverPlace) {
    setPlaces((prev) => [...prev, { name: place.title, naver_url: place.naverPlaceUrl, address: place.roadAddress || place.address }]);
    setPlaceResults([]);
    setPlaceQuery("");
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (const img of images) {
      if (img.storedUrl) {
        urls.push(img.storedUrl);
        continue;
      }
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

  async function handleSubmit() {
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const imageUrls = await uploadImages();

    if (editId) {
      // 수정
      await supabase.from("posts").update({
        title: title.trim(),
        content,
        category,
        linked_course_id: linkedCourseId.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq("id", editId);

      await supabase.from("post_images").delete().eq("post_id", editId);
      await supabase.from("post_places").delete().eq("post_id", editId);

      if (imageUrls.length > 0) {
        await supabase.from("post_images").insert(
          imageUrls.map((url, i) => ({ post_id: editId, url, order: i }))
        );
      }
      const validPlaces = places.filter((p) => p.name.trim());
      if (validPlaces.length > 0) {
        await supabase.from("post_places").insert(
          validPlaces.map((p, i) => ({ post_id: editId, name: p.name, naver_url: p.naver_url || null, address: p.address || null, order: i + 1 }))
        );
      }
      router.push(`/recommendations/${editId}`);
    } else {
      // 신규 작성
      const { data: postData } = await supabase
        .from("posts")
        .insert({
          title: title.trim(),
          content,
          category,
          linked_course_id: linkedCourseId.trim() || null,
        })
        .select("id")
        .single();

      if (!postData) { setIsSubmitting(false); return; }

      if (imageUrls.length > 0) {
        await supabase.from("post_images").insert(
          imageUrls.map((url, i) => ({ post_id: postData.id, url, order: i }))
        );
      }
      const validPlaces = places.filter((p) => p.name.trim());
      if (validPlaces.length > 0) {
        await supabase.from("post_places").insert(
          validPlaces.map((p, i) => ({ post_id: postData.id, name: p.name, naver_url: p.naver_url || null, address: p.address || null, order: i + 1 }))
        );
      }
      router.push(`/recommendations/${postData.id}`);
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

      {/* 이미지 */}
      <div className="flex flex-col gap-2">
        <label className="font-medium text-[15px]">이미지</label>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20">
              <img src={img.previewUrl} alt="" className="w-full h-full object-cover rounded-xl" />
              <button
                type="button"
                onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -top-1 -right-1 bg-gray-700 text-white rounded-full w-5 h-5 text-[11px] flex items-center justify-center cursor-pointer"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-2xl cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300]"
          >
            +
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleImageAdd(e.target.files)}
        />
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
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>

        {/* 장소 검색으로 추가 */}
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
          >
            검색
          </button>
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
                >
                  추가
                </button>
              </li>
            ))}
            <button
              type="button"
              onClick={() => setPlaceResults([])}
              className="text-[12px] text-gray-400 text-right mt-1 cursor-pointer"
            >
              닫기
            </button>
          </ul>
        )}
        <button
          type="button"
          onClick={() => setPlaces((prev) => [...prev, { name: "", naver_url: "", address: "" }])}
          className="text-[13px] text-[#EE6300] border border-[#EE6300] rounded-xl py-2 cursor-pointer hover:bg-[#EE6300] hover:text-white"
        >
          + 장소 직접 추가
        </button>
      </div>

      {/* 코스 추천: 연결 코스 ID */}
      {category === "course" && (
        <div className="flex flex-col gap-1">
          <label className="font-medium text-[15px]">연결할 코스 ID <span className="text-gray-400 font-normal text-[12px]">(북마크 기능에 사용, 선택)</span></label>
          <input
            value={linkedCourseId}
            onChange={(e) => setLinkedCourseId(e.target.value)}
            placeholder="courses 테이블의 id (UUID)"
            className="bg-gray-50 rounded-2xl p-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
          />
          <p className="text-[11px] text-gray-400">코스 상세 URL의 UUID를 복사해서 붙여넣으세요.</p>
        </div>
      )}

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
