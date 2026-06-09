"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { useState } from "react";

const REASONS = ["부적절한 내용", "개인정보 포함", "스팸/광고", "기타"];

interface Props {
  targetType: "course" | "place_photo";
  targetId: string;
  onClose: () => void;
}

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const user = useUserStore((s) => s.user);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!user || !reason) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
    });
    setDone(true);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full bg-white rounded-t-3xl p-6 pb-10">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="font-medium text-[16px]">신고가 접수됐어요</p>
            <p className="text-[13px] text-gray-400 text-center">검토 후 조치할게요. 신고해 주셔서 감사해요.</p>
            <button onClick={onClose} className="mt-2 bg-[#EE6300] text-white rounded-2xl px-8 py-3 text-[14px] font-medium cursor-pointer">
              확인
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-[16px]">신고 사유</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-black text-[13px] cursor-pointer">닫기</button>
            </div>
            <div className="flex flex-col gap-2 mb-5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-left px-4 py-3 rounded-2xl text-[14px] border cursor-pointer ${
                    reason === r ? "border-[#EE6300] text-[#EE6300] bg-orange-50" : "border-gray-200 text-gray-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              className="w-full bg-[#EE6300] text-white rounded-2xl py-4 text-[14px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "제출 중..." : "신고하기"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
