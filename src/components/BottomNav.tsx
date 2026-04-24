"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: "/icons/home.svg" },
  { href: "/hot", label: "인기코스", icon: "/icons/hot.svg" },
  { href: "/explore", label: "탐색", icon: "/icons/explore.svg" },
  { href: "/my-course", label: "마이코스", icon: "/icons/route.svg" },
];
export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100">
      <ul className="flex justify-around items-center h-20 bg-[#FAFBFF]">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-1 text-[12px] ${isActive ? "text-[#EE6300]" : "text-[#70758D]"}`}
              >
                <Image
                  src={item.icon}
                  alt=""
                  width={25}
                  height={25}
                  style={
                    isActive
                      ? {
                          filter:
                            "brightness(0) saturate(100%) invert(38%) sepia(93%) saturate(1352%) hue-rotate(11deg) brightness(97%) contrast(100%)",
                        }
                      : undefined
                  }
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
