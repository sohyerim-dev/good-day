"use client";

import Modal from "@/components/ui/Modal";
import { useState } from "react";

interface TermsProps {
  id: string;
  label: string;
  className?: string;
  modal?: boolean;
  checked: boolean;
  onClick: () => void;
  onChange: () => void;
}
export default function Terms({
  id,
  label,
  className,
  modal,
  checked,
  onClick,
  onChange,
}: TermsProps) {
  const [showModal, setShowModal] = useState(false);

  function handleModal(id: string) {
    if (id === "privacy")
      return (
        <Modal
          title="개인정보처리방침"
          children={PRIVACY_POLICY}
          onClose={() => setShowModal(false)}
        />
      );
    else id === "terms";
    return (
      <Modal
        title="이용약관"
        children={TERMS_OF_SERVICE}
        onClose={() => setShowModal(false)}
      />
    );
  }
  return (
    <>
      <div className={className}>
        <input
          type="checkbox"
          checked={checked}
          id={id}
          className="mr-2.5"
          onClick={onClick}
          onChange={onChange}
        />
        <label htmlFor={id} className="mr-2.5">
          {label}
        </label>
        {modal ? (
          <button
            type="button"
            className="underline cursor-pointer text-blue-700"
            onClick={() => setShowModal(true)}
          >
            보기
          </button>
        ) : (
          ""
        )}
      </div>
      {showModal && handleModal(id)}
    </>
  );
}

export const TERMS_OF_SERVICE = `
제1조 (목적)
본 약관은 My Place(이하 "서비스")의 이용 조건 및 절차에 관한 사항을 규정합니다.

제2조 (서비스 이용)
회원은 본 약관에 동의한 후 서비스를 이용할 수 있습니다.
서비스는 사진 기반 장소 공유 커뮤니티 서비스를 제공합니다.

제3조 (금지 행위)
타인의 권리를 침해하는 콘텐츠 게시를 금지합니다.
허위 정보 및 불법 콘텐츠 게시를 금지합니다.

제4조 (서비스 중단)
서비스는 시스템 점검, 장애 등의 사유로 일시 중단될 수 있습니다.

제5조 (게시물 관리)
서비스는 운영 정책에 위반되는 게시물을 삭제할 수 있습니다.
`;

export const PRIVACY_POLICY = `
제1조 (수집하는 개인정보)
이메일 주소, 닉네임, 프로필 사진을 수집합니다.
서비스 이용 과정에서 게시글, 사진, 위치 정보가 수집될 수 있습니다.

제2조 (개인정보 이용 목적)
회원 식별 및 서비스 제공을 위해 사용합니다.
서비스 개선 및 통계 분석에 활용합니다.

제3조 (개인정보 보유 기간)
회원 탈퇴 시 즉시 삭제됩니다.
단, 법령에 의해 보존이 필요한 경우 해당 기간 동안 보관합니다.

제4조 (개인정보 제3자 제공)
수집한 개인정보는 제3자에게 제공하지 않습니다.
법령에 의한 요청이 있는 경우는 예외로 합니다.

제5조 (이용자의 권리)
이용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다.
`;
