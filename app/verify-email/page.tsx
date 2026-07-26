import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { resendVerificationInvitationAction, verifyEmailAction } from "@/app/login/actions";
import { SiteHeader } from "@/components/site-header";
import { findRegisteredAccount, isVerificationExpired } from "@/lib/email-accounts";
import { safeUserRedirect } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Verifikasi Email",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; next?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const token = params.token ?? "";
  const next = safeUserRedirect(params.next, "");
  const account = email ? await findRegisteredAccount(email) : null;
  // Token hanya dibandingkan dengan hash di Server Action; halaman tidak pernah menerima hash/token tersimpan.
  const invalidToken = Boolean(!account || !token);
  const alreadyVerified = Boolean(account?.verified);
  const expired = Boolean(account && !alreadyVerified && isVerificationExpired(account));
  const canVerify = Boolean(account && !alreadyVerified && !expired && !invalidToken);

  return (
    <>
      <SiteHeader />
      <main className="grid min-h-[calc(100svh-4rem)] place-items-center px-4 py-10">
        <section className="w-full max-w-lg rounded-lg border-2 border-ink bg-paper p-6 shadow-hard">
          <div className={`grid h-14 w-14 place-items-center rounded-full border-2 border-ink ${canVerify ? "bg-acid" : "bg-bone"}`}>
            {canVerify ? <MailCheck className="h-7 w-7" /> : <TriangleAlert className="h-7 w-7 text-flame" />}
          </div>
          <p className="mt-5 text-sm font-black uppercase text-flame">Verifikasi email</p>
          <h1 className="font-display text-5xl leading-none">
            {canVerify ? "Aktifkan akun ONEDAY." : alreadyVerified ? "Akun sudah aktif." : "Link tidak bisa dipakai."}
          </h1>
          <p className="mt-4 text-sm leading-6 text-ink/62">
            {canVerify ? (
              <>
                Kamu membuka undangan verifikasi untuk email <span className="font-black text-ink">{email || "-"}</span>.
                Klik tombol verified untuk mengaktifkan akun dan masuk ke website.
              </>
            ) : alreadyVerified ? (
              "Email ini sudah pernah diverifikasi. Kamu cukup login memakai email dan password yang sama."
            ) : expired ? (
              "Link undangan ini sudah kedaluwarsa. Minta undangan baru agar token lama tidak bisa dipakai lagi."
            ) : (
              "Token verifikasi tidak cocok atau undangan tidak ditemukan. Buat akun atau kirim ulang undangan dari halaman login."
            )}
          </p>

          <div className="mt-5 rounded-md border-2 border-ink bg-bone p-4 text-sm">
            <p className="flex items-center gap-2 font-black">
              <ShieldCheck className="h-4 w-4 text-cobalt" />
              Keamanan undangan
            </p>
            <p className="mt-2 text-ink/62">
              Link verifikasi hanya berlaku sekali. Jika kamu membuat undangan baru, link lama otomatis tidak berlaku.
            </p>
          </div>

          {canVerify ? (
            <form action={verifyEmailAction} className="mt-6">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="next" value={next} />
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard">
                <MailCheck className="h-5 w-5 text-acid" />
                Verified & Masuk Website
              </button>
            </form>
          ) : account && !alreadyVerified ? (
            <form action={resendVerificationInvitationAction} className="mt-6">
              <input type="hidden" name="email" value={account.email} />
              <input type="hidden" name="next" value={next} />
              <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-acid font-black shadow-hard">
                <RefreshCw className="h-5 w-5" />
                Kirim Ulang Undangan
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard"
            >
              Login Sekarang
            </Link>
          )}
        </section>
      </main>
    </>
  );
}
