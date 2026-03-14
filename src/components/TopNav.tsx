import Image from "next/image";
import Link from "next/link";

export default function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-10">
      <div className="flex justify-between items-center h-25 px-5">
        <Link href="/write" aria-label="글쓰기">
          <Image src="/icons/write.svg" alt="" width={25} height={25} />
        </Link>
        <Link href="/">
          <Image
            src="/images/logo.svg"
            alt="마이 플레이스 로고"
            width={40}
            height={40}
          />
        </Link>
        <Link href="/my-place" aria-label="마이페이지">
          <Image src="/icons/my-page.svg" alt="" width={25} height={25} />
        </Link>
      </div>
    </header>
  );
}
