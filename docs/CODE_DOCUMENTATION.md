# Dokumentasi Kode ONEDAY

Dokumen ini merangkum struktur utama aplikasi agar maintenance lebih mudah.

## Stack

- Next.js App Router untuk halaman, API route, metadata, sitemap, dan robots.
- React client component untuk interaksi keranjang, popup, filter produk, profil, dan dashboard admin.
- Prisma dengan MariaDB/MySQL sebagai database utama.
- NextAuth untuk login Google, ditambah session lokal berbasis cookie HMAC untuk login user/admin lokal.
- Tailwind CSS untuk UI.

## Struktur Penting

- `app/`: halaman user, halaman admin, auth, product detail, checkout, dan API route.
- `components/`: komponen UI reusable seperti header, cart, product card, popup, dashboard admin, dan form.
- `lib/`: domain logic, session, cache header, order, finance, product store, validation, email, dan konfigurasi situs.
- `prisma/schema.prisma`: schema database.
- `scripts/`: setup MariaDB, seed admin, migrasi user JSON legacy, start lokal user/admin, audit lokal, dan security check.
- `data/`: file import legacy/override produk.
- `public/`: aset publik, upload produk, QRIS, dan suara notifikasi admin.

## Jejak Pembersihan Kode

Pembersihan tanggal 27 Juni 2026 menghapus kode yang tidak lagi direferensikan oleh aplikasi aktif:

- `components/doodles.tsx`: dekorasi doodle lama yang sudah tidak di-render.
- `lib/products.ts`: fungsi `recommendSize()` dihapus karena fitur rekomendasi ukuran belum dipakai.
- `lib/orders.ts`: helper legacy `addOrder()` dan `addOrderAwaitingPayment()` dihapus. Alur checkout aktif memakai `createCheckoutOrder()`.
- `lib/product-store.ts`: helper `readCustomProducts()` dihapus. Admin dan user membaca produk aktif lewat `readAllProducts()`.
- `lib/utils.ts`: helper `cn()` dihapus karena hanya dipakai oleh komponen doodle lama.
- `package.json`: dependency `@auth/prisma-adapter`, `clsx`, dan `tailwind-merge` dihapus karena tidak dipakai setelah pembersihan.
- Beberapa export internal dibuat private module saja: `validateAddress`, `cartStorageKey`, `nameFromEmail`, `FinanceEntryType`, dan `AppRole`.
- `components/product-detail.tsx`: preview metrik ukuran per size dihapus dari detail produk. UI aktif hanya menyisakan preset ukuran `S`, `M`, `L`, `XL`, dan `XXL`.
- `components/profile-link.tsx`: polling badge order sekarang berhenti setelah response `401/403`, supaya halaman publik tidak terus mengirim request privat saat pengunjung belum login.
- `scripts/start-all.sh`: deteksi `.tools/node/bin/npm` dibuat lebih aman. Binary lokal hanya dipakai jika benar-benar bisa dijalankan; jika tidak, script memakai `npm` dari `PATH`.
- `debug.log` dan `.tools/start-all.log`: log runtime lokal dihapus dari workspace karena bukan source, bukan datapack, dan sudah masuk daftar ignore.
- `app/globals.css`: style dan keyframe `doodle-*` dihapus karena komponen doodle lama sudah tidak ada. Style `.marker` tetap dipertahankan karena masih dipakai di hero popup.

Catatan: script `scripts/local-audit.mjs`, `scripts/security-check.mjs`, `scripts/migrate-json-users.mjs`, dan `scripts/seed-admin.mjs` tetap dipertahankan. Tool unused-code dapat menandainya sebagai unused, tetapi script ini dipanggil dari `package.json`.

## Alur Produk

1. Produk default ada di `lib/products.ts`.
2. Produk custom legacy dibaca dari `data/import-products.json`.
3. Produk aktif disajikan melalui `lib/product-store.ts`.
4. API publik `/api/products` memakai cache publik singkat.
5. Homepage menampilkan semua produk dulu, lalu filter pil `Semua`, `Terbaru`, `Populer`, dan `Diskon`.

Catatan maintenance: harga diskon dinormalisasi saat create/seed. Diskon invalid, nol, atau lebih besar/sama dengan harga normal dianggap tidak ada diskon.

## Upload Produk

- Upload produk admin ada di `components/new-product-form.tsx` dan server action `app/admin/products/new/actions.ts`.
- Mockup depan dan belakang wajib berformat WebP (`image/webp`) dengan rasio tepat 4:5.
- Form admin hanya membuka file WebP, mengecek dimensi gambar di browser, dan menonaktifkan tombol posting sampai dua mockup valid.
- Server tetap memvalidasi ulang MIME, signature WebP, dan dimensi 4:5 memakai `isFourByFiveWebp()` di `lib/product-validation.ts`.
- File yang lolos disimpan ke `public/uploads/` dengan ekstensi `.webp`. Format JPG, JPEG, PNG, atau rasio selain 4:5 ditolak.

