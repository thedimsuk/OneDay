import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, Clock3, MailCheck, RefreshCw, Send, ShieldCheck, TriangleAlert } from "lucide-react";
import { resendVerificationInvitationAction } from "@/app/login/actions";
import { SiteHeader } from "@/components/site-header";
import { findRegisteredAccount, getVerificationExpiry, isVerificationExpired } from "@/lib/email-accounts";
import { safeDevelopmentUrl, safeUserRedirect } from "@/lib/safe-redirect";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Undangan Verifikasi Email",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function EmailInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string; resent?: string; expired?: string; devUrl?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const next = safeUserRedirect(params.next, "");
  const account = email ? await findRegisteredAccount(email) : null;
  const alreadyVerified = Boolean(account?.verified);
  const expired = Boolean(account && !alreadyVerified && isVerificationExpired(account)) || Boolean(params.expired);
  const expiry = account && !alreadyVerified ? getVerificationExpiry(account) : "";
  const invitationUrl = safeDevelopmentUrl(params.devUrl, siteConfig.url);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-6xl items-center px-4 py-8 md:px-6 md:py-12">
        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="rounded-lg border-2 border-ink bg-paper p-6 shadow-hard">
            <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-acid">
              <Send className="h-7 w-7" />
            </div>
            <p className="mt-5 text-sm font-black uppercase text-flame">Undangan verifikasi email</p>
            <h1 className="font-display text-5xl leading-none md:text-6xl">
              {alreadyVerified ? "Akun sudah aktif." : expired ? "Link perlu diperbarui." : "Cek email kamu."}
            </h1>
            <p className="mt-4 text-sm leading-6 text-ink/62">
              {account ? (
                <>
                  Undangan akun ONEDAY disiapkan untuk <span className="font-black text-ink">{account.email}</span>.
                  Akun baru belum bisa login normal sebelum email ini diverifikasi.
                </>
              ) : (
                "Undangan tidak ditemukan. Buat akun dari halaman login untuk membuat link verifikasi baru."
              )}
            </p>

            {params.resent ? (
              <div className="mt-5 rounded-md border-2 border-ink bg-acid p-4 text-sm font-black">
                Undangan baru sudah dibuat. Link lama otomatis tidak berlaku.
              </div>
            ) : null}

            {account ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <StatusTile
                  icon={alreadyVerified ? CheckCircle2 : MailCheck}
                  title={alreadyVerified ? "Status akun" : "Dikirim ke"}
                  value={alreadyVerified ? "Aktif" : account.email}
                />
                <StatusTile
                  icon={expired ? TriangleAlert : Clock3}
                  title="Masa berlaku"
                  value={alreadyVerified ? "Selesai" : expired ? "Kedaluwarsa" : formatExpiry(expiry)}
                />
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {alreadyVerified ? (
                <Link
                  href="/login"
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard"
                >
                  Login Sekarang
                  <ArrowRight className="h-5 w-5 text-acid" />
                </Link>
              ) : account && !expired && invitationUrl ? (
                <Link
                  href={invitationUrl}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard"
                >
                  Buka Link Verifikasi Lokal
                  <ArrowRight className="h-5 w-5 text-acid" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-12 flex-1 items-center justify-center rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard"
                >
                  Kembali ke Login
                </Link>
              )}

              {account && !alreadyVerified ? (
                <form action={resendVerificationInvitationAction} className="flex-1">
                  <input type="hidden" name="email" value={account.email} />
                  <input type="hidden" name="next" value={next} />
                  <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-paper font-black shadow-hard">
                    <RefreshCw className="h-4 w-4 text-cobalt" />
                    Kirim Ulang
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border-2 border-ink bg-bone p-5 shadow-soft">
            <div className="rounded-md border-2 border-ink bg-paper">
              <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-4 py-3">
                <div>
                  <p className="text-xs font-black uppercase text-ink/45">Preview email lokal</p>
                  <p className="font-black">Aktifkan akun ONEDAY kamu</p>
                </div>
                <MailCheck className="h-6 w-6 text-cobalt" />
              </div>
              <div className="space-y-4 p-5 text-sm leading-6 text-ink/68">
                {account && !alreadyVerified ? (
                  <>
                    <p className="font-black text-ink">Halo {account.name},</p>
                    <p>
                      Klik tombol verifikasi untuk membuktikan bahwa kamu punya akses ke email
                      <span className="font-black text-ink"> {account.email}</span>.
                    </p>
                    <div className={`rounded-md border-2 p-4 ${expired ? "border-flame bg-flame/10" : "border-ink bg-acid/25"}`}>
                      <p className="flex items-center gap-2 font-black text-ink">
                        <ShieldCheck className="h-4 w-4 text-cobalt" />
                        {expired ? "Link ini sudah kedaluwarsa" : "Link sekali pakai"}
                      </p>
                      <p className="mt-2">
                        {expired
                          ? "Gunakan tombol Kirim Ulang untuk membuat undangan baru."
                          : `Berlaku sampai ${formatExpiry(expiry)}. Setelah dipakai, akun langsung aktif dan token lama tidak bisa dipakai lagi.`}
                      </p>
                    </div>
                  </>
                ) : alreadyVerified ? (
                  <p>
                    Akun ini sudah aktif. Progress akun tetap mengikuti email yang sama, jadi user cukup login ulang tanpa verifikasi lagi.
                  </p>
                ) : (
                  <p>
                    Tidak ada preview karena email belum punya undangan aktif. Buat akun dari login agar sistem membuat undangan baru.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function StatusTile({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof MailCheck;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-md border-2 border-ink bg-bone p-4">
      <Icon className="h-5 w-5 text-cobalt" />
      <p className="mt-3 text-xs font-black uppercase text-ink/45">{title}</p>
      <p className="mt-1 break-words font-black">{value}</p>
    </div>
  );
}

function formatExpiry(value: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
