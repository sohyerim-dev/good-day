"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

type Category = "all" | "place" | "course";

interface Post {
  id: string;
  title: string;
  category: "place" | "course";
  created_at: string;
  post_images: { url: string; order: number }[];
}

async function fetchPosts(): Promise<Post[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, category, created_at, post_images(url, order)")
    .order("created_at", { ascending: false });
  if (error) throw new Error("추천 글을 불러올 수 없어요");
  return data ?? [];
}

const CATEGORY_LABELS: Record<Category, string> = {
  all: "전체",
  place: "장소 추천",
  course: "코스 추천",
};

export default function Recommendations() {
  const user = useUserStore((state) => state.user);
  const isAdmin = user?.role === "admin";
  const [category, setCategory] = useState<Category>("all");
  const { data: posts = [], isLoading, isError } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });

  const filtered = category === "all" ? posts : posts.filter((p) => p.category === category);

  return (
    <main className="flex flex-col min-h-full pb-28 max-w-lg mx-auto w-full">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-bold">굿데이 추천</h1>
          {isAdmin && (
            <Link
              href="/recommendations/write"
              className="text-[13px] bg-[#EE6300] text-white rounded-xl px-3 py-1.5 hover:bg-[#d45700]"
            >
              글쓰기
            </Link>
          )}
        </div>
        <p className="text-[13px] text-gray-400 mt-1">
          굿데이가 추천하는 장소와 코스를 만나보세요.
        </p>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-2 px-4 pt-4">
        {(["all", "place", "course"] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-2xl text-[13px] font-medium cursor-pointer transition-colors ${
              category === cat
                ? "bg-[#EE6300] text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <ul className="p-4 flex flex-col gap-3">
        {isLoading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
          ))
        ) : isError ? (
          <p className="text-gray-400 text-center py-10">글을 불러올 수 없어요</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-10">아직 등록된 글이 없어요</p>
        ) : (
          filtered.map((post) => {
            const thumbnail = post.post_images
              ?.sort((a, b) => a.order - b.order)[0]?.url;
            return (
              <li key={post.id}>
                <Link
                  href={`/recommendations/${post.id}`}
                  className="group block bg-gray-50 rounded-2xl overflow-hidden"
                >
                  {thumbnail && (
                    <div
                      className="w-full bg-cover bg-center max-h-64"
                      style={{ backgroundImage: `url(${thumbnail})`, aspectRatio: "4/3" }}
                    />
                  )}
                  <div className="flex flex-col gap-1 p-4">
                    <span
                      className={`self-start text-[11px] font-medium px-2 py-0.5 rounded-full ${
                        post.category === "place"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-orange-100 text-[#EE6300]"
                      }`}
                    >
                      {post.category === "place" ? "장소" : "코스"}
                    </span>
                    <p className="font-bold text-[15px]">{post.title}</p>
                    <p className="text-[12px] text-gray-400">
                      {new Date(post.created_at).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}
