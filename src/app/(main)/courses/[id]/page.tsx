import { createClient } from "@/lib/supabase/server";
import { Metadata } from "next";
import CourseDetail from "./CourseDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("title, description")
    .eq("id", id)
    .single();

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
