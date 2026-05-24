"use client";

import Image from "next/image";
import { useState } from "react";

const STEPS = [
  {
    step: 1,
    title: "장소 검색",
    desc: "가고 싶은 장소를 검색하고 코스에 추가합니다.\n여행지, 맛집, 카페 등 원하는 장소를 한 곳에 모아 여행 계획을 시작할 수 있습니다.",
    images: ["1-search-places.png"],
  },
  {
    step: 2,
    title: "코스 구성",
    desc: "드래그 앤 드롭으로 장소 순서를 변경하며 여행 동선을 정리합니다.\n이동 흐름을 고려해 효율적인 코스를 구성할 수 있습니다.",
    images: ["2-make-course.png"],
  },
  {
    step: 3,
    title: "이동 경로 확인",
    desc: "도보 및 대중교통 경로와 이동 정보를 확인할 수 있습니다.\n장소 간 이동 시간을 고려하며 실제 여행 동선에 맞게 계획할 수 있습니다.",
    images: ["3-course-detail.png", "4-walk-route.png", "5-transit-route.png"],
  },
  {
    step: 4,
    title: "친구와 공유 및 공동 편집",
    desc: "코스를 친구에게 공유하고 함께 수정할 수 있습니다.\n여행 일정을 함께 조율하며 하나의 코스를 완성할 수 있습니다.",
    images: ["6-invite-friend.png", "7-together-edit.png"],
  },
  {
    step: 5,
    title: "다른 사용자 코스 탐색",
    desc: "인기 코스와 원하는 지역의 코스를 탐색하고 북마크할 수 있습니다.\n다른 사용자의 여행 동선을 참고하며 새로운 장소를 발견할 수 있습니다.",
    images: ["8-hot-course.png", "9-explore.png"],
  },
];

export default function UserFlowSlider() {
  const [current, setCurrent] = useState(0);
  const item = STEPS[current];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* 슬라이드 카드 */}
      <div className="w-full bg-gray-50 rounded-2xl p-5 flex flex-col items-center gap-4 text-center">
        <p className="text-[16px] font-bold text-[#EE6300]">{item.step}. {item.title}</p>
        <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">{item.desc}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          {item.images.map((img) => (
            <Image
              key={img}
              src={`/screenshots/${img}`}
              alt={item.title}
              width={320}
              height={640}
              className="rounded-xl object-contain"
            />
          ))}
        </div>
      </div>

      {/* 이전/다음 버튼 */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-[13px] text-gray-600 disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          이전
        </button>
        <span className="text-[13px] text-gray-400">{current + 1} / {STEPS.length}</span>
        <button
          onClick={() => setCurrent((c) => Math.min(STEPS.length - 1, c + 1))}
          disabled={current === STEPS.length - 1}
          className="px-4 py-2 rounded-2xl bg-white border border-gray-200 text-[13px] text-gray-600 disabled:opacity-30 cursor-pointer disabled:cursor-default"
        >
          다음
        </button>
      </div>

      {/* 도트 인디케이터 */}
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full cursor-pointer transition-colors ${
              i === current ? "bg-[#EE6300]" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
