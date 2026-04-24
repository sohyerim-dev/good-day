import Image from "next/image";
import Link from "next/link";

const TOP_NAV_ITEMS = [
  { href: "/write", alt: "글쓰기", icon: "/icons/write.svg" },
  { href: "/", alt: "홈", icon: "/images/logo.svg" },
  { href: "/my-page", alt: "마이페이지", icon: "icons/my-page.svg" },
];
export default function TopNav() {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white z-10 border-b border-gray-100">
      <nav className="flex justify-between items-center h-14 px-5">
        {TOP_NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            <Image src={item.icon} alt={item.alt} width={25} height={25} />
          </Link>
        ))}
      </nav>
    </header>
  );
}
