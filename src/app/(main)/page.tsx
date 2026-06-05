"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course } from "@/types/course";
import InstallPrompt from "@/components/InstallPrompt";

type CourseWithCollab = Course & { collabLabel: string };
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const PAGE_SIZE = 5;

interface RecoPost {
  id: string;
  title: string;
  category: "place" | "course";
  post_images: { url: string; order: number }[];
}

export default function Home() {
  const user = useUserStore((state) => state.user);
  const hasHydrated = useUserStore((state) => state.hasHydrated);
  const [courses, setCourses] = useState<CourseWithCollab[]>([]);
  const [page, setPage] = useState(1);
  const [recoPosts, setRecoPosts] = useState<RecoPost[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("posts")
      .select("id, title, category, post_images(url, order)")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setRecoPosts(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    async function load() {
      const [{ data: owned }, { data: myCollabs }] = await Promise.all([
        supabase.from("courses").select("*").eq("user_id", user!.id).eq("is_hidden", false).order("created_at", { ascending: false }),
        supabase.from("course_collaborators").select("course_id").eq("user_id", user!.id),
      ]);

      const collabCourseIds = myCollabs?.map((c) => c.course_id) ?? [];

      const [ownedWithInfo, collabResult] = await Promise.all([
        Promise.all(
          (owned ?? []).map(async (course) => {
            const { data: collabs } = await supabase.from("course_collaborators").select("user_id").eq("course_id", course.id);
            if (!collabs || collabs.length === 0) return { ...course, collabLabel: "" };
            const { data: profiles } = await supabase.from("profiles").select("username").in("id", collabs.map((c) => c.user_id));
            const names = profiles?.map((p) => p.username).join(", ") ?? "";
            return { ...course, collabLabel: names ? `공동 편집 중 : ${names}` : "" };
          })
        ),
        collabCourseIds.length > 0
          ? supabase.from("courses").select("*").in("id", collabCourseIds).order("created_at", { ascending: false })
          : Promise.resolve({ data: [] as Course[] }),
      ]);

      const collabWithInfo: CourseWithCollab[] = await Promise.all(
        ((collabResult as { data: Course[] }).data ?? []).map(async (course) => {
          const { data: profile } = await supabase.from("profiles").select("username").eq("id", course.user_id).single();
          return { ...course, collabLabel: `공동 편집 중 : ${profile?.username ?? ""}` };
        })
      );

      setCourses([...ownedWithInfo, ...collabWithInfo]);
    }

    load();
  }, [user]);
  const totalPages = Math.ceil(courses.length / PAGE_SIZE);
  const paginated = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (!hasHydrated) return (
    <main className="flex items-center justify-center min-h-full">
      <Image src="/images/logo.svg" width={65} height={89.5} alt="굿데이" />
    </main>
  );

  if (!user) {
    return (
      <main className="p-4 flex flex-col items-center relative">
        <h1 className="sr-only">메인 페이지</h1>
        <Image src="/images/logo.svg" width={65} height={89.5} alt="굿데이" className="mb-2" />
        <Link href="/about" className="text-[13px] text-gray-400 border border-gray-200 rounded-2xl px-3 py-1.5 hover:border-[#EE6300] hover:text-[#EE6300] mb-4 self-start">
          굿데이 소개
        </Link>
        {recoPosts.length > 0 && (
          <div className="w-full mt-8 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-[17px]">굿데이 추천 장소&코스</h2>
              <Link href="/recommendations" className="text-[12px] text-gray-400 hover:text-[#EE6300]">더보기</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto md:overflow-visible md:grid md:grid-cols-4 scrollbar-hide w-full pb-1">
              {recoPosts.map((post) => {
                const thumbnail = post.post_images?.sort((a, b) => a.order - b.order)[0]?.url;
                return (
                  <Link key={post.id} href={`/recommendations/${post.id}`} className="shrink-0 w-32 md:w-auto flex flex-col gap-1">
                    <div className="w-full rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
                      {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <p className="text-[12px] md:text-[14px] font-medium line-clamp-2 leading-snug">{post.title}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <div className="w-full bg-gray-50 rounded-2xl px-5 py-8 mt-4 flex flex-col items-center gap-3 text-center">
          <p className="font-bold text-[18px]">나만의 놀기 코스 플래너</p>
          <p className="text-gray-400 text-[14px] leading-relaxed">
            장소를 추가하고 순서를 정하면<br />여행 코스가 완성돼요.
          </p>
          <Link
            href="/login"
            className="mt-2 bg-[#EE6300] text-white text-[15px] font-medium rounded-2xl px-6 py-3 w-full text-center"
          >
            로그인하고 시작하기
          </Link>
        </div>
        <InstallPrompt />
      </main>
    );
  }

  return (
    <main className="p-4 flex flex-col items-center relative">
      <h1 className="sr-only">메인 페이지</h1>
      <Image
        src="/images/logo.svg"
        width={65}
        height={89.5}
        alt="굿데이"
        className="mb-2"
      />
      <div className="flex justify-between items-center w-full mb-4">
        <Link href="/about" className="text-[13px] text-gray-400 border border-gray-200 rounded-2xl px-3 py-1.5 hover:border-[#EE6300] hover:text-[#EE6300]">
          굿데이 소개
        </Link>
        <Link
          href="/create"
          className="bg-[#EE6300] text-white text-[14px] rounded-2xl px-4 py-2 cursor-pointer border border-[#EE6300] hover:bg-white hover:text-[#EE6300]"
        >
          + 코스 추가하기
        </Link>
      </div>
      <div className="w-full bg-gray-50 rounded-2xl px-5 py-4 mb-4 text-center">
        <p className="text-gray-500 text-[14px] font-medium">나만의 코스를 만들어보세요</p>
        <p className="text-gray-400 text-[12px] mt-1">
          장소를 추가하고 순서를 정하면 여행 코스가 완성돼요.
        </p>
      </div>
      <InstallPrompt />

      {recoPosts.length > 0 && (
        <div className="w-full mt-6 mb-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-[17px]">굿데이 추천 장소&코스</h2>
            <Link href="/recommendations" className="text-[12px] text-gray-400 hover:text-[#EE6300]">더보기</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide w-full pb-1">
            {recoPosts.map((post) => {
              const thumbnail = post.post_images?.sort((a, b) => a.order - b.order)[0]?.url;
              return (
                <Link key={post.id} href={`/recommendations/${post.id}`} className="shrink-0 w-32 flex flex-col gap-1">
                  <div className="w-full rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: "4/3" }}>
                    {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <p className="text-[12px] font-medium line-clamp-2 leading-snug">{post.title}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      <h2 className="font-bold text-[18px] mb-3 mt-4 self-start">나의 코스</h2>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center w-full justify-center bg-gray-50 rounded-2xl p-10 gap-2">
          <p className="text-gray-400 text-[14px]">아직 등록한 코스가 없어요.</p>
          <Link
            href="/create"
            className="text-[#EE6300] text-[14px] font-medium"
          >
            첫 코스 만들기
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3 w-full">
            {paginated.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/courses/${course.id}`}
                  className="group flex items-center justify-between bg-gray-50 rounded-2xl p-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1 flex-row items-center">
                      <Image
                        src="/icons/orange-route.svg"
                        width={20}
                        height={20}
                        alt=""
                      />
                      <span className="font-medium">{course.title}</span>
                    </div>
                    {course.collabLabel && (
                      <span className="text-[11px] text-[#EE6300] pl-6">{course.collabLabel}</span>
                    )}
                    {course.description && (
                      <span className="text-[12px] text-gray-400 pl-6">
                        {course.description}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-300 group-hover:text-[#EE6300] text-[18px]">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-chevron-right-icon lucide-chevron-right"
                    >
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
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
        </>
      )}
    </main>
  );
}
