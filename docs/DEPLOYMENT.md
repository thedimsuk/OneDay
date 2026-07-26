# Deployment ONEDAY

Dokumen ini untuk upload aplikasi ke server online sambil tetap mempertahankan mode test lokal.

## Prinsip Aman

- Jangan upload `.localdb/`. Folder itu hanya MariaDB lokal user-space untuk test.
- Jangan upload `.env` development. Buat `.env` baru di server production.
- Jangan upload `node_modules`, `.next`, `.next-user`, atau `.next-admin`.
- Jangan upload `.db-backups/` ke server publik kecuali kamu memang sedang memindahkan backup secara sengaja.
- Upload `public/uploads/` hanya jika produk custom lokal membutuhkan aset gambar tersebut.
- Untuk data database lokal, pakai dump SQL atau datapack JSON, bukan copy mentah datadir MariaDB.

## Local Tetap Jalan

Mode lokal tetap memakai:

```bash
npm install
npm run db:setup
npm run start:all
```

URL lokal:

- User: `http://127.0.0.1:3001`
- Admin: `http://localhost:3002/admin`

## Environment Production

Buat `.env` di server online, bukan dari file lokal. Minimal:

```env
DATABASE_URL="mysql://user:password@host:3306/oneday"
NEXT_PUBLIC_SITE_URL="https://domain-kamu.com"
NEXT_PUBLIC_WHATSAPP_NUMBER="6281234567890"
AUTH_SECRET="secret-production-minimal-32-karakter"
AUTH_TRUST_HOST="true"
AUTH_URL="https://domain-kamu.com"
NEXTAUTH_URL="https://domain-kamu.com"
ADMIN_EMAIL="admin@domain-kamu.com"
ADMIN_PASSWORD="password-admin-production-kuat"
ADMIN_NAME="ONEDAY Admin"
QRIS_WEBHOOK_SECRET="secret-production-provider"
NEXT_PUBLIC_PAYMENT_MODE="production"
NEXT_PUBLIC_QRIS_IMAGE_URL="/payment/qris-gopay.png"
RESEND_API_KEY=""
EMAIL_FROM="ONEDAY <noreply@domain-kamu.com>"
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
AUTH_ADMIN_EMAILS="admin@domain-kamu.com"
```

Cek env sebelum setup:

```bash
npm run db:prod:check
```

## Setup Server Baru

Jika ingin upload manual lewat panel hosting/SSH, buat paket deploy dari lokal:

```bash
npm run deploy:package
```

File akan dibuat di `.deploy/oneday-deploy.tar.gz`. Paket ini sengaja tidak membawa `.env`, `.localdb`, `node_modules`, `.next`, `.tools`, dan file user plaintext legacy.

## Apa Itu `.deploy`

`.deploy/` adalah folder output lokal untuk paket upload. Folder ini bukan source utama aplikasi dan tidak perlu diedit manual.

- Isi utamanya: `.deploy/oneday-deploy.tar.gz`.
- File `.tar.gz` itu adalah arsip kode siap upload ke server.
- Arsip ini membawa source, schema Prisma, script, dokumentasi, `public/`, dan `.env.example`.
- Arsip ini tidak membawa rahasia lokal seperti `.env`, database lokal `.localdb/`, backup `.db-backups/`, `node_modules`, hasil build `.next`, atau folder `.tools`.
- Jika ada perubahan kode, jalankan ulang `npm run deploy:package` agar `.deploy/oneday-deploy.tar.gz` ikut update.

Untuk server awal tanpa migration history:

```bash
npm ci
npm run db:prod:check
npm run db:prod:push
npm run build
npm run start
```

Catatan: `db:prod:push` memakai `prisma db push`, cocok untuk bootstrap awal project ini karena belum ada folder migration. Setelah production stabil, buat migration Prisma yang direview lalu gunakan `prisma migrate deploy`.

## Tes di Vercel

Vercel bisa dipakai untuk test aplikasi Next.js, tetapi database tetap harus eksternal. `.localdb/` dan MariaDB lokal tidak bisa ikut berjalan di Vercel.

Yang perlu disiapkan sebelum deploy Vercel:

1. Buat database MySQL/MariaDB online.
2. Isi environment variable di Vercel Project Settings:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SITE_URL`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST`
   - `AUTH_URL`
   - `NEXTAUTH_URL`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `ADMIN_NAME`
   - `QRIS_WEBHOOK_SECRET`
   - `NEXT_PUBLIC_PAYMENT_MODE`
   - `NEXT_PUBLIC_QRIS_IMAGE_URL`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `AUTH_GOOGLE_ID`
   - `AUTH_GOOGLE_SECRET`
   - `AUTH_ADMIN_EMAILS`
