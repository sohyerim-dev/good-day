"use client";

import { NaverPlace } from "@/types/place";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";

interface Props {
  place: NaverPlace & { order: number };
  onRemove: () => void;
}

export default function SortablePlaceItem({ place, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: place.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 mb-2">
      <div className="flex items-center gap-2">
        {/* iOS Safari의 long-press 팝업(이미지 새탭 열기 등)을 차단하는 스타일 적용 */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab"
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitTouchCallout: "none", userSelect: "none" }}
        >
          {/* pointerEvents none: 터치 이벤트를 이미지가 아닌 부모 span이 받도록 처리 */}
          <Image src="/icons/drag.svg" alt="드래그" width={24} height={24} draggable={false} style={{ pointerEvents: "none" }} />
        </span>
        <span className="font-medium text-[14px]">
          <span className="text-[#EE6300] font-bold mr-1">{place.order}.</span>
          {place.title}
        </span>
      </div>
      <button
        onClick={onRemove}
        className="text-[12px] text-gray-400 border border-gray-300 rounded-xl px-2 py-1 cursor-pointer shrink-0"
      >
        삭제
      </button>
    </li>
  );
}
