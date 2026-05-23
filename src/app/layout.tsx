import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.good-day-out.com"),
  title: {
    default: "굿데이 | 나만의 놀기 코스 플래너",
    template: "%s | 굿데이",
  },
  description:
    "내 취향대로 짜는 놀기 코스 플래너. 장소 검색, 경로 안내, 코스 공유까지.",
  icons: {
    icon: "/icons/favicon.svg",
  },
  verification: {
    google: "tLq7bUO1kTb4vvpGb6eZcQmIPPZbpTYuj6nkzDszpBc",
  },
  openGraph: {
    title: "굿데이 | 나만의 놀기 코스 플래너",
    description:
      "내 취향대로 짜는 놀기 코스 플래너. 장소 검색, 경로 안내, 코스 공유까지.",
    images: ["/images/og-image.png"],
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
        <Analytics />
      </body>
    </html>
  );
}
