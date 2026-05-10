"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course } from "@/types/course";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = createClient();
  const user = useUserStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user?.id)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("코스를 불러올 수 없어요");
        setCourses(data ?? []);
        setLoading(false);
      });
  }, [user?.id]);

  async function handleDeleteCourse(courseId: string) {
    if (!confirm("코스를 삭제할까요?")) return;
    await supabase.from("courses").delete().eq("id", courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }

  return (
    <main className="flex flex-col min-h-full">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-[22px] font-bold">내 코스</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-[14px] hover:text-black"
        >
          뒤로 가기
        </button>
      </div>

      {/* 목록 */}
      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-200 rounded-2xl animate-pulse"
            />
          ))
        ) : error ? (
          <p className="text-gray-400 text-center py-10">{error}</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-center py-10">
            등록된 코스가 없어요
          </p>
        ) : (
          courses.map((course) => (
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
    </main>
  );
}
