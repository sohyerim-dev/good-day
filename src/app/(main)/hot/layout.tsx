import { Metadata } from "next";
export const metadata: Metadata = { title: "인기코스" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
