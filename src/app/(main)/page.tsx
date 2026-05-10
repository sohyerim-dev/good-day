"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { Course } from "@/types/course";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const user = useUserStore((state) => state.user);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setCourses(data);
      });
  }, [user]);
  return (
    <main className="p-4 flex flex-col items-center">
      <h1 className="sr-only">메인 페이지</h1>
      <Image
        src="/images/logo.svg"
        width={65}
        height={89.5}
        alt="굿데이"
        className="mb-4"
      />
      <div className="flex justify-end w-full mb-4">
        <Link
          href="/create"
          className="bg-[#EE6300] text-white text-[14px] rounded-2xl px-4 py-2 cursor-pointer border border-[#EE6300] hover:bg-white hover:text-[#EE6300]"
        >
          + 코스 추가하기
        </Link>
      </div>

      <h2 className="font-bold text-[18px] mb-3 self-start">나의 코스</h2>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center w-full justify-center bg-gray-50 rounded-2xl p-10 gap-2">
          <p className="text-gray-400 text-[14px]">
            아직 등록한 코스가 없어요.
          </p>
          <Link
            href="/create"
            className="text-[#EE6300] text-[14px] font-medium"
          >
            첫 코스 만들기
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 w-full">
          {courses.map((course) => (
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
      )}
    </main>
  );
}
