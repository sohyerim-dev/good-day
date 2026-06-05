import { Metadata } from "next";

export const metadata: Metadata = {
  title: "굿데이 추천 장소&코스",
  description: "굿데이가 직접 소개하는 감각적인 장소와 코스를 만나보세요.",
  openGraph: {
    title: "굿데이 추천 장소&코스",
    description: "굿데이가 직접 소개하는 감각적인 장소와 코스를 만나보세요.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
