import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { resetPasswordAction } from "@/app/login/actions";
import { PasswordInput } from "@/components/password-input";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ?? "";
  const token = params.token ?? "";

  return (
    <>
      <SiteHeader />
      <main className="grid min-h-[calc(100svh-4rem)] place-items-center px-4 py-10">
        <section className="w-full max-w-md rounded-lg border-2 border-ink bg-paper p-6 shadow-hard">
          <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-acid">
            <KeyRound className="h-7 w-7" />
          </div>
          <p className="mt-5 text-sm font-black uppercase text-flame">Password baru</p>
          <h1 className="font-display text-5xl leading-none">Atur sandi baru.</h1>
          <p className="mt-3 text-sm leading-6 text-ink/62">
            Password baru akan dipakai untuk login email <span className="font-black text-ink">{email || "-"}</span>.
          </p>

          <form action={resetPasswordAction} className="mt-6 space-y-4">
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="token" value={token} />
            <label className="block">
              <span className="text-xs font-black uppercase text-ink/50">Password baru</span>
              <PasswordInput />
            </label>
            <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard">
              <KeyRound className="h-5 w-5 text-acid" />
              Simpan Password Baru
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
