import type { Metadata } from "next";
import { LoginPanel } from "@/components/login-panel";
import { SiteHeader } from "@/components/site-header";
import { ProfileDashboard } from "@/components/profile-dashboard";
import { getUserSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Profile",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const session = await getUserSession();

  return (
    <>
      <SiteHeader />
      {session ? (
        <ProfileDashboard account={session} initialSection={params.tab} />
      ) : (
        <LoginPanel error={Boolean(params.error)} errorCode={params.error ?? ""} next="/profile" title="Login Profile" />
      )}
    </>
  );
}
