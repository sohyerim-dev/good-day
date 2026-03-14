"use client";

import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Signup() {
  const router = useRouter();
  const [modal, setModal] = useState<"terms" | "privacy" | null>(null);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordConfirmError, setPasswordConfirmError] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [agreeError, setAgreeError] = useState("");

  async function handlerSubmit(formData: FormData) {
    // 에러 초기화
    setEmailError("");
    setPasswordError("");
    setPasswordConfirmError("");
    setNicknameError("");
    setAgreeError("");

    const email = formData.get("email") as string;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const password = formData.get("password") as string;
    const passwordConfirm = formData.get("passwordConfirm") as string;
    const nickname = formData.get("nickname") as string;
    const nicknameRegex = /^[a-zA-Z0-9_]+$/;
    const agreeTerms = formData.get("agree-terms") as string;
    const agreePrivacy = formData.get("agree-privacy") as string;

    let hasError = false;
    if (!email) {
      setEmailError("이메일을 입력해주세요.");
      hasError = true;
    } else if (!emailRegex.test(email)) {
      setEmailError("올바른 이메일 형식이 아닙니다.");
      hasError = true;
    }

    if (!password) {
      setPasswordError("비밀번호를 입력해주세요.");
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError("비밀번호는 최소 8자 이상이어야 합니다.");
      hasError = true;
    }
    if (!passwordConfirm) {
      setPasswordConfirmError("비밀번호 확인을 입력해주세요.");
      hasError = true;
    } else if (password !== passwordConfirm) {
      setPasswordConfirmError("비밀번호가 동일하지 않습니다.");
      hasError = true;
    }
    if (!nickname) {
      setNicknameError("닉네임을 입력해주세요.");
      hasError = true;
    } else if (!nicknameRegex.test(nickname)) {
      setNicknameError("닉네임은 영어, 숫자, 언더바(_)만 가능합니다.");
      hasError = true;
    }

    if (!agreeTerms && !agreePrivacy) {
      setAgreeError("모든 약관에 동의해주세요.");
      hasError = true;
    } else if (!agreeTerms) {
      setAgreeError("이용약관에 동의해주세요.");
      hasError = true;
    } else if (!agreePrivacy) {
      setAgreeError("개인정보 처리방침에 동의해주세요.");
      hasError = true;
    }

    if (hasError) return;

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setEmailError("이미 가입된 이메일입니다.");
      } else {
        setAgreeError("회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      return;
    }

    // profiles 테이블에 닉네임 저장
    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        username: nickname,
      });
    }

    // 로그인 페이지로 이동
    router.push("/login");
  }
  return (
    <main className="flex flex-col items-center justify-center h-svh my-20 md:my-0">
      <Image
        src="/images/text-logo.svg"
        alt="마이 플레이스 로고"
        width={71.72}
        height={92.04}
        priority
      />
      <h1 className="text-[28px] mb-6.25 font-medium">회원가입</h1>
      <form
        className="flex flex-col"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          handlerSubmit(formData);
        }}
      >
        <Input
          label={{ name: "email", text: "이메일", labelClass: "w-30" }}
          icon="/icons/mail.svg"
          type="email"
          color="EE6300"
          placeholder="이메일"
          error={emailError}
          wrapperClass="mb-[20px]"
          className="w-80"
          labelRequired
        />
        <Input
          label={{ name: "password", text: "비밀번호", labelClass: "w-30" }}
          icon="/icons/password.svg"
          type="password"
          error={passwordError}
          color="EE6300"
          wrapperClass="mb-[20px]"
          placeholder="비밀번호"
          className="w-80"
          autoComplete="off"
          labelRequired
        />
        <Input
          label={{
            name: "passwordConfirm",
            text: "비밀번호 확인",
            labelClass: "w-30",
          }}
          icon="/icons/password.svg"
          type="password"
          error={passwordConfirmError}
          color="EE6300"
          wrapperClass="mb-[20px]"
          placeholder="비밀번호 확인"
          className="w-80"
          autoComplete="off"
          labelRequired
        />
        <Input
          label={{
            name: "nickname",
            text: "닉네임",
            labelClass: "w-30",
          }}
          icon="/icons/user.svg"
          type="text"
          error={nicknameError}
          color="EE6300"
          wrapperClass="mb-[20px]"
          placeholder="영문, 숫자, 밑줄(_)만 사용 가능"
          className="w-80"
          labelRequired
        />

        <div className="flex flex-col gap-2 mb-5 text-[14px] border rounded-xl p-5 mt-5">
          <label htmlFor="agree-all" className="flex items-center mb-1">
            <input
              id="agree-all"
              type="checkbox"
              className="mr-2 focus:outline-[#ee6300]"
              onChange={(e) => {
                const checked = e.target.checked;
                const form = e.target.closest("form");
                if (!form) return;
                (
                  form.querySelector("#agree-terms") as HTMLInputElement
                ).checked = checked;
                (
                  form.querySelector("#agree-privacy") as HTMLInputElement
                ).checked = checked;
              }}
            />
            <span className="font-medium">모두 동의</span>
            <span className="ml-1 text-red-700">*</span>
          </label>
          <hr />
          <label htmlFor="agree-terms" className="flex items-center">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              className="mr-2 focus:outline-[#ee6300]"
              onChange={(e) => {
                const form = e.target.closest("form");
                if (!form) return;
                const privacy = (
                  form.querySelector("#agree-privacy") as HTMLInputElement
                ).checked;
                (form.querySelector("#agree-all") as HTMLInputElement).checked =
                  e.target.checked && privacy;
              }}
            />
            <span>[필수]</span>
            <button
              type="button"
              onClick={() => setModal("terms")}
              className="ml-1 underline"
            >
              이용약관
            </button>
            <span>에 동의합니다.</span>
          </label>
          <label htmlFor="agree-privacy" className="flex items-center">
            <input
              id="agree-privacy"
              name="agree-privacy"
              type="checkbox"
              className="mr-2 focus:outline-[#ee6300]"
              onChange={(e) => {
                const form = e.target.closest("form");
                if (!form) return;
                const terms = (
                  form.querySelector("#agree-terms") as HTMLInputElement
                ).checked;
                (form.querySelector("#agree-all") as HTMLInputElement).checked =
                  e.target.checked && terms;
              }}
            />
            <span>[필수]</span>
            <button
              type="button"
              onClick={() => setModal("privacy")}
              className="ml-1 underline"
            >
              개인정보처리방침
            </button>
            <span>에 동의합니다.</span>
          </label>
          <p className="text-[12px] text-red-700">{agreeError}</p>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-[#161616] mt-5 text-[20px] text-[#fafafa] px-5 py-2.5 hover:bg-[#ee6300] focus:outline-[#ee6300]"
        >
          가입완료
        </button>
      </form>

      {modal === "terms" && (
        <Modal title="이용약관" onClose={() => setModal(null)}>
          <p>여기에 이용약관 내용을 작성하세요.</p>
        </Modal>
      )}
      {modal === "privacy" && (
        <Modal title="개인정보처리방침" onClose={() => setModal(null)}>
          <p>여기에 개인정보처리방침 내용을 작성하세요.</p>
        </Modal>
      )}
    </main>
  );
}
