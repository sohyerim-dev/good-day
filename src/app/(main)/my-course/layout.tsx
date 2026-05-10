import { Metadata } from "next";
export const metadata: Metadata = { title: "마이코스" };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
