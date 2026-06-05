"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

const ADMIN_EMAIL = "musik91@naver.com";

interface PostDetail {
  id: string;
  title: string;
  content: string;
  category: "place" | "course";
  linked_course_id: string | null;
  save_count: number;
  bookmark_count: number;
  created_at: string;
  post_images: { id: string; url: string; order: number }[];
  post_places: { id: string; name: string; naver_url: string | null; order: number }[];
}

export default function RecommendationDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useUserStore((state) => state.user);
  const router = useRouter();
  const supabase = createClient();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIndex, setImgIndex] = useState(0);
  const [actionDone, setActionDone] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("posts")
      .select("*, post_images(id, url, order), post_places(id, name, naver_url, order)")
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

    // save_count 증가
    await supabase.from("posts").update({ save_count: (post.save_count ?? 0) + 1 }).eq("id", post.id);
    setPost((p) => p ? { ...p, save_count: (p.save_count ?? 0) + 1 } : p);
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

    // bookmark_count 증가
    await supabase.from("posts").update({ bookmark_count: (post.bookmark_count ?? 0) + 1 }).eq("id", post.id);
    setPost((p) => p ? { ...p, bookmark_count: (p.bookmark_count ?? 0) + 1 } : p);
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
      {/* 이미지 슬라이더 */}
      {images.length > 0 && (
        <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: "4/3" }}>
          <img
            src={images[imgIndex].url}
            alt=""
            className="w-full h-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={() => setImgIndex((i) => Math.max(0, i - 1))}
                disabled={imgIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"
              >
                ‹
              </button>
              <button
                onClick={() => setImgIndex((i) => Math.min(images.length - 1, i + 1))}
                disabled={imgIndex === images.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 text-white rounded-full w-8 h-8 flex items-center justify-center disabled:opacity-30"
              >
                ›
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? "bg-white" : "bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

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
            <Link
              href={`/recommendations/write?edit=${post.id}`}
              className="shrink-0 text-[12px] text-gray-400 border border-gray-200 rounded-xl px-2 py-1 hover:text-[#EE6300] hover:border-[#EE6300]"
            >
              수정
            </Link>
          )}
        </div>

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
                  <div className="flex items-center gap-2">
                    {post.category === "course" && (
                      <span className="text-[#EE6300] font-bold text-[13px]">{place.order}.</span>
                    )}
                    <span className="text-[14px] font-medium">{place.name}</span>
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
            <p className="text-[12px] text-gray-400 text-center">
              {post.category === "place"
                ? `${post.save_count ?? 0}명이 저장했어요`
                : `${post.bookmark_count ?? 0}명이 북마크했어요`}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
