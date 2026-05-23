"use client";

import AlertModal from "@/components/ui/AlertModal";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course, CoursePlace } from "@/types/course";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, use, useEffect, useRef, useState } from "react";
import Script from "next/script";

export default function CourseDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useUserStore((state) => state.user);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const supabase = createClient();
  const [error, setError] = useState("");
  const [course, setCourse] = useState<Course | null>(null);
  const [places, setPlaces] = useState<CoursePlace[]>([]);
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // ?u=userId 파라미터가 있으면 해당 유저의 일정을 표시, 없으면 내 일정
  const searchParams = useSearchParams();
  const scheduleOwnerId = searchParams.get("u") ?? user?.id ?? null;
  const isScheduleEditable = !!user && !!scheduleOwnerId && user.id === scheduleOwnerId;
  const [schedules, setSchedules] = useState<Record<string, string>>({}); // place_id → time_memo

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

  // 비로그인 포함 누구나 볼 수 있는 공개 데이터
  useEffect(() => {
    supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (data) setCourse(data);
        setLoading(false);
        if (!data || error) setError("코스를 찾을 수 없어요");
      });

    supabase
      .from("course_places")
      .select("*, places(*)")
      .eq("course_id", id)
      .order("order")
      .then(({ data, error }) => {
        if (data) setPlaces(data);
        if (!data || error) setPlacesError("장소 목록을 불러올 수 없어요");
      });
  }, [id]);

  // scheduleOwnerId 기준으로 일정 불러오기 (내 일정 또는 공유받은 일정)
  useEffect(() => {
    if (!scheduleOwnerId) return;
    supabase
      .from("user_course_schedules")
      .select("place_id, time_memo")
      .eq("user_id", scheduleOwnerId)
      .eq("course_id", id)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, string> = {};
        data.forEach((s: { place_id: string; time_memo: string }) => {
          map[s.place_id] = s.time_memo;
        });
        setSchedules(map);
      });
  }, [id, scheduleOwnerId]);

  // 로그인한 사용자에게만 필요한 데이터 (좋아요 여부, 북마크 여부, 저장된 장소)
  useEffect(() => {
    if (!user?.id) return;

    supabase
      .from("likes")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));

    supabase
      .from("likes")
      .select("id", { count: "exact", head: true })
      .eq("course_id", id)
      .then(({ count }) => setLikeCount(count ?? 0));

    supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", id)
      .maybeSingle()
      .then(({ data }) => setBookmarked(!!data));

    supabase
      .from("saved_places")
      .select("place_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) setSavedPlaces(new Set(data.map((d) => d.place_id)));
      });
  }, [id, user?.id]);

  async function handleSavePlace(placeId: string) {
    if (savedPlaces.has(placeId)) {
      const { error } = await supabase
        .from("saved_places")
        .delete()
        .eq("user_id", user?.id)
        .eq("place_id", placeId);

      if (!error) {
        setSavedPlaces((prev) => {
          const next = new Set(prev);
          next.delete(placeId);
          return next;
        });
      }
    } else {
      const { error } = await supabase
        .from("saved_places")
        .insert({ "user_id": user?.id, place_id: placeId });
      if (!error) {
        setSavedPlaces((prev) => new Set(prev).add(placeId));
      }
    }
  }

  // 시간 메모 저장: 값이 있으면 upsert, 없으면 삭제
  async function handleSaveTime(placeId: string, time: string) {
    if (!user || !isScheduleEditable) return;
    if (!time) {
      await supabase.from("user_course_schedules").delete()
        .eq("user_id", user.id).eq("course_id", id).eq("place_id", placeId);
      setSchedules((prev) => { const next = { ...prev }; delete next[placeId]; return next; });
    } else {
      await supabase.from("user_course_schedules").upsert(
        { user_id: user.id, course_id: id, place_id: placeId, time_memo: time },
        { onConflict: "user_id,course_id,place_id" },
      );
      setSchedules((prev) => ({ ...prev, [placeId]: time }));
    }
  }

  // 내 일정이 있으면 ?u=내id 포함한 URL 반환
  function getShareUrl() {
    const base = `${window.location.origin}/courses/${id}`;
    const hasSchedule = isScheduleEditable && Object.keys(schedules).length > 0;
    return hasSchedule ? `${base}?u=${user?.id}` : base;
  }

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setShowShareMenu(false);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleKakaoShare() {
    const url = getShareUrl();
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


  async function handleDeleteCourse() {
    if (!confirm("코스를 삭제할까요?")) return;
    await supabase.from("courses").delete().eq("id", id);
    router.push("/");
  }

  if (loading || !hasHydrated)
    return (
      <main className="flex flex-col min-h-full">
        <div className="p-4 border-b border-gray-100 animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="p-4 flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </main>
    );
  if (error)
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
              <Image
                src="/icons/orange-route.svg"
                width={20}
                height={20}
                alt=""
                className="shrink-0"
              />
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
                  onClick={handleDeleteCourse}
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
        <p className="text-gray-400">{placesError}</p>
      ) : (
        <ul className="p-4 flex flex-col gap-2 pb-56">
          {places.map((p, i) => (
            <Fragment key={p.id}>
              <li
                key={p.id}
                className="flex flex-col bg-gray-50 rounded-2xl p-4 gap-2"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1 flex-1 min-w-0 mr-2">
                    <span className="font-medium">
                      <span className="text-[#EE6300] mr-2">{p.order}.</span>
                      {p.places.name}
                    </span>
                    <span className="text-[12px] text-gray-400">
                      {p.places.address}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={p.places.naver_url}
                      target="_blank"
                      className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 hover:bg-[#EE6300] hover:text-white"
                    >
                      네이버 플레이스
                    </a>
                    {user && (
                      <button
                        onClick={() => handleSavePlace(p.places.id)}
                        className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 cursor-pointer hover:bg-[#EE6300] hover:text-white"
                      >
                        {savedPlaces.has(p.places.id) ? "저장됨" : "저장"}
                      </button>
                    )}
                  </div>
                </div>
                {/* 시간 메모: 내 일정이면 편집 가능, 공유받은 일정이면 읽기 전용, 없으면 숨김 */}
                {(isScheduleEditable || schedules[p.places.id]) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <span className="text-[12px] text-gray-400">🕐</span>
                    {isScheduleEditable ? (
                      schedules[p.places.id] ? (
                        // 시간 있음: 수정 가능한 input + 삭제 버튼
                        <>
                          <input
                            type="time"
                            value={schedules[p.places.id]}
                            onChange={(e) =>
                              setSchedules((prev) => ({ ...prev, [p.places.id]: e.target.value }))
                            }
                            onBlur={(e) => handleSaveTime(p.places.id, e.target.value)}
                            className="text-[16px] text-[#EE6300] bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveTime(p.places.id, "")}
                            className="text-gray-300 hover:text-gray-500 cursor-pointer text-[16px] leading-none"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        // 시간 없음: "시간 추가" 안내 문구 탭하면 picker 열림
                        <label className="relative flex items-center gap-1 cursor-pointer text-[13px] text-gray-400">
                          시간 추가
                          <input
                            type="time"
                            onBlur={(e) => {
                              if (e.target.value) {
                                setSchedules((prev) => ({ ...prev, [p.places.id]: e.target.value }));
                                handleSaveTime(p.places.id, e.target.value);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </label>
                      )
                    ) : (
                      // 공유받은 일정: 읽기 전용
                      <span className="text-[13px] text-[#EE6300]">
                        {schedules[p.places.id]}
                      </span>
                    )}
                  </div>
                )}
              </li>
              {i !== places.length - 1 && (
                <li>
                  <Image
                    src="/icons/arrow-big-down.svg"
                    alt=""
                    width={20}
                    height={20}
                    className="mx-auto m-2"
                  />
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
            교통수단 보기
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
            <button
              className="flex-1 flex justify-center bg-gray-100 rounded-2xl px-4 py-3 cursor-pointer"
              onClick={async () => {
                if (liked) {
                  const { error } = await supabase
                    .from("likes")
                    .delete()
                    .eq("user_id", user?.id)
                    .eq("course_id", id);
                  if (!error) { setLiked(false); setLikeCount((prev) => prev - 1); }
                } else {
                  const { error } = await supabase
                    .from("likes")
                    .insert({ user_id: user?.id, course_id: id });
                  if (!error) { setLiked(true); setLikeCount((prev) => prev + 1); }
                }
              }}
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
              onClick={async () => {
                if (bookmarked) {
                  const { error } = await supabase
                    .from("bookmarks")
                    .delete()
                    .eq("user_id", user?.id)
                    .eq("course_id", id);
                  if (!error) setBookmarked(!bookmarked);
                } else {
                  const { error } = await supabase
                    .from("bookmarks")
                    .insert({ user_id: user?.id, course_id: id });
                  if (!error) setBookmarked(!bookmarked);
                }
              }}
            >
              <Image
                src={
                  bookmarked
                    ? "/icons/bookmark-filled.svg"
                    : "/icons/bookmark.svg"
                }
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
