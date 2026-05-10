import { Metadata } from "next";
export const metadata: Metadata = { title: "코스 만들기" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
