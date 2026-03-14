"use client";
import Input from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import useUserStore from "@/store/userStore";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { setUser } = useUserStore();

  async function loginAction(formData: FormData) {
    // 에러 초기화
    setEmailError("");
    setPasswordError("");
    setError("");

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    let hasError = false;
    if (!email) {
      setEmailError("이메일을 입력해주세요.");
      hasError = true;
    }
    if (!password) {
      setPasswordError("비밀번호를 입력해주세요.");
      hasError = true;
    }

    if (hasError) return;

    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // supabase에 이메일 + 비밀번호를 보내서 로그인하는 함수
    // 성공 시 세션 토큰이 자동으로 쿠키에 저장 => 토큰을 직접 관리할 필요가 없음.
    // 토큰 저장/갱신은 SDK가 알아서 처리함.

    if (loginError) {
      if (loginError.message.includes("Invalid login credentials")) {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (loginError.message.includes("Email not confirmed")) {
        setError("이메일 인증이 완료되지 않았습니다.");
      } else {
        setError("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUser({
          id: user.id,
          email: user.email ?? "",
          username: profile.username,
          avatar_url: profile.avatar_url,
        });
      }
    }
    // 로그인 성공 -> 메인으로 이동
    const autoLogin = formData.get("auto-login");
    localStorage.setItem("autoLogin", autoLogin ? "true" : "false");
    // 일반 로그인 시 로그아웃 방지
    sessionStorage.setItem("activeSession", "true");
    router.push("/");
  }

  return (
    <main className="flex flex-col items-center justify-center h-svh">
      <h1 className="sr-only">로그인</h1>
      <Image
        src="/images/text-logo.svg"
        alt="마이 플레이스 로고"
        width={71.72}
        height={92.04}
        priority
      />
      <p className="text-[16px] mt-6.25 mb-10">사진으로 발견하는 나만의 장소</p>
      <form
        className="flex flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          loginAction(formData);
        }}
      >
        <Input
          label={{ name: "email", labelClass: "sr-only", text: "이메일" }}
          icon="/icons/mail.svg"
          type="email"
          color="EE6300"
          placeholder="이메일"
          className="w-70"
          wrapperClass="mb-5"
          error={emailError}
          defaultValue="test@myplace.com"
        />
        <Input
          label={{ name: "password", labelClass: "sr-only", text: "비밀번호" }}
          type="password"
          icon="/icons/password.svg"
          color="EE6300"
          placeholder="비밀번호"
          autoComplete="off"
          className="w-70"
          wrapperClass="mb-5"
          error={passwordError}
          defaultValue="test1234"
        />
        <div className="flex justify-between mb-8">
          <label htmlFor="auto-login">
            <input
              id="auto-login"
              name="auto-login"
              type="checkbox"
              className="mr-1.25 focus:outline-[#ee6300]"
            />
            자동 로그인
          </label>
          <Link href="/signup" className="focus:outline-[#ee6300]">
            회원가입
          </Link>
        </div>

        <p
          className={`text-[14px] text-red-600 transition-opacity ${error ? "opacity-100" : "opacity-0"}`}
        >
          {error || "\u00A0"}
        </p>
        <button
          type="submit"
          className="rounded-xl bg-[#161616] text-[20px] text-[#fafafa] px-5 py-2.5 hover:bg-[#ee6300] focus:outline-[#ee6300]"
        >
          로그인
        </button>
      </form>
    </main>
  );
}
