"use client";

import AlertModal from "@/components/ui/AlertModal";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course, CoursePlace } from "@/types/course";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, use, useEffect, useRef, useState } from "react";
import Script from "next/script";

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
    .select("*, places(*)")
    .eq("course_id", id)
    .order("order");
  if (error) throw new Error("장소 목록을 불러올 수 없어요");
  return data ?? [];
}

interface CourseUserData {
  liked: boolean;
  likeCount: number;
  bookmarked: boolean;
  savedPlaceIds: string[];
}

async function fetchCourseUserData(id: string, userId: string): Promise<CourseUserData> {
  const supabase = createClient();
  const [likedRes, likeCountRes, bookmarkedRes, savedRes] = await Promise.all([
    supabase.from("likes").select("id").eq("user_id", userId).eq("course_id", id).maybeSingle(),
    supabase.from("likes").select("id", { count: "exact", head: true }).eq("course_id", id),
    supabase.from("bookmarks").select("id").eq("user_id", userId).eq("course_id", id).maybeSingle(),
    supabase.from("saved_places").select("place_id").eq("user_id", userId),
  ]);
  return {
    liked: !!likedRes.data,
    likeCount: likeCountRes.count ?? 0,
    bookmarked: !!bookmarkedRes.data,
    savedPlaceIds: (savedRes.data ?? []).map((d) => d.place_id),
  };
}

