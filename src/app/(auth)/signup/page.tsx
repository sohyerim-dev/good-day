"use client";
import AlertModal from "@/components/ui/AlertModal";
import SignupInput from "@/components/ui/SignupInput";
import Terms from "@/components/ui/Terms";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignUp() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [allAgree, setAllAgree] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  const [emailChecked, setEmailChecked] = useState(false);
  const [error, setError] = useState("");

  const [success, setSuccess] = useState(false);

  async function handleCheckEmail() {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (data) {
      setError("이미 사용 중인 이메일입니다.");
    } else {
      setEmailChecked(true);
    }
  }
  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement> | SubmitEvent,
  ) {
    e.preventDefault();
    // 이전 에러 메시지 초기화
    setError("");

    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("올바른 이메일 형식이 아닙니다.");
      return;
    }

    if (!emailChecked) {
      setError("이메일 중복 확인을 해주세요.");
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
    if (!rePassword) {
      setError("비밀번호 확인을 입력해주세요.");
      return;
    }
    if (password !== rePassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!nickname) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    if (!terms || !privacy) {
      setError("약관에 동의해주세요.");
      return;
    }

    console.log("nickname:", nickname);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: nickname } },
    });

    if (error) {
      console.log(error);
      setError("회원가입에 실패했습니다.");
      return;
    }

    setSuccess(true);
  }

  function handleAllAgree() {
    const next = !allAgree;
    setAllAgree(next);
    setTerms(next);
    setPrivacy(next);
  }

  function handleTerms() {
    const next = !terms;
    setTerms(next);
    if (!next) setAllAgree(false);
    else if (privacy) setAllAgree(true);
  }

  function handlePrivacy() {
    const next = !privacy;
    setPrivacy(next);
    if (!next) setAllAgree(false);
    else if (terms) setAllAgree(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col items-center w-fit m-auto min-h-svh my-10 justify-center"
    >
      <h1 className="text-[25px] font-bold mb-5">회원가입</h1>
      <SignupInput
        type="email"
        label="이메일"
        autoComplete="new"
        placeholder="이메일을 입력해주세요."
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailChecked(false);
        }}
      />
      <button
        type="button"
        className="mt-5 w-70 bg-[#EE6300] h-12 rounded-2xl text-white hover:cursor-pointer hover:bg-white hover:text-[#EE6300] hover:border hover:border-[#EE6300] focus:outline-amber-950"
        onClick={handleCheckEmail}
      >
        이메일 중복확인
      </button>
      {emailChecked && (
        <p className="text-[13px]">사용 가능한 이메일 주소입니다.</p>
      )}
      <SignupInput
        type="password"
        label="비밀번호"
        autoComplete="off"
        placeholder="비밀번호를 입력해주세요."
        className="mt-5"
        onChange={(e) => setPassword(e.target.value)}
      />
      <SignupInput
        type="re-password"
        label="비밀번호 확인"
        autoComplete="off"
        placeholder="비밀번호를 입력해주세요."
        className="mt-5"
        onChange={(e) => setRePassword(e.target.value)}
      />
      <SignupInput
        type="nickname"
        label="닉네임"
        placeholder="닉네임을 입력해주세요."
        className="mt-5"
        onChange={(e) => setNickname(e.target.value)}
      />
      <fieldset className="w-full border rounded-2xl p-5 mt-5">
        <legend className="sr-only">약관 동의</legend>
        <Terms
          id="allAgree"
          label="전체 동의"
          checked={allAgree}
          onClick={handleAllAgree}
          onChange={handleAllAgree}
        />
        <hr className="my-2.5" />
        <Terms
          id="terms"
          label="서비스 이용약관 동의"
          className="mt-2.5"
          modal
          checked={terms}
          onClick={handleTerms}
          onChange={handleTerms}
        />
        <Terms
          id="privacy"
          label="개인정보 수집 및 이용 동의"
          className="mt-2.5"
          modal
          checked={privacy}
          onClick={handlePrivacy}
          onChange={handlePrivacy}
        />
      </fieldset>
      <button
        type="submit"
        className="mt-5 w-70 bg-[#EE6300] h-12 rounded-2xl text-white hover:cursor-pointer hover:bg-white hover:text-[#EE6300] hover:border hover:border-[#EE6300] focus:outline-amber-950"
      >
        회원가입 완료
      </button>

      {error && <AlertModal message={error} onClose={() => setError("")} />}
      {success && (
        <AlertModal
          message="회원가입이 완료되었습니다!"
          onClose={() => router.push("/login")}
        />
      )}
    </form>
  );
}
