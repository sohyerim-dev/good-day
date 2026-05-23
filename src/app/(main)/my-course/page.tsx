"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function MyCourse() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const deleteInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const router = useRouter();

  async function handleUsernameUpdate() {
    await supabase
      .from("profiles")
      .update({ username: editUsername })
      .eq("id", user?.id);
    setUser({ ...user!, username: editUsername });
    setIsEditing(false);
  }

  async function handleDeleteAccount() {
    const { error } = await supabase.auth.signOut();
    if (error) return;

    await fetch("/api/delete-account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id }),
    });

    setUser(null);
    router.push("/login");
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/login");
  }

  return (
    <main className="flex flex-col min-h-full">
      {/* 유저 정보 */}
      <div className="p-4 border-b border-gray-100">
        <h1 className="text-[22px] font-bold">마이코스</h1>
        <p className="text-[13px] text-gray-400 mt-1 mb-3">
          내 취향대로 모은 코스와 장소를 확인해보세요.
        </p>
        <div className="bg-gray-50 rounded-2xl p-4">
          <p className="text-[12px] text-gray-400 mb-2">내 계정</p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
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
                {user?.username || "닉네임 없음"}
              </p>
              <button
                onClick={() => {
                  setEditUsername(user?.username ?? "");
                  setIsEditing(true);
                }}
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-chevron-right-icon lucide-chevron-right"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </Link>
        <Link
          href="/my-course/terms"
          className="group flex justify-between items-center bg-gray-50 rounded-2xl p-4"
        >
          <span className="font-medium">이용약관</span>
          <span className="text-gray-300 group-hover:text-[#EE6300]">
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
      </div>

      <div className="mt-auto">
        {/* 로그아웃 / 회원탈퇴 */}
        <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="text-left text-[14px] text-gray-500 cursor-pointer py-2 hover:text-black"
          >
            로그아웃
          </button>
          <button
            onClick={() => { setDeleteInput(""); setShowDeleteModal(true); setTimeout(() => deleteInputRef.current?.focus(), 50); }}
            className="text-left text-[14px] text-red-400 cursor-pointer py-2 hover:text-red-600"
          >
            회원탈퇴
          </button>
        </div>

        {/* 회원탈퇴 확인 모달 */}
        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          >
            <div
              className="bg-white rounded-xl mx-6 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-8 flex flex-col gap-4">
                <p className="text-[15px] font-semibold text-center">정말 탈퇴하시겠어요?</p>
                <p className="text-[13px] text-gray-400 text-center">
                  코스, 북마크 등 모든 데이터가 삭제되며 복구할 수 없어요.
                </p>
                {/* "탈퇴" 입력 확인 */}
                <input
                  ref={deleteInputRef}
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder='"탈퇴" 입력'
                  className="border border-gray-200 rounded-xl px-4 py-3 text-[14px] focus:outline-[#EE6300]"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteInput !== "탈퇴"}
                  className="w-full bg-red-500 text-white rounded-xl py-3 font-semibold text-[14px] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  탈퇴하기
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-[13px] text-gray-400 text-center hover:text-black"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
