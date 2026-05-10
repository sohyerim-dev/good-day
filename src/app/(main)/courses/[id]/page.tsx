import { Metadata } from "next";
import CourseDetail from "./CourseDetail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let data = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/courses?id=eq.${id}&select=title,description`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        cache: "no-store",
      }
    );
    const courses = await res.json();
    data = courses?.[0] ?? null;
  } catch (e) {
    console.error("[generateMetadata] fetch error:", e);
  }

  return {
    title: data?.title ? `${data.title} | 굿데이` : "굿데이",
    openGraph: {
      title: data?.title ?? "굿데이 | 나만의 놀기 코스 플래너",
      description: data?.description ?? "나만의 놀기 코스 플래너. 장소 검색, 경로 안내, 코스 공유까지.",
      images: ["/images/og-image.png"],
    },
  };
}

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CourseDetail params={params} />;
}
