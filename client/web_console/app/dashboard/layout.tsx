import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { StickyAlertStrip } from "@/components/admin/StickyAlertStrip";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto min-h-screen">
        <StickyAlertStrip />
        {children}
      </main>
    </div>
  );
}
