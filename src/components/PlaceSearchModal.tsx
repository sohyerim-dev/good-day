"use client";

import Image from "next/image";
import { useState } from "react";

interface PlaceItem {
  title: string;
  category: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

interface PlaceSearchModalProps {
  onClose: () => void;
  onSelect: (place: PlaceItem) => void;
}

export default function PlaceSearchModal({
  onClose,
  onSelect,
}: PlaceSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(
      `/api/place/search?query=${encodeURIComponent(query)}`,
    );
    const data = await res.json();
    setResults(data.items || []);
    setLoading(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  }

  // 네이버 API가 <b> 태그를 포함해서 반환하므로 제거
  function stripHtml(html: string) {
    return html.replace(/<[^>]*>/g, "");
  }

  // "카페,디저트>베이커리" → "베이커리"
  function getSubCategory(category: string) {
    const parts = category.split(">");
    return parts[parts.length - 1];
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center px-4 py-4">
          <h2 className="text-[16px] font-semibold">장소 검색</h2>
          <button onClick={onClose} aria-label="닫기">
            <Image src="/icons/x.svg" alt="" width={20} height={20} />
          </button>
        </div>

        {/* 검색 입력 */}
        <div className="flex gap-2 px-4 pb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="장소명을 입력해주세요"
            className="flex-1 border rounded-lg px-3 py-2 text-[14px] outline-none"
            autoFocus
          />
          <button
            onClick={handleSearch}
            className="bg-[#161616] text-white text-[14px] px-4 rounded-lg"
          >
            검색
          </button>
        </div>

        {/* 검색 결과 */}
        <div className="overflow-y-auto px-4 pb-6">
          {loading && (
            <p className="text-center text-[14px] text-gray-400 py-4">
              검색 중...
            </p>
          )}

          {!loading && results.length === 0 && query && (
            <p className="text-center text-[14px] text-gray-400 py-4">
              검색 결과가 없습니다
            </p>
          )}

          {results.map((item, i) => (
            <button
              key={i}
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50"
            >
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-medium">
                  {stripHtml(item.title)}
                </p>
                {item.category && (
                  <span className="text-[12px] text-gray-400">
                    {getSubCategory(item.category)}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-500 mt-1">
                {item.roadAddress || item.address}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
