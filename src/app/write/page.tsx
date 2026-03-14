"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import PlaceSearchModal from "@/components/PlaceSearchModal";
import { createClient } from "@/lib/supabase/client";

export default function WritePage() {
  const supabase = createClient();
  const router = useRouter();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [place, setPlace] = useState<{
    title: string;
    category: string;
    address: string;
    mapx: string;
    mapy: string;
  } | null>(null);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  function handleImageAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newImages = Array.from(files).map(
      // 선택한 이미지 파일을 브라우저 메모리에 임시 URL로 만들어주는 메서드
      (file) => ({ file, preview: URL.createObjectURL(file) }),
    );
    setImages((prev) => [...prev, ...newImages]);
  }

  function handleImageRemove(index: number) {
    // 배열에서 삭제할 이미지를 빼고 나머지를 반환
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // 글자가 완성되지 않은 상태에서 Enter 방지
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      // 중복 태그 방지
      if (!tags.includes(tagInput.trim())) {
        setTags((prev) => [...prev, tagInput.trim()]);
      }
      setTagInput("");
    }
  }

  function handleTagRemove(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSubmit() {
    if (!place) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return; // 로그인 안 되어있으면 중단

    // 장소 저장
    // 같은 장소가 이미 있는지 먼저 확인
    const lat = Number(place.mapy) / 1e7;
    const lng = Number(place.mapx) / 1e7;

    const { data: existingPlace } = await supabase
      .from("places")
      .select("id, lat, lng")
      .eq("name", place.title)
      .eq("address", place.address)
      .single();

    let placeId: string;

    if (existingPlace) {
      placeId = existingPlace.id;
      // 좌표가 없으면 업데이트
      if (existingPlace.lat === 0 && existingPlace.lng === 0) {
        await supabase
          .from("places")
          .update({ lat, lng, category: place.category })
          .eq("id", existingPlace.id);
      }
    } else {
      const { data: newPlace } = await supabase
        .from("places")
        .insert({
          name: place.title,
          address: place.address,
          category: place.category,
          lat,
          lng,
        })
        .select()
        .single();

      placeId = newPlace!.id;
    }

    // 게시글 저장

    const { data: post } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        place_id: placeId,
        content: contentRef.current?.value || "",
      })
      .select()
      .single();
    if (!post) return;

    // 이미지 저장
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const filePath = `${user.id}/${post.id}/${i}`;

      // Storage에 업로드
      await supabase.storage.from("post-images").upload(filePath, image.file);

      // public URL 가져오기
      const { data: urlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(filePath);

      // post_images 테이블에 저장
      await supabase
        .from("post_images")
        .insert({ post_id: post.id, image_url: urlData.publicUrl, order: i });
    }

    // 태그 저장
    if (tags.length > 0) {
      await supabase
        .from("tags")
        .insert(tags.map((tag) => ({ post_id: post.id, name: tag })));
    }

    // 완료 후 홈으로 이동
    router.push("/");
  }
  return (
    <div className="min-h-svh bg-white">
      {/* 상단바 */}
      <header className="fixed top-0 left-0 right-0 bg-white z-10 border-b border-gray-100">
        <div className="flex justify-between items-center h-14 px-4">
          <button onClick={() => router.back()} aria-label="뒤로가기">
            <Image src="/icons/arrow-left.svg" alt="" width={24} height={24} />
          </button>
          <h1 className="text-[16px] font-semibold">글쓰기</h1>
          <button
            className="text-[14px] font-semibold text-[#ee6300] cursor-pointer"
            onClick={handleSubmit}
          >
            등록
          </button>
        </div>
      </header>

      <main className="pt-14 px-4 pb-10">
        {/* 사진 선택 */}
        <section className="py-4">
          <div className="flex gap-3 overflow-x-auto">
            {/* 사진 추가 버튼 */}
            <label className="w-20 h-20 rounded-lg border-2 border-dashed my-2 border-gray-300 flex flex-col items-center justify-center shrink-0 cursor-pointer">
              <Image src="/icons/camera.svg" alt="" width={24} height={24} />
              <span className="text-[12px] text-gray-400 mt-1">
                {images.length}/10
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageAdd}
              />
            </label>

            {/* 미리보기 */}
            {images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 shrink-0 my-2">
                <img
                  src={img.preview}
                  alt={`선택한 사진 ${i + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  onClick={() => handleImageRemove(i)}
                  className="absolute top-1 right-1 w-4 h-4 bg-white/60 rounded-full text-white text-[12px] flex items-center justify-center"
                  aria-label="사진 삭제"
                >
                  <Image src="/icons/x.svg" alt="" width={12} height={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 본문 입력 */}
        <section className="py-4 border-t border-gray-100">
          <textarea
            ref={contentRef}
            placeholder="내용을 입력해주세요..."
            className="w-full h-40 resize-none text-[14px] leading-relaxed outline-none"
          />
        </section>

        {/* 장소 선택 */}
        <section className="py-4 border-t border-gray-100">
          <button
            onClick={() => setShowPlaceModal(true)}
            className="flex items-center gap-2 w-full"
          >
            <Image src="/icons/place.svg" alt="" width={16} height={22} />
            <span
              className={`text-[14px] ${place ? "text-black" : "text-gray-400"}`}
            >
              {place ? place.title : "장소를 선택해주세요"}
            </span>
          </button>
        </section>

        {/* 태그 입력 */}
        <section className="py-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-[12px] border rounded-full px-3 py-1"
              >
                #{tag}
                <button
                  onClick={() => handleTagRemove(tag)}
                  className="text-gray-400 ml-1"
                  aria-label={`${tag} 태그 삭제`}
                >
                  <Image src="/icons/x.svg" alt="" width={10} height={10} />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="태그를 입력 후 Enter (예: 카페)"
            className="w-full text-[14px] outline-none"
          />
        </section>
      </main>

      {showPlaceModal && (
        <PlaceSearchModal
          onClose={() => setShowPlaceModal(false)}
          onSelect={(item) => {
            setPlace({
              title: item.title.replace(/<[^>]*>/g, ""),
              category: item.category.split(">").pop()?.trim() || item.category,
              address: item.roadAddress || item.address,
              mapx: item.mapx,
              mapy: item.mapy,
            });
            setShowPlaceModal(false);
          }}
        />
      )}
    </div>
  );
}