3. Untuk test awal tanpa domain custom, pakai URL Vercel seperti `https://nama-project.vercel.app` untuk `NEXT_PUBLIC_SITE_URL`, `AUTH_URL`, dan `NEXTAUTH_URL`.
4. Jalankan setup database sekali setelah env Vercel tersambung:

```bash
npm run db:prod:push
```

Catatan: jika deploy lewat dashboard Vercel, command build default cukup `npm run build`. Jangan jalankan `db:prod:push` sebagai build command rutin; jalankan hanya saat setup/update schema yang memang kamu inginkan.

Jika memakai Vercel CLI:

```bash
npx vercel
npx vercel env pull .env.vercel.local
npm run db:prod:check
npm run db:prod:push
npx vercel --prod
```

Untuk Google login di Vercel, tambahkan callback:

```text
https://nama-project.vercel.app/api/auth/callback/google
```

Jika muncul halaman `404 NOT_FOUND` dari Vercel:

- Pastikan URL yang dibuka adalah URL deployment/project yang benar, misalnya `https://nama-project.vercel.app`, bukan URL lama yang sudah dihapus.
- Pastikan Project Settings -> Root Directory mengarah ke root repo yang berisi `package.json`, `app/`, `next.config.ts`, dan `vercel.json`.
- Pastikan Vercel mendeteksi Framework Preset `Next.js`. Repo ini menyediakan `vercel.json` dengan `"framework": "nextjs"` untuk membantu deteksi.
- Pastikan build terakhir statusnya `Ready`, bukan `Failed` atau `Canceled`.
- Buka tab Deployment Logs di Vercel. Jika build gagal karena database, isi `DATABASE_URL` online dulu lalu redeploy.
- Jangan upload `.deploy/oneday-deploy.tar.gz` sebagai isi project mentah ke Vercel Dashboard. Untuk Vercel, paling aman connect Git repository atau jalankan `npx vercel` dari root project.

## Upload Data Lokal ke Server

Pilihan paling aman:

1. Upload kode aplikasi tanpa `.localdb`, `.env`, `node_modules`, dan `.next`.
2. Siapkan database MySQL/MariaDB kosong di server.
3. Jalankan `npm run db:prod:push`.
4. Jika butuh produk legacy, sertakan:
   - `data/import-products.json`
   - `data/import-product-overrides.json`
   - `public/uploads/`
5. Jika butuh order/user dari database lokal, export SQL dari lokal lalu import ke server.

Script yang sudah disediakan:

```bash
npm run db:backup
DB_RESTORE_CONFIRM=YES npm run db:restore -- .db-backups/nama-backup.sql
```

`db:backup` membaca `DATABASE_URL` dari `.env` lalu membuat file SQL di `.db-backups/`. Folder ini sengaja di-ignore dan tidak ikut paket deploy. `db:restore` juga membaca `DATABASE_URL`, jadi hanya jalankan setelah kamu yakin `.env` mengarah ke database target yang benar.

Contoh dump SQL dari database lokal biasa:

```bash
mysqldump -u oneday -p oneday > oneday-backup.sql
mysql -u user_server -p nama_database < oneday-backup.sql
```

Jika database lokal memakai `.localdb/` user-space, jalankan dump melalui binary MariaDB lokal yang pernah dibuat:

```bash
BASE="$HOME/.local/share/oneday-mariadb"
LD_LIBRARY_PATH="$BASE/root/usr/lib:$LD_LIBRARY_PATH" \
  "$BASE/root/usr/bin/mariadb-dump" \
  --protocol=socket \
  --socket="$BASE/run/mariadb.sock" \
  -u oneday -poneday_dev_password oneday > oneday-backup.sql
```

## Aset Wajib

Pastikan file berikut ada di production jika fiturnya aktif:

- QRIS: `public/payment/qris-gopay.png`
- Suara admin: `public/admin-notifications/order.mp3`
- Upload produk custom: `public/uploads/...`

## Checklist Sebelum Go Live

```bash
npm run lint
npm run security:check
npm run build
```

Setelah server hidup:

```bash
AUDIT_URL="https://domain-kamu.com" npm run audit:local
```

Checklist manual:

- Login admin berhasil.
- Produk tampil dan detail produk bisa dibuka.
- Checkout membuat order pending.
- QRIS muncul di halaman pembayaran.
- Webhook QRIS diuji dengan kontrak provider asli.
- Email verification/reset memakai sender production.
- Footer WhatsApp memakai nomor CS asli dari `NEXT_PUBLIC_WHATSAPP_NUMBER`.
- Google callback production sudah didaftarkan:
  `https://domain-kamu.com/api/auth/callback/google`
