import { Metadata } from "next";
export const metadata: Metadata = { title: "북마크" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
