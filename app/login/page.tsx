import type { Metadata } from "next";
import { LoginPanel } from "@/components/login-panel";
import { SiteHeader } from "@/components/site-header";
import { safeUserRedirect } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const next = safeUserRedirect(params.next, "");

  return (
    <>
      <SiteHeader />
      <LoginPanel error={Boolean(params.error)} errorCode={params.error ?? ""} next={next} />
    </>
  );
}
