import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";
import { SiteHeader } from "@/components/site-header";
import { requireAdminPage } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const session = await requireAdminPage("/admin");

  return (
    <>
      <SiteHeader mode="admin" />
      <AdminDashboard account={session} />
    </>
  );
}
