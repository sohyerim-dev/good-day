"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

interface PostDetail {
  id: string;
  title: string;
  content: string;
  category: "place" | "course";
  linked_course_id: string | null;
  created_at: string;
  post_images: { id: string; url: string; order: number }[];
  post_places: { id: string; name: string; naver_url: string | null; address: string | null; order: number }[];
}

export default function RecommendationDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useUserStore((state) => state.user);
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = user?.role === "admin";

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [actionDone, setActionDone] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("posts")
      .select("*, post_images(id, url, order), post_places(id, name, naver_url, address, order)")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) {
          data.post_images = data.post_images.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
          data.post_places = data.post_places.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
          setPost(data);
        }
        setLoading(false);
      });
    // 조회수 증가 (RPC)
    supabase.rpc("increment_post_view", { p_id: id });
  }, [id]);

  async function handleSavePlace() {
    if (!user || !post || actionDone) return;
    setActionLoading(true);

    const firstPlace = post.post_places[0];
    if (!firstPlace?.naver_url) { setActionLoading(false); return; }

    // places 테이블에서 naver_url로 조회, 없으면 insert
    const { data: existing } = await supabase
      .from("places")
      .select("id")
      .eq("naver_url", firstPlace.naver_url)
      .single();

    let placeId = existing?.id;
    if (!placeId) {
      const { data: inserted } = await supabase
        .from("places")
        .insert({ name: firstPlace.name, naver_url: firstPlace.naver_url, address: "", lat: 0, lng: 0 })
        .select("id")
        .single();
      placeId = inserted?.id;
    }
    if (!placeId) { setActionLoading(false); return; }

    await supabase.from("saved_places").upsert(
      { user_id: user.id, place_id: placeId },
      { onConflict: "user_id, place_id" }
    );

    await supabase.rpc("increment_post_save", { p_id: post.id });
    setActionDone(true);
    setActionLoading(false);
  }

  async function handleBookmark() {
    if (!user || !post || actionDone) return;
    if (!post.linked_course_id) return;
    setActionLoading(true);

    await supabase.from("bookmarks").upsert(
      { user_id: user.id, course_id: post.linked_course_id },
      { onConflict: "user_id, course_id" }
    );

    await supabase.rpc("increment_post_bookmark", { p_id: post.id });
    setActionDone(true);
    setActionLoading(false);
  }

  if (loading) {
    return (
      <main className="p-4 flex flex-col gap-4">
        <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-6 bg-gray-200 rounded-xl animate-pulse w-2/3" />
        <div className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
      </main>
    );
  }

  if (!post) {
    return (
      <main className="p-4 flex flex-col items-center justify-center min-h-full">
        <p className="text-gray-400">글을 찾을 수 없어요.</p>
        <button onClick={() => router.back()} className="mt-4 text-[13px] text-[#EE6300]">돌아가기</button>
      </main>
    );
  }

  const images = post.post_images;

  return (
    <main className="flex flex-col min-h-full pb-28">
      <div className="p-4 flex flex-col gap-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span
              className={`self-start text-[11px] font-medium px-2 py-0.5 rounded-full ${
                post.category === "place"
                  ? "bg-blue-100 text-blue-600"
                  : "bg-orange-100 text-[#EE6300]"
              }`}
            >
              {post.category === "place" ? "장소 추천" : "코스 추천"}
            </span>
            <h1 className="text-[20px] font-bold">{post.title}</h1>
            <p className="text-[12px] text-gray-400">
              {new Date(post.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
          {isAdmin && (
            <div className="flex gap-2 shrink-0">
              <Link
                href={`/recommendations/write?edit=${post.id}`}
                className="text-[12px] text-gray-400 border border-gray-200 rounded-xl px-2 py-1 hover:text-[#EE6300] hover:border-[#EE6300]"
              >
                수정
              </Link>
              <button
                onClick={async () => {
                  if (!confirm("이 글을 삭제할까요?")) return;
                  await supabase.from("posts").delete().eq("id", post.id);
                  router.replace("/recommendations");
                }}
                className="text-[12px] text-red-400 border border-red-200 rounded-xl px-2 py-1 hover:text-red-600 hover:border-red-400 cursor-pointer"
              >
                삭제
              </button>
            </div>
          )}
        </div>

        {/* 이미지 슬라이더 */}
        {images.length > 0 && (
          <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
            <img src={images[imgIndex].url} alt="" className="w-full h-full object-contain" />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImgIndex((i) => Math.max(0, i - 1))}
                  disabled={imgIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button
                  onClick={() => setImgIndex((i) => Math.min(images.length - 1, i + 1))}
                  disabled={imgIndex === images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setImgIndex(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/50"}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 본문 */}
        <div
          className="text-[14px] leading-relaxed text-gray-700"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* 장소 링크 */}
        {post.post_places.length > 0 && (
          <div className="flex flex-col gap-2">
            <h2 className="text-[15px] font-bold">
              {post.category === "place" ? "장소 정보" : "코스 장소"}
            </h2>
            <ul className="flex flex-col gap-2">
              {post.post_places.map((place) => (
                <li key={place.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      {post.category === "course" && (
                        <span className="text-[#EE6300] font-bold text-[13px]">{place.order}.</span>
                      )}
                      <span className="text-[14px] font-medium">{place.name}</span>
                    </div>
                    {place.address && (
                      <span className="text-[12px] text-gray-400">{place.address}</span>
                    )}
                  </div>
                  {place.naver_url && (
                    <a
                      href={place.naver_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-gray-500 border border-gray-200 rounded-xl px-2 py-1 hover:text-[#EE6300] hover:border-[#EE6300] shrink-0"
                    >
                      네이버
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 저장 / 북마크 버튼 */}
        {user && (
          <div className="flex flex-col gap-2 mt-2">
            {post.category === "place" && post.post_places.length > 0 && (
              <button
                onClick={handleSavePlace}
                disabled={actionDone || actionLoading}
                className="w-full bg-[#EE6300] text-white rounded-2xl py-4 font-semibold text-[15px] disabled:opacity-50 disabled:cursor-default cursor-pointer hover:bg-[#d45700]"
              >
                {actionLoading ? "저장 중..." : actionDone ? "저장 완료!" : "장소 저장하기"}
              </button>
            )}
            {post.category === "course" && post.linked_course_id && (
              <button
                onClick={handleBookmark}
                disabled={actionDone || actionLoading}
                className="w-full bg-[#EE6300] text-white rounded-2xl py-4 font-semibold text-[15px] disabled:opacity-50 disabled:cursor-default cursor-pointer hover:bg-[#d45700]"
              >
                {actionLoading ? "저장 중..." : actionDone ? "북마크 완료!" : "코스 북마크하기"}
              </button>
            )}
          </div>
        )}
        <Link
          href="/recommendations"
          className="text-[13px] text-gray-400 hover:text-black text-center mt-2"
        >
          ← 목록으로
        </Link>
      </div>
    </main>
  );
}
