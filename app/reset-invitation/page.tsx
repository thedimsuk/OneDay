import Link from "next/link";
import type { Metadata } from "next";
import { KeyRound, MailCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { findRegisteredAccount } from "@/lib/email-accounts";
import { safeDevelopmentUrl } from "@/lib/safe-redirect";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Undangan Reset Password",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ResetInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; devUrl?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const account = email ? await findRegisteredAccount(email) : null;
  const resetUrl = safeDevelopmentUrl(params.devUrl, siteConfig.url) || "/forgot-password?sent=1";

  return (
    <>
      <SiteHeader />
      <main className="grid min-h-[calc(100svh-4rem)] place-items-center px-4 py-10">
        <section className="w-full max-w-lg rounded-lg border-2 border-ink bg-paper p-6 shadow-hard">
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-acid">
            <MailCheck className="h-7 w-7" />
          </div>
          <p className="mt-5 text-sm font-black uppercase text-flame">Undangan reset lokal</p>
          <h1 className="font-display text-5xl leading-none">Cek email reset.</h1>
          <p className="mt-4 text-sm leading-6 text-ink/62">
            Di mode production, link reset dikirim ke inbox <span className="font-black text-ink">{email || "-"}</span>.
            Untuk lokal, tombol di bawah mensimulasikan undangan email itu.
          </p>
          <Link
            href={resetUrl}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard"
          >
            <KeyRound className="h-5 w-5 text-acid" />
            Buka Undangan Reset
          </Link>
        </section>
      </main>
    </>
  );
}
