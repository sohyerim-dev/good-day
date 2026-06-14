"use client";

import AlertModal from "@/components/ui/AlertModal";
import ReportModal from "@/components/ReportModal";
import { getCategoryEmoji } from "@/lib/categoryEmoji";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course, CoursePlace } from "@/types/course";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Fragment, use, useEffect, useRef, useState } from "react";

interface PlacePhoto {
  id: string;
  place_id: string;
  user_id: string;
  storage_url: string;
}

async function fetchPlacePhotos(placeIds: string[]): Promise<PlacePhoto[]> {
  if (placeIds.length === 0) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("place_photos")
    .select("id, place_id, user_id, storage_url")
    .in("place_id", placeIds);
  return data ?? [];
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.82);
    };
    img.src = URL.createObjectURL(file);
  });
}
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
    .select("*, places(id, name, address, detail_address, lat, lng, naver_url, google_place_id, category)")
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
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [includeSchedule, setIncludeSchedule] = useState(true);
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [includeMemo, setIncludeMemo] = useState(true);
  const [memoModal, setMemoModal] = useState<{ placeId: string; placeName: string } | null>(null);
  const [memoInput, setMemoInput] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [schedules, setSchedules] = useState<Record<string, string>>({});
  const [uploadingPlace, setUploadingPlace] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: "course" | "place_photo"; id: string } | null>(null);

  const searchParams = useSearchParams();

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

  const { data: places = [], isError: placesIsError } = useQuery({
    queryKey: ["coursePlaces", id],
    queryFn: () => fetchCoursePlaces(id),
  });

  const placeIds = places.map((p) => p.places.id);
  const { data: allPhotos = [] } = useQuery({
    queryKey: ["placePhotos", placeIds],
    queryFn: () => fetchPlacePhotos(placeIds),
    enabled: placeIds.length > 0,
  });
  const photosByPlace = allPhotos.reduce((acc, photo) => {
    if (!acc[photo.place_id]) acc[photo.place_id] = [];
    acc[photo.place_id].push(photo);
    return acc;
  }, {} as Record<string, PlacePhoto[]>);

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

  // 공동편집자 여부
  const { data: isCollaborator = false } = useQuery({
    queryKey: ["courseCollaborator", id, user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("course_collaborators")
        .select("user_id")
        .eq("course_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user?.id && !!course?.user_id && user?.id !== course?.user_id,
  });

  // ?u=userId 파라미터가 있으면 해당 유저의 일정을 표시, 없으면 내 일정
  const scheduleOwnerId = searchParams.get("u") ??
    ((user?.id === course?.user_id || isCollaborator) && course?.user_id ? course.user_id : user?.id) ??
    null;
  const isScheduleEditable = !!user && ((!!scheduleOwnerId && user.id === scheduleOwnerId) || isCollaborator);

  // 일정/메모 불러오기
  useEffect(() => {
    if (!scheduleOwnerId) return;
    const supabase = createClient();
    supabase
      .from("user_course_schedules")
      .select("course_place_id, time_memo, memo")
      .eq("user_id", scheduleOwnerId)
      .eq("course_id", id)
      .then(({ data }) => {
        if (!data) return;
        const timeMap: Record<string, string> = {};
        const memoMap: Record<string, string> = {};
        data.forEach((s: { course_place_id: string; time_memo: string; memo: string }) => {
          if (!s.course_place_id) return;
          if (s.time_memo) timeMap[s.course_place_id] = s.time_memo;
          if (s.memo) memoMap[s.course_place_id] = s.memo;
        });
        setSchedules(timeMap);
        setMemos(memoMap);
      });
  }, [id, scheduleOwnerId]);

  const likeMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      if (liked) {
        const { error } = await supabase.from("likes").delete().eq("user_id", user!.id).eq("course_id", id);
        if (error) { console.error("likes delete error:", error); throw error; }
      } else {
        const { error } = await supabase.from("likes").insert({ user_id: user!.id, course_id: id });
        if (error) { console.error("likes insert error:", error); throw error; }
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

  function handleSavePlace(placeId: string) {
    savePlaceMutation.mutate(placeId);
  }

  // 시간 메모 저장: 값이 있으면 upsert, 없으면 삭제
  async function handleSaveTime(coursePlaceId: string, time: string) {
    if (!user || !isScheduleEditable || !scheduleOwnerId) return;
    const supabase = createClient();
    await supabase.from("user_course_schedules").delete()
      .eq("user_id", scheduleOwnerId).eq("course_place_id", coursePlaceId);
    if (!time) {
      setSchedules((prev) => { const next = { ...prev }; delete next[coursePlaceId]; return next; });
    } else {
      await supabase.from("user_course_schedules").insert({
        user_id: scheduleOwnerId, course_id: id, course_place_id: coursePlaceId,
        time_memo: time, memo: memos[coursePlaceId] ?? null,
      });
      setSchedules((prev) => ({ ...prev, [coursePlaceId]: time }));
    }
  }

  async function handleSaveMemo(coursePlaceId: string, memo: string) {
    if (!user || !isScheduleEditable || !scheduleOwnerId) return;
    const supabase = createClient();
    const trimmed = memo.trim();
    await supabase.from("user_course_schedules").delete()
      .eq("user_id", scheduleOwnerId).eq("course_place_id", coursePlaceId);
    if (!trimmed && !schedules[coursePlaceId]) {
      setMemos((prev) => { const next = { ...prev }; delete next[coursePlaceId]; return next; });
    } else {
      const { error } = await supabase.from("user_course_schedules").insert({
        user_id: scheduleOwnerId, course_id: id, course_place_id: coursePlaceId,
        time_memo: schedules[coursePlaceId] ?? null, memo: trimmed || null,
      });
      if (!error) {
        if (trimmed) setMemos((prev) => ({ ...prev, [coursePlaceId]: trimmed }));
        else setMemos((prev) => { const next = { ...prev }; delete next[coursePlaceId]; return next; });
      }
    }
  }

  // 내 일정/메모가 있으면 ?u=내id 포함한 URL 반환
  function getShareUrl() {
    const base = `${window.location.origin}/courses/${id}`;
    const hasSchedule = isScheduleEditable && Object.keys(schedules).length > 0;
    const hasMemo = isScheduleEditable && Object.keys(memos).length > 0;
    const shouldInclude = (hasSchedule && includeSchedule) || (hasMemo && includeMemo);
    return shouldInclude ? `${base}?u=${scheduleOwnerId}` : base;
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


  async function handleInvite() {
    const res = await fetch(`/api/courses/${id}/invite`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) return;
    const link = `${window.location.origin}/courses/${id}/join?token=${data.token}`;
    await navigator.clipboard.writeText(link);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  }

  async function handleDeleteCourse() {
    if (!confirm("코스를 삭제할까요?")) return;
    const supabase = createClient();
    await supabase.from("courses").delete().eq("id", id);
    router.push("/");
  }

  function handleNaverPlaceClick(e: React.MouseEvent, placeName: string) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      e.preventDefault();
      window.location.href = `nmap://search?query=${encodeURIComponent(placeName)}&appname=kr.co.naver.map`;
    }
  }

  async function handlePhotoUpload(placeId: string, files: FileList) {
    if (!user || files.length === 0) return;
    setUploadingPlace(placeId);
    try {
      const supabase = createClient();
      await Promise.all(Array.from(files).map(async (file) => {
        const compressed = await compressImage(file);
        const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("place-photos")
          .upload(path, compressed, { contentType: "image/jpeg" });
        if (uploadError) return;
        const { data: { publicUrl } } = supabase.storage.from("place-photos").getPublicUrl(path);
        await supabase.from("place_photos").insert({ place_id: placeId, user_id: user.id, storage_url: publicUrl });
      }));
      queryClient.invalidateQueries({ queryKey: ["placePhotos"] });
    } finally {
      setUploadingPlace(null);
    }
  }

  async function handleDeletePhoto(photo: PlacePhoto) {
    const supabase = createClient();
    const path = photo.storage_url.split("/place-photos/")[1];
    await supabase.storage.from("place-photos").remove([path]);
    await supabase.from("place_photos").delete().eq("id", photo.id);
    queryClient.invalidateQueries({ queryKey: ["placePhotos"] });
  }

  if (isLoading || !hasHydrated)
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
    {reportTarget && (
      <ReportModal
        targetType={reportTarget.type}
        targetId={reportTarget.id}
        onClose={() => setReportTarget(null)}
      />
    )}
    {showLoginPrompt && (
      <AlertModal
        message="로그인 후 이용할 수 있어요"
        onClose={() => setShowLoginPrompt(false)}
        onConfirm={() => router.push(`/login?redirect=${encodeURIComponent(`/courses/${id}`)}`)}
      />
    )}
    {memoModal && (
      <div className="fixed inset-0 z-50 flex items-end">
        <div className="fixed inset-0 bg-black/30" onClick={() => setMemoModal(null)} />
        <div className="relative z-10 w-full bg-white rounded-t-3xl p-6 pb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-[16px]">{memoModal.placeName}</h2>
            <button onClick={() => setMemoModal(null)} className="text-gray-400 hover:text-black text-[13px] cursor-pointer">닫기</button>
          </div>
          {(course?.user_id === user?.id || isCollaborator) ? (
            <>
              <textarea
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                placeholder="메모를 입력하세요"
                className="w-full bg-gray-50 rounded-2xl p-4 text-[16px] focus:outline-none focus:ring-2 focus:ring-[#EE6300] resize-none h-32"
              />
              <div className="flex gap-2 mt-3">
                {memos[memoModal.placeId] && (
                  <button
                    onClick={async () => { await handleSaveMemo(memoModal.placeId, ""); setMemoModal(null); }}
                    className="flex-1 border border-red-300 text-red-400 rounded-2xl py-3 text-[14px] cursor-pointer"
                  >
                    삭제
                  </button>
                )}
                <button
                  onClick={async () => { await handleSaveMemo(memoModal.placeId, memoInput); setMemoModal(null); }}
                  className="flex-1 bg-[#EE6300] text-white rounded-2xl py-3 text-[14px] font-medium cursor-pointer"
                >
                  저장
                </button>
              </div>
            </>
          ) : (
            <p className="bg-gray-50 rounded-2xl p-4 text-[14px] text-gray-700 whitespace-pre-wrap min-h-20">
              {memos[memoModal.placeId]}
            </p>
          )}
        </div>
      </div>
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
            </div>
            {course?.description && (
              <p className="text-[14px] text-gray-500 pl-6">{course.description}</p>
            )}
            {course && course.user_id === user?.id && (
              <div className="flex items-center gap-1 pl-6 flex-wrap">
                <span className="text-[11px] leading-4.75 bg-[#EE6300] text-white rounded-full px-2 py-0.5">
                  내 코스
                </span>
                <span className={`text-[11px] leading-4.75 rounded-full px-2 py-0.5 ${course.is_public ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                  {course.is_public ? "공개" : "비공개"}
                </span>
                <Link
                  href={`/courses/${id}/edit`}
                  className="text-[11px] text-[#EE6300] border leading-4.75 border-[#EE6300] rounded-full px-2 py-0.5"
                >
                  수정
                </Link>
                <button
                  onClick={handleInvite}
                  className="text-[11px] text-[#EE6300] border leading-4.75 border-[#EE6300] rounded-full px-2 py-0.5"
                >
                  {inviteCopied ? "링크 복사됨!" : "공동편집 초대"}
                </button>
                <button
                  onClick={handleDeleteCourse}
                  className="text-[11px] text-red-400 border leading-4.75 border-red-300 rounded-full px-2 py-0.5"
                >
                  삭제
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {user && (
              <button onClick={() => router.back()} className="text-gray-400 cursor-pointer hover:text-black">
                뒤로 가기
              </button>
            )}
            {user && course && user.id !== course.user_id && (
              <button
                onClick={() => setReportTarget({ type: "course", id: course.id })}
                className="text-[11px] text-gray-400 hover:text-red-400 cursor-pointer"
              >
                신고
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 장소 목록 */}
      {placesIsError ? (
        <p className="text-gray-400">장소 목록을 불러올 수 없어요</p>
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
                      {getCategoryEmoji(p.places.category) && (
                        <span className="mr-1">{getCategoryEmoji(p.places.category)}</span>
                      )}
                      {p.places.name}
                    </span>
                    <span className="text-[12px] text-gray-400">
                      {p.places.address}{p.places.detail_address ? ` ${p.places.detail_address}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {p.places.naver_url ? (
                      <a
                        href={p.places.naver_url}
                        target="_blank"
                        onClick={(e) => handleNaverPlaceClick(e, p.places.name)}
                        className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 hover:bg-[#EE6300] hover:text-white"
                      >
                        네이버 플레이스
                      </a>
                    ) : p.places.google_place_id ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.places.name)}&query_place_id=${p.places.google_place_id}`}
                        target="_blank"
                        className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 hover:bg-[#EE6300] hover:text-white"
                      >
                        Google Maps
                      </a>
                    ) : null}
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
                {/* 메모: 내 코스·공동편집자·북마크면 편집 가능, 공유받은 경우 읽기 전용, 없으면 숨김 */}
                {(((course?.user_id === user?.id || isCollaborator || bookmarked) && isScheduleEditable) || (!isScheduleEditable && memos[p.id])) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    {memos[p.id] ? (
                      <button
                        onClick={() => {
                          setMemoInput(memos[p.id] ?? "");
                          setMemoModal({ placeId: p.id, placeName: p.places.name });
                        }}
                        className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer group"
                      >
                        <span className="text-[11px] text-[#EE6300] border border-[#EE6300] rounded-lg px-1.5 py-0.5 shrink-0 group-hover:bg-[#EE6300] group-hover:text-white">메모</span>
                        <span className="text-[12px] text-gray-500 truncate group-hover:text-[#EE6300]">{memos[p.id]}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setMemoInput("");
                          setMemoModal({ placeId: p.id, placeName: p.places.name });
                        }}
                        className="text-[12px] text-gray-500 border border-gray-300 rounded-xl px-3 py-1 cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300] shrink-0"
                      >
                        메모 추가
                      </button>
                    )}
                  </div>
                )}
                {/* 시간 메모: 내 코스·공동편집자·북마크면 편집 가능, 공유받은 일정이면 읽기 전용, 없으면 숨김 */}
                {(((course?.user_id === user?.id || isCollaborator || bookmarked) && isScheduleEditable) || (!isScheduleEditable && schedules[p.id])) && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <span className="text-[12px] text-gray-400">🕐</span>
                    {isScheduleEditable ? (
                      schedules[p.id] ? (
                        // 시간 있음: 수정 가능한 input + 삭제 버튼
                        <>
                          <input
                            type="time"
                            value={schedules[p.id]}
                            onChange={(e) =>
                              setSchedules((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            onBlur={(e) => handleSaveTime(p.id, e.target.value)}
                            className="text-[16px] text-[#EE6300] bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveTime(p.id, "")}
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
                                setSchedules((prev) => ({ ...prev, [p.id]: e.target.value }));
                                handleSaveTime(p.id, e.target.value);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </label>
                      )
                    ) : (
                      // 공유받은 일정: 읽기 전용
                      <span className="text-[13px] text-[#EE6300]">
                        {schedules[p.id]}
                      </span>
                    )}
                  </div>
                )}
                {/* 장소 사진 */}
                {((photosByPlace[p.places.id] ?? []).length > 0 || user) && (
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar">
                      {(photosByPlace[p.places.id] ?? []).map((photo) => (
                        <div key={photo.id} className="relative shrink-0">
                          <button
                            onClick={() => setLightboxPhoto(photo.storage_url)}
                            className="block w-16 h-16 rounded-lg overflow-hidden cursor-pointer"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photo.storage_url} alt="" className="w-full h-full object-cover" />
                          </button>
                          {(user?.id === photo.user_id || user?.role === "admin") ? (
                            <button
                              onClick={() => handleDeletePhoto(photo)}
                              className="absolute -top-1 -right-1 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none cursor-pointer"
                            >
                              ✕
                            </button>
                          ) : user && (
                            <button
                              onClick={() => setReportTarget({ type: "place_photo", id: photo.id })}
                              className="absolute -top-1 -right-1 bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm cursor-pointer"
                              title="신고"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#EE6300" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 22V2.8a.8.8 0 0 1 1.17-.71l11.38 5.69a.8.8 0 0 1 0 1.44L6 15.5"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                      {user && (
                        <label className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#EE6300] text-gray-400 hover:text-[#EE6300]">
                          {uploadingPlace === p.places.id ? (
                            <span className="text-[10px]">업로드중</span>
                          ) : (
                            <span className="text-2xl leading-none">+</span>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingPlace === p.places.id}
                            onChange={(e) => {
                              if (e.target.files) handlePhotoUpload(p.places.id, e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                    {user && (
                      <p className="text-[10px] text-gray-400 mt-1">직접 찍은 사진만 첨부해주세요</p>
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
              <div className="absolute bottom-14 left-0 bg-white rounded-2xl shadow-lg overflow-hidden z-10 w-44">
                {isScheduleEditable && Object.keys(schedules).length > 0 && (
                  <label className="flex items-center gap-2 px-4 py-3 text-[13px] cursor-pointer hover:bg-gray-50 border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={includeSchedule}
                      onChange={(e) => setIncludeSchedule(e.target.checked)}
                      className="accent-[#EE6300]"
                    />
                    시간 메모 포함
                  </label>
                )}
                {isScheduleEditable && Object.keys(memos).length > 0 && (
                  <label className="flex items-center gap-2 px-4 py-3 text-[13px] cursor-pointer hover:bg-gray-50 border-b border-gray-100">
                    <input
                      type="checkbox"
                      checked={includeMemo}
                      onChange={(e) => setIncludeMemo(e.target.checked)}
                      className="accent-[#EE6300]"
                    />
                    메모 포함
                  </label>
                )}
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
    {/* 사진 라이트박스 */}
    {lightboxPhoto && (
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
        onClick={() => setLightboxPhoto(null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightboxPhoto}
          alt=""
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={() => setLightboxPhoto(null)}
          className="absolute top-4 right-4 text-white text-2xl leading-none cursor-pointer"
        >
          ✕
        </button>
      </div>
    )}
    </>
  );
}
