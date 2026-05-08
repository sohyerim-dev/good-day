"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course, CoursePlace } from "@/types/course";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, use, useEffect, useState } from "react";

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useUserStore((state) => state.user);
  const supabase = createClient();
  const [error, setError] = useState("");
  const [course, setCourse] = useState<Course | null>(null);
  const [places, setPlaces] = useState<CoursePlace[]>([]);
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // 코스 정보
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

    //장소 목록 (순서대로)
    supabase
      .from("course_places")
      .select("*, places(*)")
      .eq("course_id", id)
      .order("order")
      .then(({ data, error }) => {
        if (data) setPlaces(data);
        if (!data || error) setPlacesError("장소 목록을 불러올 수 없어요");
      });

    // 좋아요 여부 확인
    supabase
      .from("likes")
      .select("id")
      .eq("user_id", user?.id)
      .eq("course_id", id)
      .single()
      .then(({ data }) => setLiked(!!data));

    // "!!"는 data가 있으면 true, 없으면 false로 변환
    // 북마크 여부 확인
    supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user?.id)
      .eq("course_id", id)
      .single()
      .then(({ data }) => setBookmarked(!!data));
  }, [id, user?.id]);

  // 얼리 리턴 처리
  if (loading)
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
    <main className="flex flex-col min-h-full">
      {/* 상단 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between">
          <div className="flex items-center gap-1">
            <Image
              src="/icons/orange-route.svg"
              width={20}
              height={20}
              alt=""
            />
            <h1 className="text-[22px] font-bold">{course?.title}</h1>
            {course && course.user_id === user?.id && (
              <span className="text-[11px] bg-[#EE6300] text-white rounded-full px-2 py-0.5">
                내 코스
              </span>
            )}
          </div>
          <button onClick={() => router.back()} className="text-gray-400">
            뒤로 가기
          </button>
        </div>

        {course?.description && (
          <p className="text-[14px] text-gray-500 mt-1 pl-6">
            {course.description}
          </p>
        )}
      </div>

      {/* 장소 목록 */}
      {placesError ? (
        <p className="text-gray-400">{placesError}</p>
      ) : (
        <ul className="p-4 flex flex-col gap-2 pb-44">
          {places.map((p, i) => (
            <Fragment key={p.id}>
              <li
                key={p.id}
                className="flex items-center justify-between bg-gray-50 rounded-2xl p-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    <span className="text-[#EE6300] mr-2">{p.order}.</span>
                    {p.places.name}
                  </span>
                  <span className="text-[12px] text-gray-400">
                    {p.places.address}
                  </span>
                </div>
                <a
                  href={p.places.naver_url}
                  target="_blank"
                  className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 shrink-0"
                >
                  네이버 플레이스
                </a>
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
      <div className="fixed bottom-24 left-0 right-0 px-4 flex gap-2">
        <Link
          href={`/map/${id}`}
          className="flex-1 bg-[#EE6300] text-white text-center rounded-2xl py-3 font-medium"
        >
          경로 보기
        </Link>
        <Link
          href={`/map/${id}?transit=true`}
          className="flex-1 bg-[#EE6300] text-white text-center rounded-2xl py-3 font-medium"
        >
          교통수단 보기
        </Link>
        {course && course.user_id !== user?.id && (
          <div className="flex gap-2">
            <button
              className="bg-gray-100 rounded-2xl px-4 py-3"
              onClick={async () => {
                if (liked) {
                  const { error } = await supabase
                    .from("likes")
                    .delete()
                    .eq("user_id", user?.id)
                    .eq("course_id", id);
                  if (!error) setLiked(!liked);
                } else {
                  const { error } = await supabase
                    .from("likes")
                    .insert({ user_id: user?.id, course_id: id });
                  if (!error) setLiked(!liked);
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
              className="bg-gray-100 rounded-2xl px-4 py-3"
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
          </div>
        )}
      </div>
    </main>
  );
}
