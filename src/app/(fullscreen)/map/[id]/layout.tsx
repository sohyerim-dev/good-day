import { Metadata } from "next";
export const metadata: Metadata = { title: "경로 보기" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
