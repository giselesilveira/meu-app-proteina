import { BottomNav, SideNav } from "@/components/nav";
import { isAdminEmail, requireAccess } from "@/lib/access";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const access = await requireAccess();
  return (
    <div className="flex min-h-screen">
      <SideNav isAdmin={isAdminEmail(access.user.email)} />
      <main id="conteudo" className="pb-nav w-full flex-1 px-4 pt-6 sm:px-6 lg:px-12 lg:pb-12 lg:pt-10">
        <div className="mx-auto w-full max-w-2xl">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
