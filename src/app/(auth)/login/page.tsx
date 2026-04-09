"use client";

import LoginInput from "@/components/ui/LoginInput";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

export default function Login() {
  const supabase = createClient();
  const router = useRouter();

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement> | SubmitEvent,
  ) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // 에러 처리
      console.log(error.message);
      return;
    }

    router.push("/");
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col w-fit m-auto min-h-svh items-center gap-2 justify-center"
    >
      <h1 className="sr-only">로그인</h1>
      <Image
        src="/images/logo.svg"
        width={100}
        height={97}
        priority
        style={{ width: 100, height: 97 }}
        alt="마이플레이스"
      />
      <h2 className="mt-2 font-bold text-[18px]">
        사진으로 발견하는 나만의 장소
      </h2>
      <LoginInput
        src="icons/mail.svg"
        type="email"
        label="이메일"
        placeholder="이메일을 입력해주세요."
        className="mt-6"
        autoComplete="email"
      />
      <LoginInput
        src="icons/password.svg"
        type="password"
        label="패스워드"
        placeholder="패스워드를 입력해주세요."
        className="mt-2.5"
        autoComplete="current-password"
      />
      <div className="flex justify-between w-full mt-1">
        <div className="flex items-center self-start">
          <input
            type="checkbox"
            id="auto-login"
            name="auto-login"
            className="h-3.5 w-3.5 mr-1 focus:outline-[#EE6300]"
          />
          <label htmlFor="auto-login" className="text-[14px]">
            자동로그인
          </label>
        </div>
        <Link href="/signup" className="text-[14px] focus:outline-[#EE6300]">
          회원가입
        </Link>
      </div>
      <button
        type="submit"
        className="bg-[#EE6300] rounded-2xl w-full h-12 mt-2.5 text-white cursor-pointer hover:bg-white hover:text-[#EE6300] focus:border-2 focus:border-[#EE6300] focus:bg-white focus:text-[#EE6300] hover:border hover:border-[#EE6300] focus:outline-none"
      >
        로그인
      </button>
    </form>
  );
}
