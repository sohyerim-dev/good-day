"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [show, setShow] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const ios = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    if (ios) {
      setIsIOS(true);
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!show) return null;

  async function handleInstall() {
    if (!deferredPrompt) return;
    (deferredPrompt as any).prompt();
    const { outcome } = await (deferredPrompt as any).userChoice;
    if (outcome === "accepted") setShow(false);
  }

  return (
    <div className="w-full bg-gray-50 rounded-2xl px-5 py-4 mt-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-medium text-gray-700">홈 화면에 추가하기</p>
        <p className="text-[11px] text-gray-400">앱처럼 빠르게 열 수 있어요</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isIOS ? (
          <>
            <button
              onClick={() => setShowIOSGuide((v) => !v)}
              className="text-[12px] text-white bg-[#EE6300] rounded-xl px-3 py-1.5"
            >
              방법 보기
            </button>
          </>
        ) : (
          <button
            onClick={handleInstall}
            className="text-[12px] text-white bg-[#EE6300] rounded-xl px-3 py-1.5"
          >
            추가하기
          </button>
        )}
        <button onClick={() => setShow(false)} className="text-gray-300 hover:text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {isIOS && showIOSGuide && (
        <div className="absolute left-4 right-4 mt-2 bg-white border border-gray-100 rounded-2xl shadow-lg p-4 z-10 flex flex-col gap-1.5 text-[13px] text-gray-600">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium">Safari에서 홈 화면에 추가하는 방법</p>
            <button onClick={() => setShowIOSGuide(false)} className="text-gray-300 hover:text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p>1. 하단 <b>공유 버튼</b>(□↑)을 탭해요</p>
          <p>2. <b>홈 화면에 추가</b>를 선택해요</p>
          <p>3. 오른쪽 위 <b>추가</b>를 탭하면 완료!</p>
        </div>
      )}
    </div>
  );
}