## Performa Katalog

- `readAllProducts()` memakai cache server Next.js selama 60 detik dengan tag `product-catalog`.
- Mutasi produk admin (`addCustomProduct`, `updateStoredProduct`, `deleteStoredProduct`) memanggil `revalidateTag("product-catalog")` agar katalog publik refresh setelah perubahan.
- Homepage, `/products`, dan `/products/[id]` memakai ISR `revalidate = 60`.
- Checkout tetap memvalidasi stok dan produk langsung di database saat order dibuat, sehingga cache katalog hanya untuk tampilan publik, bukan sumber final transaksi.

## Voucher dan Diskon

- Sumber kebenaran voucher ada di `lib/orders.ts` pada `createCheckoutOrder()`.
- Status voucher checkout dibaca dari `POST /api/vouchers/eligibility`, yang memakai `readVoucherEligibility()` untuk mengecek akun, riwayat order, kuota, masa aktif, pemakaian sebelumnya, dan cakupan produk.
- Voucher yang belum memenuhi syarat dibuat gray/disabled di checkout agar tidak bisa dipilih dari UI normal.
- UI checkout hanya menampilkan estimasi atau status `Dicek server`; diskon final ditentukan server saat order dibuat.
- `NEW20` berlaku hanya jika akun belum punya order non-canceled.
- `LOYAL30` berlaku jika akun punya minimal 3 order `DONE`.
- `ONEDAY25` adalah voucher admin/default selama aktif dan belum expired.
- Voucher berkuota diklaim dengan update atomik `usedCount < usageQuota`.
- Order pending mereservasi stok dan voucher selama 30 menit. Saat kedaluwarsa atau dibatalkan sebelum pembayaran, stok, `UserVoucher`, dan `usedCount` dikembalikan.
- Catatan keamanan: disabled/gray di frontend hanya proteksi UX. Proteksi final tetap di `createCheckoutOrder()`, sehingga voucher tetap ditolak jika user mencoba mengirim kode secara manual lewat request.

## Pembatalan Item dan Refund

- User bisa membatalkan pesanan dari tab Profil > Pesanan melalui `POST /api/orders/[id]/cancel-item`.
- Pembatalan dilakukan per 1 unit item order (`OrderItem`), bukan langsung seluruh order.
- Tab Pesanan dan halaman QRIS menampilkan alert status pembayaran: belum selesai harus dibayar dulu, sudah selesai akan dilanjutkan ke proses admin.
- Tab Pesanan menampilkan thumbnail tiap item dan modal preview sebelum cancel, supaya user melihat foto produk, nama, size, SKU, order ID, dan estimasi refund sebelum konfirmasi.
- Field refund/cancel per item ada di `prisma/schema.prisma`: `canceledQuantity`, `refundedQuantity`, `refundTotal`, `refundStatus`, `canceledAt`, dan `refundedAt`.
- Pembatalan user hanya dibuka saat status order `Menunggu Pembayaran`, `Pesanan Masuk`, atau `Diproses`. Status `Dikemas`, `Dikirim`, dan `Selesai` harus diproses manual/admin.
- Fungsi domain `cancelOrderItemForUser()` mengembalikan stok 1 unit, menghitung refund produk setelah alokasi diskon, dan mencatat refund sebagai berhasil secara atomik dalam transaksi database.
- Jika item terakhir dibatalkan, order menjadi `Dibatalkan`, ongkir ikut dilepas/refund, dan voucher dikembalikan.
- Order dengan status `Dibatalkan` atau payment `Kedaluwarsa` tidak dikirim oleh `/api/orders`, sehingga hilang dari tab Pesanan user dan Pesanan Aktif admin. Histori tetap hanya untuk pesanan `Selesai`.
- Catatan payment: refund ini adalah catatan internal yang konsisten di aplikasi. Pencairan uang ke rekening/e-wallet tetap perlu integrasi payment provider nyata jika ingin transfer dana otomatis di luar sistem.

## Payment Sandbox Lokal

- Mode payment lokal dibaca dari `NEXT_PUBLIC_PAYMENT_MODE`.
- `.env` lokal memakai `NEXT_PUBLIC_PAYMENT_MODE="sandbox"` dan `NEXT_PUBLIC_QRIS_IMAGE_URL="/payment/qris-sandbox.png"`.
- Halaman QRIS menampilkan badge sandbox agar QR test Midtrans tidak tertukar dengan QR production.
- QR production tetap gunakan file terpisah, misalnya `/payment/qris-gopay.png`, di environment production.

## Datapack Legacy dan Restore

Jika nanti butuh memulihkan data lama, file yang masih menjadi sumber restore adalah:

- `data/import-products.json`: produk custom legacy yang akan masuk seed saat tabel `Product` masih kosong.
- `data/import-product-overrides.json`: daftar produk default yang disembunyikan dan override produk lama.
- `data/import-orders.json`: order legacy yang akan masuk seed saat tabel `Order` masih kosong.
- `data/registered-users.json`: akun plaintext legacy. Script `scripts/migrate-json-users.mjs` akan memigrasikan akun ke database lalu membersihkan file plaintext.
- `public/uploads/`: aset gambar produk custom legacy.

