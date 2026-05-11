import { Metadata } from "next";
import CourseDetail from "./CourseDetail";

// 요청마다 서버에서 새로 렌더링 (캐시 사용 시 OG 메타가 갱신되지 않음)
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let data = null;
  try {
    // generateMetadata는 서버에서 실행되므로 Supabase 클라이언트 대신 REST API 직접 호출
    // Supabase 클라이언트는 브라우저 쿠키 기반이라 서버에서 인증 컨텍스트가 없음
    // anon 키로 호출하려면 Supabase SELECT 정책에 anon 역할이 포함되어야 함
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/courses?id=eq.${id}&select=title,description`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        cache: "no-store",
      },
    );
    const courses = await res.json();
    data = courses?.[0] ?? null;
  } catch (e) {
    console.error("[generateMetadata] fetch error:", e);
  }

  return {
    title: data?.title ?? "굿데이 | 나만의 놀기 코스 플래너",
    openGraph: {
      title: data?.title ?? "굿데이 | 나만의 놀기 코스 플래너",
      description:
        data?.description ??
        "나만의 놀기 코스 플래너. 장소 검색, 경로 안내, 코스 공유까지.",
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
