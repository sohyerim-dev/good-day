import BottomNav from "@/components/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-20 max-w-svw max-h-svh">{children}</div>
      <BottomNav />
    </>
  );
}
