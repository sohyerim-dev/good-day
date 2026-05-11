"use client";

import { createClient } from "@/lib/supabase/client";
import { HotCourse } from "@/types/course";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Hot() {
  const [courses, setCourses] = useState<HotCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("courses")
      .select(
        "*, profiles(username), likes(count), course_places(order, places(name))",
      )
      .eq("is_public", true)
      .then(({ data, error }) => {
        if (error) setError("인기 코스를 불러올 수 없어요");
        const sorted = (data ?? []).sort(
          (a, b) => (b.likes[0]?.count ?? 0) - (a.likes[0]?.count ?? 0),
        );
        setCourses(sorted);
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex flex-col min-h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold">인기 코스</h1>
      </div>

      {/* 목록 */}
      <ul className="p-4 flex flex-col gap-3 pb-24">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))
        ) : error ? (
          <p className="text-gray-400 text-center py-10">{error}</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-center py-10">인기 코스가 없어요</p>
        ) : (
          courses.map((course, i) => (
            <li key={course.id}>
              <Link
                href={`/courses/${course.id}`}
                className="group block bg-gray-50 rounded-2xl p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1 flex-1">
                    <p className="font-bold text-[16px]">
                      <span className="text-[#EE6300] mr-1">{i + 1}.</span>
                      {course.title}
                    </p>
                    <p className="text-[12px] text-gray-400">
                      {course.profiles.username}
                    </p>
                    <p className="text-[12px] text-gray-500 mt-1">
                      {course.course_places
                        .sort((a, b) => a.order - b.order)
                        .map((cp) => cp.places.name)
                        .join(" → ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[13px] text-gray-400 shrink-0 ml-3">
                    <Image
                      src="/icons/heart-filled.svg"
                      alt="좋아요"
                      width={14}
                      height={14}
                    />
                    <span>{course.likes[0]?.count ?? 0}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
