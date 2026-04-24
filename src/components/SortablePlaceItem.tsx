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
    <li
      ref={setNodeRef}
      style={style}
      className="flex flex-row py-5 w-full items-center justify-between"
    >
      <div className="flex flex-row items-center">
        <span {...attributes} {...listeners} className="cursor-grab mr-2">
          <Image src="/icons/drag.svg" alt="드래그" width={30} height={30} />
        </span>
        <span className="mr-2 font-medium">
          {place.order}. {place.title}
        </span>
      </div>
      <button onClick={onRemove}>삭제</button>
    </li>
  );
}
