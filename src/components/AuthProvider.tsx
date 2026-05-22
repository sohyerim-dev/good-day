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
    // 로그인/회원가입 페이지, 코스 상세 페이지는 인증 체크 불필요
    // /courses/[id]/edit 등 하위 경로는 여전히 로그인 필요
    const isPublicCoursePage = /^\/courses\/[^/]+$/.test(pathname);
    if (pathname === "/login" || pathname === "/signup" || isPublicCoursePage) return;
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        // 현재 경로를 redirect 파라미터로 넘겨서 로그인 후 돌아올 수 있게 함
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      // 자동로그인 미체크 상태 (autoLogin=false) + 새 탭/창 (sessionStorage 없음)이면 로그아웃
      // 로그인 시 autoLogin 체크 여부에 따라 localStorage/sessionStorage에 플래그를 저장해둠
      const autoLogin = localStorage.getItem("autoLogin");
      const activeSession = sessionStorage.getItem("activeSession");

      if (autoLogin === "false" && !activeSession) {
        supabase.auth.signOut();
        // redirect 파라미터를 포함해서 재로그인 후 원래 페이지로 이동 가능하게 함
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      setUser({
        id: user.id,
        email: user.email ?? "",
        username: profile?.username ?? "",
      });
      // user가 설정된 이후에 hasHydrated를 true로 변경해 컴포넌트가 user에 안전하게 접근하게 함
      setHasHydrated(true);
    });
  }, [router, pathname]);

  return <>{children}</>;
}
