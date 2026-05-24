"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";

export default function JoinCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [courseName, setCourseName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) { setError("유효하지 않은 초대 링크예요."); setLoading(false); return; }

    const supabase = createClient();
    supabase
      .from("courses")
      .select("title, user_id, invite_token, invite_token_expires_at")
      .eq("id", id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { setError("코스를 찾을 수 없어요."); setLoading(false); return; }
        if (data.invite_token !== token) { setError("유효하지 않은 초대 링크예요."); setLoading(false); return; }
        if (!data.invite_token_expires_at || new Date(data.invite_token_expires_at) < new Date()) {
          setError("초대 링크가 만료됐어요. 오너에게 새 링크를 요청해주세요."); setLoading(false); return;
        }
        setCourseName(data.title);
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", data.user_id)
          .single();
        setOwnerName(profile?.username ?? "");
        setLoading(false);
      });
  }, [id, token]);

  async function handleJoin() {
    setJoining(true);
    const res = await fetch(`/api/courses/${id}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error === "Token expired" ? "초대 링크가 만료됐어요." : "참여에 실패했어요.");
      setJoining(false);
      return;
    }
    router.push(`/courses/${id}/edit`);
  }

  if (loading) return (
    <main className="p-4 flex flex-col items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 border-4 border-[#EE6300] border-t-transparent rounded-full animate-spin" />
    </main>
  );

  if (error) return (
    <main className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <p className="text-gray-500 text-[15px] text-center">{error}</p>
      <button onClick={() => router.push("/")} className="text-[#EE6300] text-[14px]">홈으로</button>
    </main>
  );

  return (
    <main className="p-4 flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-full bg-gray-50 rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <p className="text-[13px] text-gray-400">{ownerName}님이 초대했어요</p>
        <p className="font-bold text-[20px]">{courseName}</p>
        <p className="text-[13px] text-gray-500">이 코스를 함께 편집할 수 있어요</p>
      </div>
      <button
        onClick={handleJoin}
        disabled={joining}
        className="w-full bg-[#EE6300] text-white text-[15px] font-medium rounded-2xl py-3 disabled:opacity-50"
      >
        {joining ? "참여 중..." : "공동 편집 참여하기"}
      </button>
      <button onClick={() => router.push("/")} className="text-[13px] text-gray-400 hover:text-black">
        취소
      </button>
    </main>
  );
}
