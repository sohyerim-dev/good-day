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
  const setProfileReady = useUserStore((state) => state.setProfileReady);

  // 토큰 자동 갱신을 위한 상시 리스너 (탭이 열려있는 동안 세션 유지)
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, role")
          .eq("id", session.user.id)
          .single();
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          username: profile?.username ?? "",
          role: profile?.role ?? "user",
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
      /^\/map\/[^/]+/.test(pathname) ||
      pathname === "/recommendations" ||
      /^\/recommendations\/[^/]+$/.test(pathname);
    const supabase = createClient();

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
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
        return;
      }

      // 세션 확인 즉시 화면 표시, 프로필은 백그라운드에서 채움
      setUser({ id: user.id, email: user.email ?? "", username: "", role: "user" });
      setHasHydrated(true);

      const profileResult = await Promise.race([
        supabase.from("profiles").select("username, role").eq("id", user.id).single(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      const profile = profileResult && "data" in profileResult ? profileResult.data : null;

      if (profile) {
        setUser({
          id: user.id,
          email: user.email ?? "",
          username: profile.username ?? "",
          role: profile.role ?? "user",
        });
      }
      setProfileReady(true);
    }).catch(() => {
      setHasHydrated(true);
    });
  }, [router, pathname]);

  return <>{children}</>;
}
