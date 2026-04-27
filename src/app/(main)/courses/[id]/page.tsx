"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course, CoursePlace } from "@/types/course";
import Image from "next/image";
import Link from "next/link";
import { Fragment, use, useEffect, useState } from "react";

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useUserStore((state) => state.user);
  const supabase = createClient();
  const [course, setCourse] = useState<Course | null>(null);
  const [places, setPlaces] = useState<CoursePlace[]>([]);

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  useEffect(() => {
    // 코스 정보
    supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setCourse(data);
      });

    //장소 목록 (순서대로)
    supabase
      .from("course_places")
      .select("*, places(*)")
      .eq("course_id", id)
      .order("order")
      .then(({ data }) => {
        if (data) setPlaces(data);
      });
  }, [id, user?.id]);

  return (
    <main className="flex flex-col min-h-full">
      {/* 상단 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold">{course?.title}</h1>
        {course?.description && (
          <p className="text-[14px] text-gray-500 mt-1">{course.description}</p>
        )}
      </div>

      {/* 장소 목록 */}
      <ul className="p-4 flex flex-col gap-2 pb-24">
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

      {/* 하단 고정 버튼 영역 */}
      <div className="fixed bottom-20 left-0 right-0 px-4 flex gap-2 mb-5">
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
              onClick={() => setLiked(!liked)}
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
              onClick={() => setBookmarked(!bookmarked)}
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
