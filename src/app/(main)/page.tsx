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
    <main className="p-4 flex-col flex items-center">
      <h1 className="sr-only">메인 페이지</h1>
      <Image
        src="/images/logo.svg"
        width={65}
        height={89.5}
        alt="굿데이"
        className="mb-10"
      />
      <Link
        href="/create"
        className="hover:cursor-pointer hover:bg-white hover:text-[#EE6300] border-[#ee6300] border hover:border hover:border-[#EE6300] focus:outline-amber-950 cursor-pointer rounded-2xl p-5 mb-5 text-center w-full text-[18px] bg-[#EE6300] text-white block"
      >
        코스 추가하기
      </Link>
      {courses.length === 0 ? (
        <p className="rounded-2xl border-dashed bg-gray-200 border-gray-400 border-2 p-5 w-full text-center text-[18px]">
          아직 등록한 코스가 없어요.
        </p>
      ) : (
        <ul className="rounded-2xl bg-gray-200 p-5 w-full text-center  text-[18px]">
          {courses.map((course) => (
            <li key={course.id}>{course.title}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
