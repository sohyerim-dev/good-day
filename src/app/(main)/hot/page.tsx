"use client";

import { createClient } from "@/lib/supabase/client";
import { HotCourse } from "@/types/course";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const PAGE_SIZE = 5;

async function fetchHotCourses(): Promise<HotCourse[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*, profiles(username), likes(count), course_places(order, places(name))")
    .eq("is_public", true)
    .eq("is_hidden", false);
  if (error) throw new Error("인기 코스를 불러올 수 없어요");
  return (data ?? [])
    .filter((c) => (c.likes[0]?.count ?? 0) > 0)
    .sort((a, b) => (b.likes[0]?.count ?? 0) - (a.likes[0]?.count ?? 0));
}

export default function Hot() {
  const [page, setPage] = useState(1);
  const { data: courses = [], isLoading, isError } = useQuery({
    queryKey: ["hotCourses"],
    queryFn: fetchHotCourses,
  });

  const totalPages = Math.ceil(courses.length / PAGE_SIZE);
  const paginated = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="flex flex-col min-h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold">인기 코스</h1>
        <p className="text-[13px] text-gray-400 mt-1">좋아요를 많이 받은 코스를 둘러보세요.</p>
      </div>

      {/* 목록 */}
      <ul className="p-4 flex flex-col gap-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))
        ) : isError ? (
          <p className="text-gray-400 text-center py-10">인기 코스를 불러올 수 없어요</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-center py-10">인기 코스가 없어요</p>
        ) : (
          paginated.map((course, i) => {
            const rank = (page - 1) * PAGE_SIZE + i + 1;
            return (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className="group block bg-gray-50 rounded-2xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1 flex-1">
                      <p className="font-bold text-[16px]">
                        <span className="text-[#EE6300] mr-1">{rank}.</span>
                        {course.title}
                      </p>
                      <p className="text-[12px] text-gray-400">
                        {course.profiles?.username}
                      </p>
                      <p className="text-[12px] text-gray-500 mt-1">
                        {(course.course_places ?? [])
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
            );
          })
        )}
      </ul>

      {/* 페이지네이션 */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-4 pb-28">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-xl text-[13px] font-medium cursor-pointer ${
                p === page
                  ? "bg-[#EE6300] text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default"
          >
            다음
          </button>
        </div>
      )}
    </main>
  );
}
