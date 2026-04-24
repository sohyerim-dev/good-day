"use client";

import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store/userStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/signup") return;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }

      // 자동로그인 해제 + 새 창이면 로그아웃
      const autoLogin = localStorage.getItem("autoLogin");
      const activeSession = sessionStorage.getItem("activeSession");

      if (autoLogin === "false" && !activeSession) {
        supabase.auth.signOut();
        router.push("login");
        return;
      }
      setUser({ id: user.id, email: user.email ?? "" });
    });
  }, [router, pathname]);

  return <>{children}</>;
}
