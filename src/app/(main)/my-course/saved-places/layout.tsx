import { Metadata } from "next";
export const metadata: Metadata = { title: "저장된 장소" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
