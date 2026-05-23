"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

// 모든 (main) 페이지에서 실행되는 인증 감시자
// pathname이 바뀔 때마다 Supabase 세션을 확인하고 미인증 시 로그인으로 리다이렉트
export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useUserStore((state) => state.setUser);
  const setHasHydrated = useUserStore((state) => state.setHasHydrated);

  useEffect(() => {
    // 로그인/회원가입 페이지는 인증 체크 불필요
    if (pathname === "/login" || pathname === "/signup") return;

    // /courses/[id]/edit 등 하위 경로는 여전히 로그인 필요
    const isPublicCoursePage = /^\/courses\/[^/]+$/.test(pathname);
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        // 공개 코스 페이지는 비로그인도 허용 — 리다이렉트 없이 hydrated만 처리
        setHasHydrated(true);
        if (!isPublicCoursePage) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      // 자동로그인 미체크 상태 (autoLogin=false) + 새 탭/창 (sessionStorage 없음)이면 로그아웃
      const autoLogin = localStorage.getItem("autoLogin");
      const activeSession = sessionStorage.getItem("activeSession");

      if (autoLogin === "false" && !activeSession) {
        supabase.auth.signOut();
        setHasHydrated(true);
        if (!isPublicCoursePage) {
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      setUser({
        id: user.id,
        email: user.email ?? "",
        username: profile?.username ?? "",
      });
      setHasHydrated(true);
    });
  }, [router, pathname]);

  return <>{children}</>;
}
