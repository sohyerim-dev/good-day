import Image from "next/image";
import Link from "next/link";
import UserFlowSlider from "@/components/UserFlowSlider";

export default function About() {
  return (
    <main className="flex flex-col min-h-full p-4 pb-28 gap-6">
      <h1 className="text-[22px] font-bold">굿데이 소개</h1>

      {/* 서비스 소개 */}
      <div className="bg-gray-50 rounded-2xl p-5 flex flex-col gap-2 items-center">
        <div className="flex items-center gap-2 mb-1">
          <Image src="/images/logo.svg" width={56} height={77} alt="굿데이" />
        </div>
        <p className="text-[14px] text-gray-500 leading-relaxed text-center mt-2">
          약속 전에 항상 동선을 미리 짜던 경험에서 시작한 서비스입니다.
          <br />
          <br />
          계획형 인간 J들을 위한{" "}
          <strong className="font-bold">놀기 코스 플래너</strong>로,
          <br />
          장소를 추가하고 순서를 정해 여행 코스를 만들 수 있습니다.
          <br />
          친구와 함께 코스를 편집하거나 공유하며 여행 계획을 완성할 수 있어요.
        </p>
      </div>

      {/* 핵심 사용자 흐름 */}
      <div>
        <h2 className="text-[16px] font-bold mb-3">핵심 사용자 흐름</h2>
        <UserFlowSlider />
      </div>

      {/* 최근 업데이트 */}
      <div>
        <h2 className="text-[16px] font-bold mb-3">최근 업데이트</h2>
        <div className="flex flex-col gap-2">
          {[
            {
              date: "2026.05.23",
              text: "나의 코스, 북마크한 코스에서 메모・시간 기록 가능",
            },
            {
              date: "2026.05.24",
              text: "코스 추가・수정 시 경로 미리보기 기능 추가",
            },
            {
              date: "2026.05.24",
              text: "공동 편집 기능 추가 — 초대 링크로 친구와 함께 코스를 편집할 수 있어요",
            },
            {
              date: "2026.05.24",
              text: "해외 장소 추가 지원 — 코스에 해외 장소를 검색하고 경로도 확인할 수 있어요",
            },
            {
              date: "2026.05.24",
              text: "경로 보기: 구간별 버스・지하철 경로 전환 기능 추가",
            },
            {
              date: "2026.05.28",
              text: "코스 추가: 경로 미리보기 인라인 방식으로 변경",
            },
            {
              date: "2026.05.30",
              text: "북마크한 코스를 내 코스로 복사하는 기능 추가",
            },
            {
              date: "2026.05.30",
              text: "코스 추가 시 북마크한 코스에서 장소를 개별 또는 전체 추가 가능",
            },
            {
              date: "2026.06.09",
              text: "코스 장소별 사진 첨부 기능 추가 — 다녀온 장소의 사진을 올리면 같은 장소를 포함한 모든 코스에서 볼 수 있어요",
            },
            {
              date: "2026.06.09",
              text: "국내는 카카오맵, 해외는 구글맵으로 지도 표시 — 코스 탐색과 경로 보기 모두 적용",
            },
            {
              date: "2026.06.10",
              text: "코스 장소 직접 입력 기능 추가 — 지도에 없는 장소도 이름・주소를 직접 입력해 코스에 추가할 수 있어요",
            },
            {
              date: "2026.06.10",
              text: "코스 및 장소 사진 신고 기능 추가 — 부적절한 콘텐츠를 신고할 수 있어요",
            },
          ].slice(-5).map((item, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded-2xl px-4 py-3 flex items-start gap-3"
            >
              <span className="text-[11px] text-gray-400 mt-0.5 shrink-0">
                {item.date}
              </span>
              <span className="text-[13px] text-gray-600">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 개발자 정보 */}
      <div>
        <h2 className="text-[16px] font-bold mb-3">개발자 정보</h2>
        <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">
            Developer
          </p>
          <p className="font-bold text-[15px]">소혜림</p>
          <p className="text-[12px] text-gray-400">
            굿데이 서비스 기획 및 개발
          </p>
          <div className="flex flex-col gap-1.5 mt-1">
            <a
              href="mailto:musik91@naver.com"
              className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#EE6300]"
            >
              <Image
                src="/icons/mail.svg"
                alt=""
                width={14}
                height={14}
                className="opacity-40"
              />
              musik91@naver.com
            </a>
            <a
              href="https://sohyerim.kr/"
              target="_blank"
              className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#EE6300]"
            >
              <Image
                src="/icons/link.svg"
                alt=""
                width={14}
                height={14}
                className="opacity-40"
              />
              sohyerim.kr
            </a>
            <a
              href="https://github.com/sohyerim-dev"
              target="_blank"
              className="flex items-center gap-2 text-[13px] text-gray-500 hover:text-[#EE6300]"
            >
              <Image
                src="/icons/link.svg"
                alt=""
                width={14}
                height={14}
                className="opacity-40"
              />
              github.com/sohyerim-dev
            </a>
          </div>
        </div>
      </div>

      <Link
        href="/"
        className="text-[13px] text-gray-400 hover:text-black text-center mt-2"
      >
        홈으로 돌아가기
      </Link>
    </main>
  );
}
