import Image from "next/image";
import Link from "next/link";

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
          <br /><br />
          계획형 인간 J들을 위한 <strong className="font-bold">놀기 코스 플래너</strong>로,<br />
          장소를 추가하고 순서를 정해 여행 코스를 만들 수 있습니다.<br />
          친구와 함께 코스를 편집하거나 공유하며 여행 계획을 완성할 수 있어요.
        </p>
      </div>

      {/* 핵심 사용자 흐름 */}
      <div>
        <h2 className="text-[16px] font-bold mb-3">핵심 사용자 흐름</h2>
        <div className="flex flex-col gap-6">
          {[
            {
              step: 1,
              title: "장소 검색",
              desc: "가고 싶은 장소를 검색하고 코스에 추가합니다.\n여행지, 맛집, 카페 등 원하는 장소를 한 곳에 모아 여행 계획을 시작할 수 있습니다.",
              images: ["1-search-places.png"],
            },
            {
              step: 2,
              title: "코스 구성",
              desc: "드래그 앤 드롭으로 장소 순서를 변경하며 여행 동선을 정리합니다.\n이동 흐름을 고려해 효율적인 코스를 구성할 수 있습니다.",
              images: ["2-make-course.png"],
            },
            {
              step: 3,
              title: "이동 경로 확인",
              desc: "도보 및 대중교통 경로와 이동 정보를 확인할 수 있습니다.\n장소 간 이동 시간을 고려하며 실제 여행 동선에 맞게 계획할 수 있습니다.",
              images: ["3-course-detail.png", "4-walk-route.png", "5-transit-route.png"],
            },
            {
              step: 4,
              title: "친구와 공유 및 공동 편집",
              desc: "코스를 친구에게 공유하고 함께 수정할 수 있습니다.\n여행 일정을 함께 조율하며 하나의 코스를 완성할 수 있습니다.",
              images: ["6-invite-friend.png", "7-together-edit.png"],
            },
            {
              step: 5,
              title: "다른 사용자 코스 탐색",
              desc: "인기 코스와 원하는 지역의 코스를 탐색하고 북마크할 수 있습니다.\n다른 사용자의 여행 동선을 참고하며 새로운 장소를 발견할 수 있습니다.",
              images: ["8-hot-course.png", "9-explore.png"],
            },
          ].map((item, idx, arr) => (
            <div key={item.step}>
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
                <div>
                  <p className="text-[13px] font-bold text-[#EE6300] mb-1">{item.step}. {item.title}</p>
                  <p className="text-[13px] text-gray-500 leading-relaxed whitespace-pre-line">{item.desc}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.images.map((img) => (
                    <Image
                      key={img}
                      src={`/screenshots/${img}`}
                      alt={item.title}
                      width={380}
                      height={760}
                      className="rounded-xl object-contain"
                    />
                  ))}
                </div>
              </div>
              {idx < arr.length - 1 && (
                <p className="text-center text-gray-300 text-[20px] mt-4">↓</p>
              )}
            </div>
          ))}
        </div>
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
          ].map((item, i) => (
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

      {/* 서비스 피드백 */}
      <div>
        <h2 className="text-[16px] font-bold mb-3">서비스 피드백</h2>
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSd4014fVb2wvYh3bIzOZT457wDgi7bhMc8XEC_StU9koix6GQ/viewform?usp=header"
          target="_blank"
          className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 hover:bg-gray-100"
        >
          <span className="text-[14px] font-medium">
            서비스 이용 피드백 남기기
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-300"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </a>
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
