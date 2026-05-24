"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course } from "@/types/course";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PAGE_SIZE = 5;

type CourseWithCollab = Course & { isOwner: boolean; collabLabel: string };

export default function Courses() {
  const [courses, setCourses] = useState<CourseWithCollab[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const supabase = createClient();
  const user = useUserStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;

    async function load() {
      const [{ data: owned }, { data: myCollabs }] = await Promise.all([
        supabase.from("courses").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("course_collaborators").select("course_id").eq("user_id", user!.id),
      ]);

      const collabCourseIds = myCollabs?.map((c) => c.course_id) ?? [];

      const [ownedWithInfo, collabCourses] = await Promise.all([
        Promise.all(
          (owned ?? []).map(async (course) => {
            const { data: collabs } = await supabase
              .from("course_collaborators")
              .select("user_id")
              .eq("course_id", course.id);
            if (!collabs || collabs.length === 0) return { ...course, isOwner: true, collabLabel: "" };
            const { data: profiles } = await supabase
              .from("profiles")
              .select("username")
              .in("id", collabs.map((c) => c.user_id));
            const names = profiles?.map((p) => p.username).join(", ") ?? "";
            return { ...course, isOwner: true, collabLabel: names ? `공동 편집 중 : ${names}` : "" };
          })
        ),
        collabCourseIds.length > 0
          ? supabase.from("courses").select("*").in("id", collabCourseIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as Course[] }),
      ]);

      const collabWithInfo: CourseWithCollab[] = await Promise.all(
        ((collabCourses as { data: Course[] }).data ?? []).map(async (course) => {
          const { data: profile } = await supabase.from("profiles").select("username").eq("id", course.user_id).single();
          return { ...course, isOwner: false, collabLabel: `공동 편집 중 : ${profile?.username ?? ""}` };
        })
      );

      setCourses([...ownedWithInfo, ...collabWithInfo]);
      setLoading(false);
    }

    load().catch(() => { setError("코스를 불러올 수 없어요"); setLoading(false); });
  }, [user?.id]);

  async function handleDeleteCourse(courseId: string) {
    if (!confirm("코스를 삭제할까요?")) return;
    await supabase.from("courses").delete().eq("id", courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }

  const totalPages = Math.ceil(courses.length / PAGE_SIZE);
  const paginated = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <main className="flex flex-col min-h-full">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-[22px] font-bold">내 코스</h1>
        <button onClick={() => router.back()} className="text-gray-400 text-[14px] cursor-pointer hover:text-black">
          뒤로 가기
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse" />)
        ) : error ? (
          <p className="text-gray-400 text-center py-10">{error}</p>
        ) : courses.length === 0 ? (
          <p className="text-gray-400 text-center py-10">등록된 코스가 없어요</p>
        ) : (
          paginated.map((course) => (
            <div key={course.id} className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
              <Link href={`/courses/${course.id}`} className="flex flex-col gap-1 flex-1">
                <p className="font-medium">{course.title}</p>
                {course.collabLabel && (
                  <p className="text-[11px] text-[#EE6300]">{course.collabLabel}</p>
                )}
                {course.description && (
                  <p className="text-[12px] text-gray-400">{course.description}</p>
                )}
              </Link>
              {course.isOwner && (
                <button
                  onClick={() => handleDeleteCourse(course.id)}
                  className="text-[12px] text-red-400 border cursor-pointer hover:bg-red-400 hover:text-white border-red-300 rounded-xl px-2 py-1 shrink-0 ml-3"
                >
                  삭제
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 py-4 pb-28">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default">이전</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-xl text-[13px] font-medium cursor-pointer ${p === page ? "bg-[#EE6300] text-white" : "bg-gray-100 text-gray-500"}`}>{p}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-xl text-[13px] bg-gray-100 text-gray-500 disabled:opacity-30 cursor-pointer disabled:cursor-default">다음</button>
        </div>
      )}
    </main>
  );
}
