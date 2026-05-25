"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { PlaceCollection, SavedPlace } from "@/types/place";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function SavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [collections, setCollections] = useState<PlaceCollection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | null>(null); // null = 전체
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 폴더 추가 모달
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // 장소 이동 모달
  const [movingPlace, setMovingPlace] = useState<SavedPlace | null>(null);

  // 폴더 이름 수정
  const [editingCollection, setEditingCollection] = useState<PlaceCollection | null>(null);
  const [editingName, setEditingName] = useState("");

  const supabase = createClient();
  const user = useUserStore((state) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase.from("saved_places").select("*, places(*)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("collections").select("*").eq("user_id", user.id).order("created_at"),
    ]).then(([{ data: sp, error: spErr }, { data: cols }]) => {
      if (spErr) setError("장소를 불러올 수 없어요");
      setPlaces(
        sp?.map((d) => ({ ...d.places, collection_id: d.collection_id })) ?? [],
      );
      setCollections(cols ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  const filtered =
    activeCollection === null
      ? places
      : activeCollection === "__none__"
        ? places.filter((p) => !p.collection_id)
        : places.filter((p) => p.collection_id === activeCollection);

  async function handleDeletePlace(placeId: string) {
    if (!confirm("저장을 취소할까요?")) return;
    await supabase.from("saved_places").delete().eq("user_id", user?.id).eq("place_id", placeId);
    setPlaces((prev) => prev.filter((p) => p.id !== placeId));
  }

  async function handleCreateCollection() {
    if (!newFolderName.trim() || !user?.id) return;
    const { data } = await supabase
      .from("collections")
      .insert({ user_id: user.id, name: newFolderName.trim() })
      .select()
      .single();
    if (data) setCollections((prev) => [...prev, data]);
    setNewFolderName("");
    setShowNewFolder(false);
  }

  async function handleRenameCollection() {
    if (!editingCollection || !editingName.trim()) return;
    await supabase.from("collections").update({ name: editingName.trim() }).eq("id", editingCollection.id);
    setCollections((prev) =>
      prev.map((c) => (c.id === editingCollection.id ? { ...c, name: editingName.trim() } : c)),
    );
    setEditingCollection(null);
    setEditingName("");
  }

  async function handleDeleteCollection(col: PlaceCollection) {
    if (!confirm(`"${col.name}" 폴더를 삭제할까요? 장소는 삭제되지 않아요.`)) return;
    await supabase.from("collections").delete().eq("id", col.id);
    // collection_id가 이 폴더였던 saved_places를 null로 업데이트
    await supabase.from("saved_places").update({ collection_id: null }).eq("collection_id", col.id).eq("user_id", user?.id);
    setCollections((prev) => prev.filter((c) => c.id !== col.id));
    setPlaces((prev) =>
      prev.map((p) => (p.collection_id === col.id ? { ...p, collection_id: null } : p)),
    );
    if (activeCollection === col.id) setActiveCollection(null);
  }

  async function handleMovePlace(targetCollectionId: string | null) {
    if (!movingPlace || !user?.id) return;
    await supabase
      .from("saved_places")
      .update({ collection_id: targetCollectionId })
      .eq("place_id", movingPlace.id)
      .eq("user_id", user.id);
    setPlaces((prev) =>
      prev.map((p) =>
        p.id === movingPlace.id ? { ...p, collection_id: targetCollectionId } : p,
      ),
    );
    setMovingPlace(null);
  }

  return (
    <main className="flex flex-col min-h-full pb-28">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center">
        <h1 className="text-[22px] font-bold">저장된 장소</h1>
        <button
          onClick={() => router.back()}
          className="text-gray-400 text-[14px] cursor-pointer hover:text-black"
        >
          뒤로 가기
        </button>
      </div>

      {/* 폴더 탭 */}
      <div className="flex gap-2 px-4 pt-4 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveCollection(null)}
          className={`shrink-0 rounded-2xl px-4 py-1.5 text-[13px] font-medium border cursor-pointer ${
            activeCollection === null
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setActiveCollection("__none__")}
          className={`shrink-0 rounded-2xl px-4 py-1.5 text-[13px] font-medium border cursor-pointer ${
            activeCollection === "__none__"
              ? "bg-gray-800 text-white border-gray-800"
              : "bg-white text-gray-600 border-gray-200"
          }`}
        >
          미분류
        </button>
        {collections.map((col) => (
          <button
            key={col.id}
            onClick={() => setActiveCollection(col.id)}
            className={`shrink-0 rounded-2xl px-4 py-1.5 text-[13px] font-medium border cursor-pointer ${
              activeCollection === col.id
                ? "bg-[#EE6300] text-white border-[#EE6300]"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {col.name}
          </button>
        ))}
        <button
          onClick={() => setShowNewFolder(true)}
          className="shrink-0 rounded-2xl px-4 py-1.5 text-[13px] font-medium border border-dashed border-gray-300 text-gray-400 cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300]"
        >
          + 폴더 추가
        </button>
      </div>

      {/* 선택된 폴더 관리 버튼 (전체/미분류 제외) */}
      {activeCollection && activeCollection !== "__none__" && (
        <div className="flex gap-2 px-4 pt-2">
          {(() => {
            const col = collections.find((c) => c.id === activeCollection);
            if (!col) return null;
            return (
              <>
                <button
                  onClick={() => { setEditingCollection(col); setEditingName(col.name); }}
                  className="text-[12px] text-gray-400 border border-gray-200 rounded-xl px-3 py-1 cursor-pointer hover:text-[#EE6300] hover:border-[#EE6300]"
                >
                  이름 수정
                </button>
                <button
                  onClick={() => handleDeleteCollection(col)}
                  className="text-[12px] text-red-400 border border-red-200 rounded-xl px-3 py-1 cursor-pointer hover:bg-red-50"
                >
                  폴더 삭제
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* 장소 목록 */}
      <div className="p-4 flex flex-col gap-3">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-2xl animate-pulse" />
          ))
        ) : error ? (
          <p className="text-gray-400 text-center py-10">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-10">저장된 장소가 없어요</p>
        ) : (
          filtered.map((place) => (
            <div
              key={place.id}
              className="flex items-center justify-between bg-gray-50 rounded-2xl p-4"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <p className="font-medium">{place.name}</p>
                <p className="text-[12px] text-gray-400">{place.address}</p>
                {place.collection_id && (
                  <p className="text-[11px] text-[#EE6300]">
                    {collections.find((c) => c.id === place.collection_id)?.name}
                  </p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0 ml-3">
                <button
                  onClick={() => setMovingPlace(place)}
                  className="text-[12px] text-gray-500 border border-gray-200 rounded-xl px-2 py-1 cursor-pointer hover:border-[#EE6300] hover:text-[#EE6300]"
                >
                  이동
                </button>
                <button
                  onClick={() => handleDeletePlace(place.id)}
                  className="text-[12px] text-red-400 border border-red-300 rounded-xl px-2 py-1 cursor-pointer"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 폴더 추가 모달 */}
      {showNewFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-bold text-[16px]">새 폴더</h2>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateCollection(); }}
              placeholder="폴더 이름"
              className="bg-gray-50 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[14px] text-gray-500 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleCreateCollection}
                className="flex-1 py-2.5 rounded-xl bg-[#EE6300] text-white text-[14px] font-medium cursor-pointer"
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 폴더 이름 수정 모달 */}
      {editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="font-bold text-[16px]">폴더 이름 수정</h2>
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleRenameCollection(); }}
              className="bg-gray-50 rounded-xl px-4 py-3 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#EE6300]"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditingCollection(null); setEditingName(""); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[14px] text-gray-500 cursor-pointer"
              >
                취소
              </button>
              <button
                onClick={handleRenameCollection}
                className="flex-1 py-2.5 rounded-xl bg-[#EE6300] text-white text-[14px] font-medium cursor-pointer"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 장소 이동 모달 */}
      {movingPlace && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
              <h2 className="font-bold text-[16px]">{movingPlace.name} 이동</h2>
              <button onClick={() => setMovingPlace(null)} className="text-gray-400 cursor-pointer hover:text-black text-[14px]">닫기</button>
            </div>
            <button
              onClick={() => handleMovePlace(null)}
              className={`text-left px-4 py-3 rounded-2xl text-[14px] cursor-pointer ${
                !movingPlace.collection_id ? "bg-[#EE6300]/10 text-[#EE6300] font-medium" : "bg-gray-50 text-gray-700"
              }`}
            >
              미분류
              {!movingPlace.collection_id && <span className="ml-2 text-[12px]">현재</span>}
            </button>
            {collections.map((col) => (
              <button
                key={col.id}
                onClick={() => handleMovePlace(col.id)}
                className={`text-left px-4 py-3 rounded-2xl text-[14px] cursor-pointer ${
                  movingPlace.collection_id === col.id
                    ? "bg-[#EE6300]/10 text-[#EE6300] font-medium"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                {col.name}
                {movingPlace.collection_id === col.id && <span className="ml-2 text-[12px]">현재</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
