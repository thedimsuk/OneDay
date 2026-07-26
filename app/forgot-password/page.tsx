import type { Metadata } from "next";
import { KeyRound, MailCheck } from "lucide-react";
import { requestPasswordResetAction } from "@/app/login/actions";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Lupa Password",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className="grid min-h-[calc(100svh-4rem)] place-items-center px-4 py-10">
        <section className="w-full max-w-md rounded-lg border-2 border-ink bg-paper p-6 shadow-hard">
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-acid">
            <KeyRound className="h-7 w-7" />
          </div>
          <p className="mt-5 text-sm font-black uppercase text-flame">Reset password</p>
          <h1 className="font-display text-5xl leading-none">Lupa sandi?</h1>
          <p className="mt-3 text-sm leading-6 text-ink/62">
            Masukkan email user yang sudah verified. Kami siapkan undangan reset password untuk mode lokal.
          </p>

          {params.sent === "1" ? (
            <div className="mt-5 rounded-md border-2 border-ink bg-bone p-4 text-sm font-bold">
              Jika email terdaftar dan verified, undangan reset akan tersedia. Akun admin tidak bisa direset dari sini.
            </div>
          ) : null}

          <form action={requestPasswordResetAction} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase text-ink/50">Email akun</span>
              <input
                name="email"
                type="email"
                className="mt-2 h-12 w-full rounded-md border-2 border-ink bg-paper px-3 font-bold outline-none focus:bg-acid/20"
              />
            </label>
            <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard">
              <MailCheck className="h-5 w-5 text-acid" />
              Kirim Undangan Reset
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
