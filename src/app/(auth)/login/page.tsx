"use client";

import LoginInput from "@/components/ui/LoginInput";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [autoLogin, setAutoLogin] = useState(false);

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement> | SubmitEvent,
  ) {
    e.preventDefault();

    console.log(email, password);
    // 빈값 검사
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    // email 패턴
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // test() 패턴 일치 여부 true/false 반환
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }

    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!autoLogin) {
      // 자동로그인 미체크시 sessionStorage에 표시
      localStorage.setItem("autoLogin", "false");
      sessionStorage.setItem("activeSession", "true");
    } else {
      localStorage.removeItem("autoLogin");
    }

    if (error) {
      if (error.message === "Invalid login credentials") {
        setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (error.message === "Email not confirmed") {
        setError("이메일 인증이 필요합니다.");
      } else {
        setError("로그인에 실패했습니다. 다시 시도해주세요.");
      }
      return;
    }
    router.push("/");
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col w-fit m-auto min-h-svh items-center gap-2 justify-center"
    >
      <h1 className="sr-only">로그인</h1>
      <Image
        src="/images/logo.svg"
        width={130}
        height={177}
        priority
        style={{ width: 130, height: 177 }}
        alt="마이플레이스"
      />
      <h2 className="mt-5 font-medium text-[16px]">
        놀러 나가기 좋은 날, 어디로 갈까요?
      </h2>
      <LoginInput
        src="icons/mail.svg"
        type="email"
        label="이메일"
        placeholder="이메일을 입력해주세요."
        className="mt-6"
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <LoginInput
        src="icons/password.svg"
        type="password"
        label="패스워드"
        placeholder="패스워드를 입력해주세요."
        className="mt-2.5"
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex justify-between w-full mt-3">
        <div className="flex items-center self-start">
          <input
            type="checkbox"
            id="auto-login"
            name="auto-login"
            className="h-3.5 w-3.5 mr-1 focus:outline-[#EE6300]"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
          />
          <label htmlFor="auto-login" className="text-[14px]">
            자동로그인
          </label>
        </div>
        <Link href="/signup" className="text-[14px] focus:outline-[#EE6300]">
          회원가입
        </Link>
      </div>
      {error && <p className="text-red-500 text-[13px] w-full">{error}</p>}
      <button
        type="submit"
        className="bg-[#EE6300] rounded-2xl w-full h-12 mt-5 text-white cursor-pointer hover:bg-white hover:text-[#EE6300] active:border-2 active:border-[#EE6300] active:bg-white active:text-[#EE6300] hover:border hover:border-[#EE6300] active:outline-none"
      >
        로그인
      </button>
    </form>
  );
}