export default function CourseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useUserStore((state) => state.user);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // 공유 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const { data: course, isLoading, isError } = useQuery({
    queryKey: ["course", id],
    queryFn: () => fetchCourse(id),
  });

  const { data: places = [], isError: placesError } = useQuery({
    queryKey: ["coursePlaces", id],
    queryFn: () => fetchCoursePlaces(id),
  });

  const userDataQueryKey = ["courseUserData", id, user?.id];
  const { data: userData } = useQuery({
    queryKey: userDataQueryKey,
    queryFn: () => fetchCourseUserData(id, user!.id),
    enabled: !!user?.id,
  });

  const liked = userData?.liked ?? false;
  const likeCount = userData?.likeCount ?? 0;
  const bookmarked = userData?.bookmarked ?? false;
  const savedPlaces = new Set(userData?.savedPlaceIds ?? []);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      await supabase.from("courses").delete().eq("id", id);
    },
    onSuccess: () => router.push("/"),
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      if (liked) {
        await supabase.from("likes").delete().eq("user_id", user!.id).eq("course_id", id);
      } else {
        await supabase.from("likes").insert({ user_id: user!.id, course_id: id });
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<CourseUserData>(userDataQueryKey, (prev) =>
        prev ? { ...prev, liked: !liked, likeCount: liked ? likeCount - 1 : likeCount + 1 } : prev,
      );
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      if (bookmarked) {
        await supabase.from("bookmarks").delete().eq("user_id", user!.id).eq("course_id", id);
      } else {
        await supabase.from("bookmarks").insert({ user_id: user!.id, course_id: id });
      }
    },
    onSuccess: () => {
      queryClient.setQueryData<CourseUserData>(userDataQueryKey, (prev) =>
        prev ? { ...prev, bookmarked: !bookmarked } : prev,
      );
    },
  });

  const savePlaceMutation = useMutation({
    mutationFn: async (placeId: string) => {
      const supabase = createClient();
      if (savedPlaces.has(placeId)) {
        await supabase.from("saved_places").delete().eq("user_id", user!.id).eq("place_id", placeId);
      } else {
        await supabase.from("saved_places").insert({ user_id: user!.id, place_id: placeId });
      }
      return placeId;
    },
    onSuccess: (placeId) => {
      queryClient.setQueryData<CourseUserData>(userDataQueryKey, (prev) => {
        if (!prev) return prev;
        const next = new Set(prev.savedPlaceIds);
        next.has(placeId) ? next.delete(placeId) : next.add(placeId);
        return { ...prev, savedPlaceIds: Array.from(next) };
      });
    },
  });

  async function handleCopyUrl() {
    const url = `${window.location.origin}/courses/${id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setShowShareMenu(false);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleKakaoShare() {
    const url = `${window.location.origin}/courses/${id}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).Kakao;
    if (!kakao) return;
    if (!kakao.isInitialized()) kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
    kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: course?.title ?? "굿데이 코스",
        description: course?.description ?? "나만의 놀기 코스 플래너, 굿데이",
        imageUrl: `${window.location.origin}/images/og-image.png`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [{ title: "코스 보기", link: { mobileWebUrl: url, webUrl: url } }],
    });
    setShowShareMenu(false);
  }

  if (isLoading)
    return (
      <main className="flex flex-col min-h-full">
        <div className="p-4 border-b border-gray-100 animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="p-4 flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    );

  if (isError)
    return (
      <main className="flex flex-col items-center justify-center min-h-full gap-4">
        <p className="text-gray-400">코스를 찾을 수 없어요</p>
        <button onClick={() => router.back()} className="text-[#EE6300]">
          뒤로 가기
        </button>
      </main>
    );

  return (
    <>
      {showLoginPrompt && (
        <AlertModal
          message="로그인 후 이용할 수 있어요"
          onClose={() => setShowLoginPrompt(false)}
          onConfirm={() => router.push(`/login?redirect=${encodeURIComponent(`/courses/${id}`)}`)}
        />
      )}
      <Script
        src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const kakao = (window as any).Kakao;
          if (kakao && !kakao.isInitialized()) {
            kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
          }
        }}
      />
      <main className="flex flex-col min-h-full">
        {/* 상단 헤더 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Image src="/icons/orange-route.svg" width={20} height={20} alt="" className="shrink-0" />
                <h1 className="text-[22px] font-bold">{course?.title}</h1>
                <div className="flex items-center gap-1 text-[13px] text-gray-400 shrink-0">
                  <Image src="/icons/heart-filled.svg" alt="좋아요" width={14} height={14} />
                  <span>{likeCount}</span>
                </div>
              </div>
              {course?.description && (
                <p className="text-[14px] text-gray-500 pl-6">{course.description}</p>
              )}
              {course && course.user_id === user?.id && (
                <div className="flex items-center gap-1 pl-6">
                  <span className="text-[11px] leading-4.75 bg-[#EE6300] text-white rounded-full px-2 py-0.5">
                    내 코스
                  </span>
                  <Link
                    href={`/courses/${id}/edit`}
                    className="text-[11px] text-[#EE6300] border leading-4.75 border-[#EE6300] rounded-full px-2 py-0.5"
                  >
                    수정
                  </Link>
                  <button
                    onClick={() => { if (confirm("코스를 삭제할까요?")) deleteMutation.mutate(); }}
                    className="text-[11px] text-red-400 border leading-4.75 border-red-300 rounded-full px-2 py-0.5"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            {user && (
              <button onClick={() => router.back()} className="text-gray-400 shrink-0 cursor-pointer hover:text-black">
                뒤로 가기
              </button>
            )}
          </div>
        </div>

        {/* 장소 목록 */}
        {placesError ? (
          <p className="text-gray-400 p-4">장소 목록을 불러올 수 없어요</p>
        ) : (
          <ul className="p-4 flex flex-col gap-2 pb-56">
            {places.map((p, i) => (
              <Fragment key={p.id}>
                <li className="flex items-start justify-between bg-gray-50 rounded-2xl p-4">
                  <div className="flex flex-col gap-1 flex-1 min-w-0 mr-2">
                    <span className="font-medium">
                      <span className="text-[#EE6300] mr-2">{p.order}.</span>
                      {p.places.name}
                    </span>
                    <span className="text-[12px] text-gray-400">{p.places.address}</span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={p.places.naver_url}
                      target="_blank"
                      className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 hover:bg-[#EE6300] hover:text-white"
                    >
                      네이버 플레이스
                    </a>
                    <button
                      onClick={() => user ? savePlaceMutation.mutate(p.places.id) : setShowLoginPrompt(true)}
                      className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 cursor-pointer hover:bg-[#EE6300] hover:text-white"
                    >
                      {savedPlaces.has(p.places.id) ? "저장됨" : "저장"}
                    </button>
                  </div>
                </li>
                {i !== places.length - 1 && (
                  <li>
                    <Image src="/icons/arrow-big-down.svg" alt="" width={20} height={20} className="mx-auto m-2" />
                  </li>
                )}
              </Fragment>
            ))}
          </ul>
        )}

        {/* 하단 고정 버튼 영역 */}
        <div className="fixed bottom-24 left-0 right-0 px-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/map/${id}`)}
              className="flex-1 bg-[#EE6300] text-white text-center rounded-2xl py-3 font-medium"
            >
              경로 보기
            </button>
            <button
              onClick={() => router.push(`/map/${id}?transit=true`)}
              className="flex-1 bg-[#EE6300] text-white text-center rounded-2xl py-3 font-medium"
            >
              교통수단・경로 보기
            </button>
          </div>
          <div className="flex gap-2">
            <div ref={shareMenuRef} className="relative flex-1">
              <button
                onClick={() => setShowShareMenu((v) => !v)}
                className="w-full flex justify-center bg-gray-100 rounded-2xl px-4 py-3 cursor-pointer"
              >
                <Image src="/icons/link.svg" alt="공유" width={24} height={24} />
              </button>
              {copied && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-700 text-white text-[11px] rounded px-2 py-1 whitespace-nowrap z-10">
                  복사됨
                </span>
              )}
              {showShareMenu && (
                <div className="absolute bottom-14 left-0 bg-white rounded-2xl shadow-lg overflow-hidden z-10 w-36">
                  <button
                    onClick={handleCopyUrl}
                    className="w-full px-4 py-3 text-[13px] text-left hover:bg-gray-50 cursor-pointer"
                  >
                    🔗 URL 복사
                  </button>
                  <button
                    onClick={handleKakaoShare}
                    className="w-full px-4 py-3 text-[13px] text-left hover:bg-gray-50 cursor-pointer border-t border-gray-100"
                  >
                    💬 카카오톡 공유
                  </button>
                </div>
              )}
            </div>
            {user && course && course.user_id !== user?.id && (
              <>
                <div className="relative flex items-center">
                  <button
                    onClick={() => setShowInfoTooltip((v) => !v)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 text-[13px] rounded-full hover:bg-gray-100 cursor-pointer"
                  >
                    ⓘ
                  </button>
                  {showInfoTooltip && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[12px] rounded-2xl px-4 py-3 w-52 z-20 shadow-lg">
                      <p className="mb-1.5">❤️ <span className="font-medium">좋아요</span> — 코스가 마음에 들면 눌러보세요. 인기 코스 순위에 반영돼요.</p>
                      <p>🔖 <span className="font-medium">저장</span> — 마이코스 &gt; 북마크에 저장돼요.</p>
                      <button
                        onClick={() => setShowInfoTooltip(false)}
                        className="absolute top-2 right-3 text-gray-400 hover:text-white text-[11px]"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="flex-1 flex justify-center bg-gray-100 rounded-2xl px-4 py-3 cursor-pointer"
                  onClick={() => likeMutation.mutate()}
                >
                  <Image
                    src={liked ? "/icons/heart-filled.svg" : "/icons/heart.svg"}
                    alt="좋아요"
                    width={24}
                    height={24}
                  />
                </button>
                <button
                  className="flex-1 flex justify-center bg-gray-100 rounded-2xl px-4 py-3 cursor-pointer"
                  onClick={() => bookmarkMutation.mutate()}
                >
                  <Image
                    src={bookmarked ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"}
                    alt="북마크"
                    width={24}
                    height={24}
                  />
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
