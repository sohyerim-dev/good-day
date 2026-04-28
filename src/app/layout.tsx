import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "굿데이 | 나만의 놀기 코스 플래너",
  description:
    "내 취향대로 짜는 놀기 코스 플래너. 장소 검색, 경로 안내, 코스 공유까지.",
  icons: {
    icon: "/icons/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" style={{ colorScheme: "light" }}>
      <head>
        <meta name="color-scheme" content="light only" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className="max-w-svw max-h-svh">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
