"use client";
interface CoursePlace {
  id: string;
  order: number;
  places: {
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    naver_url: string;
  };
}

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course } from "@/types/course";
import Image from "next/image";
import { use, useEffect, useState } from "react";

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
        console.log("course.user_id:", data.user_id);
        console.log("user.id:", user?.id);
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
      <ul className="p-4 flex flex-col gap-2">
        {places.map((cp) => (
          <li
            key={cp.id}
            className="flex items-center justify-between bg-gray-50 rounded-2xl p-4"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                <span className="text-[#EE6300] mr-2">{cp.order}.</span>
                {cp.places.name}
              </span>
              <span className="text-[12px] text-gray-400">
                {cp.places.address}
              </span>
            </div>
            <a
              href={cp.places.naver_url}
              target="_blank"
              className="text-[12px] text-[#EE6300] border border-[#EE6300] rounded-xl px-2 py-1 shrink-0"
            >
              네이버 플레이스
            </a>
          </li>
        ))}
      </ul>

      {/* 하단 고정 버튼 영역 */}
      <div className="fixed bottom-20 left-0 right-0 px-4 flex gap-2 mb-5">
        <button className="flex-1 bg-[#EE6300] text-white rounded-2xl py-3 font-medium">
          경로 보기
        </button>
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
