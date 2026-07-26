import { LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { emailAccessAction, googleLoginAction } from "@/app/login/actions";
import { PasswordInput } from "@/components/password-input";

export function LoginPanel({
  error,
  errorCode = "",
  next = "",
  title = "Login ONEDAY",
}: {
  error?: boolean;
  errorCode?: string;
  next?: string;
  title?: string;
}) {
  const message = getErrorMessage(errorCode, error);
  const emailInputId = "login-email";
  const passwordInputId = "login-password";
  const errorId = "login-error";

  return (
    <main className="grid min-h-[calc(100svh-4rem)] place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border-2 border-ink bg-paper p-6 shadow-hard">
        <div className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-acid">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <p className="mt-5 text-sm font-black uppercase text-flame">Satu login, akses sesuai akun</p>
        <h1 className="font-display text-5xl leading-none">{title}</h1>
        <p className="mt-3 text-sm text-ink/60">
          Email pembeli akan masuk sebagai user biasa. Admin hanya memakai kredensial private yang sudah ditentukan.
        </p>

        {error ? (
          <div id={errorId} role="alert" className="mt-5 rounded-md border-2 border-flame bg-flame/10 p-3 text-sm font-bold text-flame">
            {message}
          </div>
        ) : null}

        <form action={emailAccessAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="text-xs font-black uppercase text-ink/50" id={`${emailInputId}-label`}>Email</span>
            <input
              id={emailInputId}
              name="email"
              type="email"
              autoComplete="email"
              required
              aria-labelledby={`${emailInputId}-label`}
              aria-describedby={error ? errorId : undefined}
              className="mt-2 h-12 w-full rounded-md border-2 border-ink bg-paper px-3 font-bold outline-none focus:bg-acid/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black uppercase text-ink/50" id={`${passwordInputId}-label`}>Password</span>
            <PasswordInput
              id={passwordInputId}
              autoComplete="current-password"
              required
              ariaLabelledBy={`${passwordInputId}-label`}
            />
          </label>
          <button className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border-2 border-ink bg-ink font-black text-paper shadow-hard">
            <LockKeyhole className="h-5 w-5 text-acid" />
            Masuk / Buat Akun Email
          </button>
          <p className="text-xs font-bold leading-5 text-ink/55">
            Jika email belum terdaftar, sistem akan membuat akun user dan mengirim verifikasi email terlebih dahulu.
          </p>
          <Link href="/forgot-password" className="inline-flex text-sm font-black text-cobalt hover:text-flame">
            Lupa password?
          </Link>
        </form>

        <div className="my-5 flex items-center gap-3">
          <span className="h-0.5 flex-1 bg-ink/15" />
          <span className="text-xs font-black uppercase text-ink/45">atau</span>
          <span className="h-0.5 flex-1 bg-ink/15" />
        </div>

        <form action={googleLoginAction}>
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border-2 border-ink bg-paper font-black shadow-hard transition hover:-translate-y-0.5 hover:bg-bone"
          >
            <GoogleIcon />
            Login menggunakan Google
          </button>
        </form>

      </section>
    </main>
  );
}

function getErrorMessage(errorCode: string, fallback?: boolean) {
  const messages: Record<string, string> = {
    "1": "Email atau password salah.",
    "not-registered": "Akun belum terdaftar atau password salah. Buat akun dulu lewat registrasi email.",
    register: "Email registrasi atau password baru belum valid.",
    "admin-reserved": "Email admin tidak bisa dipakai untuk registrasi user.",
    "already-registered": "Akun sudah terdaftar dan verified. Silakan login.",
    "already-verified": "Akun sudah verified. Silakan login memakai email dan password yang sama.",
    reset: "Link reset password tidak valid. Minta undangan reset baru.",
    verify: "Link verifikasi tidak valid. Daftar ulang untuk membuat link baru.",
    "weak-password": "Password minimal 10 karakter dan harus memuat huruf besar, huruf kecil, serta angka.",
    "rate-limit": "Terlalu banyak percobaan. Tunggu sekitar 15 menit lalu coba lagi.",
  };

  return messages[errorCode] ?? (fallback ? "Email atau password salah." : "");
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.74-.07-1.45-.19-2.13H12v4.03h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.89-1.74 2.98-4.3 2.98-7.43Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.62-2.42l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.75-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.9A6 6 0 0 1 6.1 12c0-.66.11-1.3.31-1.9V7.51H3.06A10 10 0 0 0 2 12c0 1.61.39 3.13 1.06 4.49l3.35-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.98c1.47 0 2.78.5 3.82 1.49l2.87-2.87C16.96 2.99 14.7 2 12 2a10 10 0 0 0-8.94 5.51l3.35 2.59C7.2 7.73 9.4 5.98 12 5.98Z"
      />
    </svg>
  );
}
