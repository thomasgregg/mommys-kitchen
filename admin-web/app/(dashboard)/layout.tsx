import { Sidebar } from "@/components/layout/sidebar";
import { UserNav } from "@/components/layout/user-nav";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, tenant } = await requireAdmin();

  return (
    <SidebarProvider defaultOpen>
      <Sidebar />
      <SidebarInset className="min-h-screen bg-white">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-white">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 md:px-6">
            <SidebarTrigger className="md:hidden" />
            <div className="ml-auto">
              <UserNav profile={profile} tenantName={tenant.name} />
            </div>
          </div>
        </header>
        <main className="px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