Yang sudah tidak ada setelah pembersihan adalah helper API kode lama untuk membaca custom-only product dan membuat order non-checkout. Jika datapack lama membutuhkan perilaku itu, pulihkan logic setara dari riwayat perubahan sebelum pembersihan 27 Juni 2026 atau buat ulang lewat alur aktif `readAllProducts()` dan `createCheckoutOrder()`.

## Auth dan Role

- User lokal memakai cookie `oneday_user_session`.
- Admin lokal memakai cookie `oneday_admin_session`.
- Session ditandatangani dengan `AUTH_SECRET`.
- Cookie session dibuat otomatis setelah login/verifikasi berhasil; tidak ada flow konfirmasi cookie terpisah.
- Admin route tetap dicek di page/API guard, bukan hanya middleware.
- API privat memakai `Cache-Control: no-store`.
- Mutasi API memakai guard origin di `lib/auth-guard.ts`. Guard menerima host request, `x-forwarded-host`, env URL production, serta alias lokal `localhost` dan `127.0.0.1` pada port yang sama supaya checkout lokal tidak salah ditolak sebagai `Invalid origin`.

## Notifikasi Admin

- Dashboard admin polling `/api/orders` setiap 4 detik saat tab terlihat.
- Bunyi notifikasi dipicu untuk order dengan `paymentStatus` `Sudah Dibayar` atau `Perlu Dicek`.
- File suara custom production: `public/admin-notifications/order.mp3`.
- Jika file suara belum tersedia atau gagal diputar, dashboard memakai fallback beep Web Audio setelah admin mengaktifkan suara.

## Foto Profil

- Foto profil user dipilih dari browser melalui `components/profile-dashboard.tsx`.
- Gambar diproses di client: auto-crop area badan atas, resize 512x512, lalu convert ke WebP kualitas 0.82.
- Hasil disimpan di `localStorage` per email user (`oneday_profile_photo:{email}`), jadi tidak menambah beban database/server.
- Tombol Profile di header (`components/profile-link.tsx`) ikut menampilkan foto lokal setelah API memastikan user sedang login.
- Jika foto profil tersedia, tombol header berubah menjadi avatar lingkaran penuh dan teks `Profile` disembunyikan.
- Halaman profil menulis email aktif ke `oneday_profile_photo_current_email`, supaya halaman user lain bisa mengambil foto milik akun yang sedang dipakai di browser.
- Karena penyimpanan masih lokal browser, foto tidak otomatis sinkron antar perangkat.

## Cache dan SEO

- Header keamanan global didefinisikan di `next.config.ts`.
- Cache helper ada di `lib/http-cache.ts`.
- Metadata utama ada di `app/layout.tsx`, homepage, product listing, dan detail produk.
- JSON-LD dipasang untuk website, organization/online store, item list, dan product detail.
- Sitemap dan robots tersedia di `app/sitemap.ts` dan `app/robots.ts`.

## Footer dan Kontak

- Footer homepage ada di `app/page.tsx`.
- Box pesan WhatsApp ada di `components/footer-whatsapp-box.tsx`.
- Nomor tujuan WhatsApp dibaca dari `NEXT_PUBLIC_WHATSAPP_NUMBER` melalui `lib/site-config.ts`.
- Link bantuan footer mencakup About, Keluhan Konsumen, Report Masalah, dan Chat WhatsApp.

## Local Development

```bash
npm install
npm run db:setup
npm run start:all
```

URL lokal:

- User: `http://127.0.0.1:3001`
- Admin: `http://localhost:3002/admin`

Verifikasi sebelum lanjut kerja:

```bash
npm run lint
npm run build
npm run security:check
npm run audit:local
```

`audit:local` perlu server lokal aktif.

## Operasi Database

- `npm run db:setup`: generate Prisma, sync schema lokal, migrasi user JSON legacy, seed admin, dan seed voucher default.
- `npm run db:seed:vouchers`: seed/update voucher default `NEW20`, `LOYAL30`, dan `ONEDAY25`.
- `npm run db:backup`: membuat dump SQL dari `DATABASE_URL` ke `.db-backups/`.
- `DB_RESTORE_CONFIRM=YES npm run db:restore -- .db-backups/nama-backup.sql`: restore SQL ke database yang sedang ditunjuk `DATABASE_URL`.
- `.db-backups/` adalah artefak lokal dan tidak ikut deploy package.

## Deployment Online

Panduan upload online ada di `docs/DEPLOYMENT.md`. Catatan utamanya: jangan upload `.localdb/` atau `.env` lokal; gunakan database MySQL/MariaDB production dan env production terpisah. Local test tetap memakai alur `npm run db:setup` dan `npm run start:all`.
