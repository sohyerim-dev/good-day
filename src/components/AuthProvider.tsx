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

  // 토큰 자동 갱신을 위한 상시 리스너 (탭이 열려있는 동안 세션 유지)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          username: profile?.username ?? "",
        });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 페이지 이동 시 인증 체크 및 라우트 보호
  useEffect(() => {
    // 로그인/회원가입 페이지는 인증 체크 불필요
    if (pathname === "/login" || pathname === "/signup") return;

    // /courses/[id]/edit 등 하위 경로는 여전히 로그인 필요
    const isPublicPage =
      pathname === "/" ||
      pathname === "/hot" ||
      pathname === "/explore" ||
      pathname === "/about" ||
      /^\/courses\/[^/]+$/.test(pathname) ||
      /^\/courses\/[^/]+\/join/.test(pathname) ||
      /^\/map\/[^/]+/.test(pathname);
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setHasHydrated(true);
        if (!isPublicPage) {
          const fullPath = pathname + window.location.search;
          router.push(`/login?redirect=${encodeURIComponent(fullPath)}`);
        }
        return;
      }

      // 자동로그인 미체크 상태 (autoLogin=false) + 새 탭/창 (sessionStorage 없음)이면 로그아웃
      const autoLogin = localStorage.getItem("autoLogin");
      const activeSession = sessionStorage.getItem("activeSession");

      if (autoLogin === "false" && !activeSession) {
        setHasHydrated(true);
        if (!isPublicPage) {
          supabase.auth.signOut();
          const fullPath = pathname + window.location.search;
          router.push(`/login?redirect=${encodeURIComponent(fullPath)}`);
        }
        return; // public이든 private이든 setUser 호출 안 함 → 비로그인 상태로 표시
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
