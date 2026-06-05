"use client";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MyCourse() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const supabase = createClient();
  const router = useRouter();

  async function handleUsernameUpdate() {
    if (!editUsername.trim()) { setUsernameError("닉네임을 입력해주세요."); return; }
    if (!/^[a-zA-Z0-9가-힣]+$/.test(editUsername)) {
      setUsernameError("한글, 영어, 숫자만 사용할 수 있어요. (공백 불가)");
      return;
    }
    setUsernameError("");
    await supabase
      .from("profiles")
      .update({ username: editUsername })
      .eq("id", user?.id);
    setUser({ ...user!, username: editUsername });
    setIsEditing(false);
  }

  async function handlePasswordUpdate() {
    if (newPassword.length < 8) { setPasswordError("비밀번호는 8자 이상이어야 해요."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("비밀번호가 일치하지 않아요."); return; }
    setPasswordError("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPasswordError(error.message); return; }
    setIsChangingPassword(false);
    setNewPassword("");
    setConfirmPassword("");
    alert("비밀번호가 변경됐어요.");
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
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <input
                  value={editUsername}
                  onChange={(e) => { setEditUsername(e.target.value); setUsernameError(""); }}
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
              {usernameError && <p className="text-[12px] text-red-400">{usernameError}</p>}
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
          {isChangingPassword ? (
            <div className="flex flex-col gap-1 mt-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(""); }}
                placeholder="새 비밀번호 (8자 이상)"
                autoFocus
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") handlePasswordUpdate(); }}
                placeholder="비밀번호 확인"
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
              />
              {passwordError && <p className="text-[12px] text-red-400">{passwordError}</p>}
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handlePasswordUpdate}
                  className="text-[12px] bg-[#EE6300] text-white rounded-xl px-3 py-1.5 cursor-pointer"
                >
                  변경
                </button>
                <button
                  onClick={() => { setIsChangingPassword(false); setNewPassword(""); setConfirmPassword(""); setPasswordError(""); }}
                  className="text-[12px] text-gray-400 border border-gray-200 rounded-xl px-3 py-1.5 cursor-pointer"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="mt-2 text-[12px] text-gray-400 hover:text-[#EE6300] cursor-pointer text-left"
            >
              비밀번호 변경
            </button>
          )}
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
        {/* 로그아웃 */}
        <div className="p-4 border-t border-gray-100 flex flex-col gap-2">
          <button
            onClick={handleLogout}
            className="text-left text-[14px] text-gray-500 cursor-pointer py-2 hover:text-black"
          >
            로그아웃
          </button>
        </div>

        {/* 개발자 정보 */}
        <div className="px-4 pb-24 pt-4 border-t border-gray-100">
          <h2 className="text-[16px] font-bold mb-3">개발자 정보</h2>
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
            <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
              Developer
            </p>
            <p className="font-bold text-[15px]">소혜림</p>
            <p className="text-[12px] text-gray-400">
              굿데이 서비스 기획 및 개발
            </p>
            <div className="flex flex-col gap-1.5 mt-1">
              <a
                href="mailto:musik91@naver.com"
                className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#EE6300]"
              >
                <Image
                  src="/icons/mail.svg"
                  alt=""
                  width={14}
                  height={14}
                  className="opacity-40"
                />
                musik91@naver.com
              </a>
              <a
                href="https://sohyerim.kr/"
                target="_blank"
                className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#EE6300]"
              >
                <Image
                  src="/icons/link.svg"
                  alt=""
                  width={14}
                  height={14}
                  className="opacity-40"
                />
                sohyerim.kr
              </a>
              <a
                href="https://github.com/sohyerim-dev"
                target="_blank"
                className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#EE6300]"
              >
                <Image
                  src="/icons/link.svg"
                  alt=""
                  width={14}
                  height={14}
                  className="opacity-40"
                />
                github.com/sohyerim-dev
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
