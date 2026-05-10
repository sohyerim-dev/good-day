"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function MyCourse() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username ?? "");
  const supabase = createClient();
  const router = useRouter();

  async function handleUsernameUpdate() {
    await supabase.from("profiles").update({ username }).eq("id", user?.id);
    setUser({ ...user!, username });
    setIsEditing(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    if (user?.username) setUsername(user.username);
  }, [user?.username]);

  return (
    <main className="flex flex-col min-h-full pb-24">
      {/* 유저 정보 */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold mb-3">마이코스</h1>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[12px] text-gray-400 mb-2">내 계정</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUsernameUpdate();
                }}
                className="font-bold text-[18px] focus:outline-none border-b border-[#EE6300] bg-transparent"
                autoFocus
              />
              <button
                onClick={handleUsernameUpdate}
                className="text-[11px] text-white bg-[#EE6300] rounded-full px-2 py-0.5"
              >
                완료
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="font-bold text-[18px]">
                {username || "닉네임 없음"}
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="border hover:bg-white hover:text-[#EE6300] text-[11px] text-white bg-[#EE6300] rounded-full leading-4.75 px-2 py-0.5"
              >
                수정
              </button>
            </div>
          )}
          <p className="text-[13px] text-gray-400 mt-1">{user?.email}</p>
        </div>
      </div>

      {/* 메뉴 */}
      <div className="p-4 flex flex-col gap-3">
        <Link
          href="/my-course/courses"
          className="group flex justify-between items-center bg-gray-50 rounded-2xl p-4"
        >
          <span className="font-medium">내 코스</span>
          <span className="text-gray-300 group-hover:text-[#EE6300]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-chevron-right-icon lucide-chevron-right"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </Link>
        <Link
          href="/my-course/bookmarks"
          className="group flex justify-between items-center bg-gray-50 rounded-2xl p-4"
        >
          <span className="font-medium">북마크한 코스</span>
          <span className="text-gray-300 group-hover:text-[#EE6300]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-chevron-right-icon lucide-chevron-right"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </Link>
        <Link
          href="/my-course/saved-places"
          className="group flex justify-between items-center bg-gray-50 rounded-2xl p-4"
        >
          <span className="font-medium">저장된 장소</span>
          <span className="text-gray-300 group-hover:text-[#EE6300]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              className="lucide lucide-chevron-right-icon lucide-chevron-right"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </Link>
      </div>

      {/* 로그아웃 / 회원탈퇴 */}
      <div className="p-4 border-t border-gray-100 flex flex-col gap-2 mt-auto">
        <button
          onClick={handleLogout}
          className="text-left text-[14px] text-gray-500 cursor-pointer py-2 hover:text-black"
        >
          로그아웃
        </button>
      </div>
    </main>
  );
}
