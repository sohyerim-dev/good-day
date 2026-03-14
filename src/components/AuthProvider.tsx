"use client";

import { createClient } from "@/lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;

    const supabase = createClient();

    // 로그인 상태 확인
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log("user:", user);
      if (!user) {
        router.push("/login");
        return;
      }

      // 자동 로그인 해제 시 로그아웃

      const autoLogin = localStorage.getItem("autoLogin");
      const activeSession = sessionStorage.getItem("activeSession");

      if (autoLogin === "false" && !activeSession) {
        supabase.auth.signOut();
        localStorage.removeItem("autoLogin");
        router.push("/login");
      }
    });
  }, [router, pathname]);

  return <>{children}</>;
}
