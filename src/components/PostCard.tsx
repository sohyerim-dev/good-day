"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface CommentWithProfile {
  id: string;
  content: string;
  created_at: string | null;
  profiles: { username: string; avatar_url: string | null } | null;
}

export interface PostWithRelations {
  id: string;
  user_id: string;
  content: string;
  created_at: string | null;
  profiles: { username: string; avatar_url: string | null } | null;
  places: { id: string; name: string } | null;
  post_images: { image_url: string; order: number }[];
  tags: { name: string }[];
  comments: CommentWithProfile[];
  likes: { user_id: string }[];
  saves: { user_id: string }[];
}

export default function PostCard({
  post,
  userId,
}: {
  post: PostWithRelations;
  userId?: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const [deleted, setDeleted] = useState(false);
  const [liked, setLiked] = useState(
    post.likes.some((like) => like.user_id === userId),
  );
  const [saved, setSaved] = useState(
    post.saves.some((save) => save.user_id === userId),
  );
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentWithProfile[]>(post.comments);
  const [commentInput, setCommentInput] = useState("");
  const [imageIndex, setImageIndex] = useState(0);

  async function handleCommentSubmit() {
    if (!commentInput.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: newComment } = await supabase
      .from("comments")
      .insert({
        post_id: post.id,
        user_id: user.id,
        content: commentInput.trim(),
      })
      .select("id, content, created_at, profiles ( username, avatar_url )")
      .single();

    if (newComment) {
      setComments((prev) => [...prev, newComment as unknown as CommentWithProfile]);
      setCommentInput("");
    }
  }

  async function handleLike() {
    if (!userId) return;

    if (liked) {
      // 좋아요 취소
      await supabase
        .from("likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);
    } else {
      // 좋아요
      await supabase
        .from("likes")
        .insert({ post_id: post.id, user_id: userId });
    }
    setLiked(!liked);
  }

  async function handleDelete() {
    if (!confirm("게시글을 삭제하시겠습니까?")) return;

    // 관련 데이터 삭제 (Storage 이미지는 별도)
    await supabase.from("comments").delete().eq("post_id", post.id);
    await supabase.from("likes").delete().eq("post_id", post.id);
    await supabase.from("saves").delete().eq("post_id", post.id);
    await supabase.from("tags").delete().eq("post_id", post.id);
    await supabase.from("post_images").delete().eq("post_id", post.id);
    await supabase.from("posts").delete().eq("id", post.id);

    setDeleted(true);
    router.refresh();
  }

  async function handleSave() {
    if (!userId) return;
    // 북마크 취소
    if (saved) {
      await supabase
        .from("saves")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", userId);
    } else {
      // 북마크 추가
      await supabase
        .from("saves")
        .insert({ post_id: post.id, user_id: userId });
    }
    setSaved(!saved);
  }

  if (deleted) return null;

  return (
    <article className="pb-4 mb-10">
      {/* 상단: 프로필 */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img
            src={
              post.profiles?.avatar_url ||
              "/images/default-avatar.svg"
            }
            alt=""
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-semibold text-[14px]">
            {post.profiles?.username}
          </span>
        </div>
        {userId && userId === post.user_id && (
          <button
            onClick={handleDelete}
            className="text-[12px] text-gray-400 cursor-pointer"
          >
            삭제
          </button>
        )}
      </div>

      {/* 이미지 캐러셀 */}
      <div className="relative w-full aspect-3/4 bg-gray-200">
        {post.post_images.map((img, i) => (
          <img
            key={i}
            src={img.image_url}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover ${i === imageIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          />
        ))}
        {imageIndex > 0 && (
          <button
            onClick={() => setImageIndex((prev) => prev - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/50 w-8 h-8 cursor-pointer rounded-full flex items-center justify-center"
            aria-label="이전 이미지"
          >
            <Image src="/icons/arrow-left.svg" alt="" width={16} height={16} />
          </button>
        )}
        {imageIndex < post.post_images.length - 1 && (
          <button
            onClick={() => setImageIndex((prev) => prev + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 w-8 h-8 cursor-pointer rounded-full flex items-center justify-center"
            aria-label="다음 이미지"
          >
            <Image src="/icons/arrow-right.svg" alt="" width={16} height={16} />
          </button>
        )}
      </div>

      {/* 장소 + 좋아요/북마크 */}
      <div className="flex justify-between items-center px-4 pt-3">
        <div className="flex items-center gap-1">
          <Link
            href={`/place/${post.places?.id}`}
            className="flex items-center gap-1 cursor-pointer"
          >
            <Image src="/icons/place.svg" alt="" width={14} height={20.5} />
            <span className="text-[14px] font-medium mx-1">
              {post.places?.name}
            </span>
            <Image src="/icons/more.svg" alt="" width={14} height={14} />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLike}
            aria-label="좋아요"
            className="cursor-pointer"
          >
            <Image
              src={liked ? "/icons/heart-filled.svg" : "/icons/heart.svg"}
              alt=""
              width={22}
              height={22}
            />
          </button>
          <button
            onClick={handleSave}
            className="cursor-pointer"
            aria-label="북마크"
          >
            <Image
              src={saved ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"}
              alt=""
              width={22}
              height={22}
            />
          </button>
        </div>
      </div>

      {/* 본문 */}
      <p className="px-4 pt-2 text-[14px] leading-relaxed">{post.content}</p>

      {/* 해시태그 */}
      <div className="flex flex-wrap gap-2 px-4 pt-2">
        {post.tags.map((tag) => (
          <span
            key={tag.name}
            className="text-[12px] border rounded-full px-3 py-1"
          >
            #{tag.name}
          </span>
        ))}
      </div>

      {/* 댓글 아코디언 */}
      <div className="px-4 pt-3">
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-[14px] text-gray-500"
        >
          댓글({comments.length})
        </button>
        {showComments && (
          <div className="mt-2">
            {/* 댓글 목록 */}
            <div className="flex flex-col gap-2">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-2">
                  <img
                    src={
                      comment.profiles?.avatar_url ||
                      "/images/default-avatar.svg"
                    }
                    alt=""
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                  />
                  <p className="text-[13px]">
                    <span className="font-semibold">
                      {comment.profiles?.username}
                    </span>{" "}
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>

            {/* 댓글 입력 */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="댓글을 입력해주세요..."
                className="flex-1 text-[13px] border rounded-full px-3 py-1.5 outline-none"
              />
              <button
                onClick={handleCommentSubmit}
                className="text-[13px] font-semibold text-[#ee6300]"
              >
                등록
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
