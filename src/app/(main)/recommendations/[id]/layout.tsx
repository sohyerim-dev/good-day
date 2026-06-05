import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("title, content, category, post_images(url, order)")
    .eq("id", id)
    .single();

  if (!post) return { title: "굿데이 추천" };

  const thumbnail = (post.post_images as { url: string; order: number }[])
    ?.sort((a, b) => a.order - b.order)[0]?.url;
  const description = post.content
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 150);
  const categoryLabel = post.category === "place" ? "장소 추천" : "코스 추천";

  return {
    title: `${post.title} | 굿데이 ${categoryLabel}`,
    description: description || `굿데이가 추천하는 ${categoryLabel}`,
    openGraph: {
      title: post.title,
      description: description || `굿데이가 추천하는 ${categoryLabel}`,
      images: thumbnail ? [{ url: thumbnail }] : [],
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
