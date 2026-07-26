# ONEDAY Streetwear

E-commerce Next.js untuk katalog, keranjang, checkout QRIS, profil/alamat, dashboard admin, stok, voucher, dan laporan keuangan.

## Menjalankan Lokal

Prasyarat Linux: Node.js LTS, npm, dan MariaDB/MySQL yang berjalan lokal.

```bash
cp .env.example .env
npm install
npm run db:install:fedora
npm run start:all
```

Jika MariaDB sudah terpasang dan database sudah siap, cukup jalankan:

```bash
npm install
npm run db:setup
npm run start:all
```

Di Arch Linux, pakai installer lokal ini untuk menyiapkan MariaDB:

```bash
npm run db:install:arch
```

- User: `http://127.0.0.1:3001`
- Admin: `http://localhost:3002/admin`

User dan admin sengaja memakai hostname berbeda agar cookie lokal tidak bertabrakan saat demo dalam satu browser.
Cookie session tersimpan otomatis setelah login atau verifikasi email berhasil; user tidak perlu menekan konfirmasi cookie terpisah.

## Environment Wajib

```env
DATABASE_URL="mysql://user:password@127.0.0.1:3306/oneday"
NEXT_PUBLIC_SITE_URL="http://127.0.0.1:3001"
AUTH_SECRET="secret-acak-minimal-32-byte"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="password-admin-kuat"
ADMIN_NAME="ONEDAY Admin"
QRIS_WEBHOOK_SECRET="secret-dari-provider"
NEXT_PUBLIC_QRIS_IMAGE_URL="/payment/qris-gopay.png"
```

Untuk email production:

```env
RESEND_API_KEY="..."
EMAIL_FROM="ONEDAY <noreply@domain.com>"
```

Untuk Google login:

```env
AUTH_TRUST_HOST="true"
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_ADMIN_EMAILS="admin-google@domain.com"
```

Callback lokal:

- `http://127.0.0.1:3001/api/auth/callback/google`
- `http://localhost:3002/api/auth/callback/google`

## Command

```bash
npm run dev:user
npm run dev:admin
npm run start:all
npm run lint
npm run build
npm run audit:local
npm run security:check
npm run db:install:arch
npm run db:install:fedora
npm run db:install:debian
npm run db:install:auto   # detect OS and run installer automatically (recommended)
npm run db:setup
npm run db:seed:vouchers
npm run db:backup
DB_RESTORE_CONFIRM=YES npm run db:restore -- .db-backups/nama-backup.sql
```

`start:all` menjalankan user dan admin bersama-sama di satu terminal. Tekan `Ctrl+C` untuk menghentikan keduanya.

`db:install:arch` dan `db:install:fedora` menginstall MariaDB sesuai distro, mengaktifkan service, membuat database/user lokal `oneday`, memperbarui `DATABASE_URL` di `.env`, lalu menjalankan `db:setup`. Default password database development adalah `oneday_dev_password`; ubah dengan:

```bash
DB_PASSWORD="password-kuat-lokal" npm run db:install:fedora
```

`db:setup` menyinkronkan schema untuk pengembangan lokal, memigrasikan akun JSON legacy, dan membuat akun admin dari environment. Untuk production gunakan migration yang direview dan `prisma migrate deploy`, bukan `db push` rutin.

`db:backup` membuat dump SQL dari `DATABASE_URL` ke `.db-backups/`. Folder backup ini lokal saja dan tidak ikut paket deploy. `db:restore` menimpa database target dari file SQL dan wajib memakai `DB_RESTORE_CONFIRM=YES`.

`audit:local` dijalankan setelah server lokal aktif. Script ini mengecek route publik utama dan header cache katalog, sebagai smoke test sebelum audit visual manual di handphone, tablet, laptop, dan desktop.

## Pembayaran

Webhook menerima raw JSON dengan header `x-qris-signature` berisi HMAC-SHA256 hexadecimal menggunakan `QRIS_WEBHOOK_SECRET`. Implementasi provider nyata wajib disesuaikan dengan kontrak resmi provider dan diuji sebelum menerima uang sungguhan.

Order pending mereservasi stok selama 30 menit. Harga, diskon, ongkir, voucher, stok, ID order, dan email pembeli selalu ditentukan atau diverifikasi oleh server.

## Aset Lokal

- QRIS: `public/payment/qris-gopay.png`
- Suara admin: `public/admin-notifications/order.mp3`
- Upload produk: `public/uploads/`

## Dokumentasi

- Arsitektur dan alur: `docs/CODE_DOCUMENTATION.md`
- Temuan dan remediasi audit: `docs/AUDIT_REPORT.md`
- Upload/deployment online: `docs/DEPLOYMENT.md`

Sebelum production, selesaikan checklist pada kedua dokumen tersebut dan jalankan lint/build/security check tanpa error.
