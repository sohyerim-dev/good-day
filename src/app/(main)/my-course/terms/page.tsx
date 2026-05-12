"use client";

import {
  PRIVACY_POLICY,
  TERMS_OF_SERVICE,
} from "@/components/ui/Terms";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="flex flex-col min-h-full">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-[22px] font-bold">이용약관</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-[14px] cursor-pointer hover:text-black"
        >
          뒤로 가기
        </button>
      </div>

      <div className="p-4 flex flex-col gap-6 pb-24">
        <section>
          <h2 className="font-bold text-[16px] mb-3">이용약관</h2>
          <div className="bg-gray-50 rounded-2xl p-4 text-[13px] text-gray-600 whitespace-pre-line leading-6">
            {TERMS_OF_SERVICE}
          </div>
        </section>

        <section>
          <h2 className="font-bold text-[16px] mb-3">개인정보처리방침</h2>
          <div className="bg-gray-50 rounded-2xl p-4 text-[13px] text-gray-600 whitespace-pre-line leading-6">
            {PRIVACY_POLICY}
          </div>
        </section>
      </div>
    </main>
  );
}
