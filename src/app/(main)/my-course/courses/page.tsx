"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course } from "@/types/course";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const PAGE_SIZE = 5;

async function fetchMyCourses(userId: string): Promise<Course[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("코스를 불러올 수 없어요");
  return data ?? [];
}

export default function Courses() {
  const [page, setPage] = useState(1);
  const user = useUserStore((state) => state.user);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: courses = [], isLoading, isError } = useQuery({
    queryKey: ["myCourses", user?.id],
    queryFn: () => fetchMyCourses(user!.id),
    enabled: !!user?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const supabase = createClient();
      await supabase.from("courses").delete().eq("id", courseId);
    },
    onSuccess: (_, courseId) => {
      queryClient.setQueryData<Course[]>(["myCourses", user?.id], (prev) =>
        (prev ?? []).filter((c) => c.id !== courseId),
      );
    },
  });

  async function handleDeleteCourse(courseId: string) {
    if (!confirm("코스를 삭제할까요?")) return;
    deleteMutation.mutate(courseId);
  }

  const totalPages = Math.ceil(courses.length / PAGE_SIZE);
  const paginated = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="flex flex-col min-h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-[22px] font-bold">내 코스</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-[14px] cursor-pointer hover:text-black"
        >
          뒤로 가기
        </button>
      </div>

      {/* 목록 */}
      <div className="p-4 flex flex-col gap-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))
        ) : isError ? (
          <p className="text-gray-400 text-center py-10">코스를 불러올 수 없어요</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-center py-10">
            등록된 코스가 없어요
          </p>
        ) : (
          paginated.map((course) => (
            <div
              key={course.id}
              className="flex items-center justify-between bg-gray-50 rounded-2xl p-4"
            >
              <Link
                href={`/courses/${course.id}`}
                className="flex flex-col gap-1 flex-1"
              >
                <p className="font-medium">{course.title}</p>
                {course.description && (
                  <p className="text-[12px] text-gray-400">
                    {course.description}
                  </p>
                )}
              </Link>
              <button
                onClick={() => handleDeleteCourse(course.id)}
                className="text-[12px] text-red-400 border cursor-pointer hover:bg-red-400 hover:text-white border-red-300 rounded-xl px-2 py-1 shrink-0 ml-3"
              >
                삭제
              </button>
            </div>
          ))
        )}
      </div>
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
                p === page ? "bg-[#EE6300] text-white" : "bg-gray-100 text-gray-500"
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
