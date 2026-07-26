# Laporan Audit Kode ONEDAY

Tanggal audit: 26 Juni 2026. Diperbarui: 27 Juni 2026.

## Ringkasan

Audit dilakukan pada struktur aplikasi, frontend responsive, API/auth, cache, SEO, scripts, dan data produk legacy.

Nilai teknis setelah perbaikan:

- Kerapian kode: 8/10.
- Struktur project: 8/10.
- Pengalaman pengguna: 8/10.
- Fundamental security/cache: 8/10 untuk tahap lokal/development.

## Temuan dan Perbaikan

### 1. Navigasi kategori homepage tidak sinkron dengan pil filter

File:

- `components/site-header.tsx`
- `components/home-product-showcase.tsx`
- `components/hero-drop-popup.tsx`

Temuan: header dan popup memakai link `#new`, `#popular`, dan `#discount`, sementara komponen produk hanya memiliki section `#products`. Akibatnya klik kategori dari header/popup tidak otomatis mengubah filter.

Perbaikan: `HomeProductShowcase` sekarang membaca hash URL saat load dan `hashchange`, lalu mengubah pil aktif sesuai kategori.

### 2. Response API privat belum semuanya no-store

File:

- `lib/auth-guard.ts`
- `app/api/orders/route.ts`
- `app/api/orders/[id]/route.ts`
- `app/api/addresses/route.ts`

Temuan: beberapa response gagal auth/origin/validasi belum memakai header `privateNoStoreHeaders`.

Perbaikan: response privat dan error sensitif sekarang memakai `Cache-Control: no-store`.

### 3. Data produk legacy punya diskon invalid

File:

- `data/import-products.json`
- `lib/product-store.ts`

Temuan: ada produk legacy dengan `discountPrice` lebih besar dari `price`.

Perbaikan: input create/seed produk sekarang menormalkan harga, stok, berat, dan diskon. Diskon invalid otomatis menjadi `null`.

### 4. Boolean sale di kartu produk kurang eksplisit

File:

- `components/product-card.tsx`

Temuan: status sale dihitung sebagai number/undefined.

Perbaikan: status sale dibuat boolean eksplisit agar lebih mudah dibaca dan diaudit.

### 5. Pembersihan kode tidak terpakai

Tanggal: 27 Juni 2026.

File yang diubah:

- `components/doodles.tsx`
- `lib/utils.ts`
- `lib/products.ts`
- `lib/orders.ts`
- `lib/product-store.ts`
- `lib/addresses.ts`
- `lib/cart-storage.ts`
- `lib/email-accounts.ts`
- `lib/finance.ts`
- `lib/session.ts`
- `package.json`
- `package-lock.json`

Temuan: audit unused-code menemukan komponen dekorasi lama, helper order/product lama, helper rekomendasi ukuran, dan dependency yang tidak lagi dipakai oleh alur aplikasi aktif.

Perbaikan: kode yang tidak direferensikan dihapus, dependency tidak terpakai dilepas, dan export internal yang tidak dipakai lintas modul dibuat private. Script maintenance tetap dipertahankan walaupun terdeteksi unused oleh tool statis karena masih dipanggil dari `package.json`.

Catatan restore: jika perlu memulihkan perilaku datapack lama, lihat bagian `Datapack Legacy dan Restore` di `docs/CODE_DOCUMENTATION.md`. Sumber data legacy yang masih dipakai adalah `data/import-products.json`, `data/import-product-overrides.json`, `data/import-orders.json`, `data/registered-users.json`, dan aset `public/uploads/`.

### 6. Audit ulang clean code lokal

Tanggal: 27 Juni 2026.

File yang diubah:

- `components/profile-link.tsx`
- `scripts/start-all.sh`
- `docs/CODE_DOCUMENTATION.md`
- `debug.log`
- `.tools/start-all.log`

Temuan: log lokal menunjukkan request berulang ke `/api/orders` yang mendapat `401` saat pengunjung belum login. Ini bukan bug fatal, tetapi membuat noise di log dan request privat yang tidak perlu. Selain itu, script lokal masih mencoba memakai `.tools/node/bin/npm` hanya berdasarkan flag executable, padahal binary lokal bisa tidak kompatibel dengan environment.

Perbaikan: polling badge profile sekarang berhenti setelah response `401/403`, sehingga halaman publik tidak terus memanggil API order saat belum login. Script `start-all.sh` sekarang mengecek apakah `.tools/node/bin/npm` benar-benar bisa dijalankan sebelum menambahkannya ke `PATH`. File log runtime lokal (`debug.log` dan `.tools/start-all.log`) dihapus dari workspace.

### 7. Audit performa katalog publik

Tanggal: 27 Juni 2026.

File yang diubah:

- `lib/product-store.ts`
- `app/page.tsx`
- `app/products/page.tsx`
- `app/products/[id]/page.tsx`

Temuan: homepage, listing produk, dan detail produk sebelumnya memakai `force-dynamic`, sehingga HTML publik selalu dirender dinamis dan tidak mendapat cache production yang optimal. Katalog produk juga dibaca berulang dari database di beberapa tempat: homepage, listing, detail metadata, detail page, sitemap, cart, checkout, dan API produk.

Perbaikan: pembacaan katalog produk sekarang memakai `unstable_cache` selama 60 detik dengan tag `product-catalog`. Mutasi produk admin (`addCustomProduct`, `updateStoredProduct`, `deleteStoredProduct`) memanggil `revalidateTag` supaya cache katalog dibersihkan setelah produk berubah. Homepage, `/products`, dan `/products/[id]` sekarang memakai ISR `revalidate = 60`.

Hasil build production setelah perbaikan:

- `/`: static ISR, revalidate 1 menit, First Load JS 116 kB.
- `/products`: static ISR, revalidate 1 menit, First Load JS 113 kB.
- `/products/[id]`: SSG/ISR, revalidate 1 menit, First Load JS 116 kB.
- Shared First Load JS: 102 kB.
- `.next/static`: sekitar 1.3 MB.
- Tidak ada aset publik di `public/` yang lebih besar dari 500 KB saat audit.

Hasil cek production server sementara di port `3010`:

- `/`: `x-nextjs-cache: HIT`, `Cache-Control: s-maxage=60, stale-while-revalidate=31535940`, waktu lokal sekitar 0.019 detik.
- `/products`: `x-nextjs-cache: HIT`, `Cache-Control: s-maxage=60, stale-while-revalidate=31535940`, waktu lokal sekitar 0.011 detik.
- `/products/od-005`: `x-nextjs-cache: HIT`, `Cache-Control: s-maxage=60, stale-while-revalidate=31535940`, waktu lokal sekitar 0.018 detik.
- `/api/products`: tetap public cache `s-maxage=60, stale-while-revalidate=300`, waktu lokal sekitar 0.056 detik.

Catatan: halaman privat/admin/checkout tetap dynamic karena berhubungan dengan session, order, stok, pembayaran, atau data user. Validasi stok checkout tetap dilakukan langsung di database saat order dibuat, jadi cache katalog tidak menjadi sumber kebenaran transaksi.

### 8. Audit login page dan login panel

Tanggal: 27 Juni 2026.

File yang diubah:

- `app/login/page.tsx`
- `components/login-panel.tsx`
- `components/password-input.tsx`

Temuan: alur server-side login sudah cukup kuat: rate limit aktif, email dinormalisasi, redirect tujuan disaring dengan `safeUserRedirect`, cookie session `httpOnly`, dan admin diarahkan ke dashboard admin. Perbaikan yang dibutuhkan lebih banyak di UX/accessibility: input belum `required`, belum memakai `autoComplete`, pesan error belum `role="alert"`, dan `next` dari query belum disaring sebelum masuk ke hidden input UI walaupun action server sudah memvalidasi ulang.

Perbaikan: login page sekarang menyaring `next` sebelum mengirim ke `LoginPanel`. Field email/password dibuat wajib, memakai autocomplete browser, dan error login diberi `role="alert"`. `PasswordInput` menerima `id`, `autoComplete`, `required`, dan label aksesibilitas agar bisa dipakai lebih rapi di form lain.

### 9. Audit notifikasi admin

Tanggal: 27 Juni 2026.

File yang diubah:

- `components/admin-dashboard.tsx`

Temuan: dashboard admin sudah melakukan polling order setiap 4 detik saat tab terlihat, dan notifikasi hanya dipicu untuk order dengan `paymentStatus` `Sudah Dibayar` atau `Perlu Dicek`. Notifikasi tidak berbunyi saat load pertama karena sinyal order awal disimpan dulu. Risiko utama ada pada aset audio: kode memakai `/admin-notifications/order.mp3`, tetapi folder production saat audit hanya berisi `.gitkeep`. Akibatnya tombol `Aktifkan Suara` dapat gagal dan UI sebelumnya hanya menyebut browser memblokir suara, padahal penyebabnya bisa file audio belum tersedia.

Perbaikan: dashboard admin sekarang punya fallback beep berbasis Web Audio API. Jika `order.mp3` belum tersedia atau gagal diputar, admin tetap mendapat suara beep setelah gesture user mengaktifkan audio. UI membedakan status `Suara Aktif`, `Beep Aktif`, dan `Browser memblokir suara otomatis`.

Catatan production: tetap siapkan file custom `public/admin-notifications/order.mp3` agar notifikasi memakai suara brand, bukan fallback beep.

### 10. Audit voucher usage dan diskon

Tanggal: 27 Juni 2026.

File yang diubah:

- `app/api/vouchers/eligibility/route.ts`
- `lib/orders.ts`
- `components/checkout-form.tsx`
- `components/profile-dashboard.tsx`

Temuan: perhitungan voucher final sudah berada di server, tetapi UI checkout sebelumnya menghitung semua voucher sebagai diskon pasti. Ini dapat membuat user melihat potongan `NEW20` atau `LOYAL30` di ringkasan, lalu server menolak karena syarat tidak terpenuhi. Selain itu, `paymentMessage` saat checkout gagal sudah diset tetapi belum ditampilkan, sehingga alasan voucher/order ditolak bisa tidak terlihat. Di server, pembersihan order pending kedaluwarsa belum dipanggil tepat sebelum checkout baru, sehingga voucher dari order pending lama dapat tetap tertahan sampai ada proses lain membaca order. Voucher scoped ke produk juga bisa diklaim walau tidak ada produk eligible jika hasil diskonnya nol.

Perbaikan: `createCheckoutOrder()` sekarang memanggil `releaseExpiredReservations()` sebelum validasi voucher/stok. Voucher scoped produk ditolak jika tidak berlaku untuk item keranjang. UI checkout tidak lagi menjanjikan diskon untuk voucher bersyarat; ringkasan menampilkan `Dicek server` dan menampilkan pesan error saat server menolak voucher/order. Panel voucher profil dibuat netral dan mengarahkan user belanja, bukan menampilkan status aktif statis yang bisa keliru.

Perbaikan lanjutan 28 Juni 2026: checkout sekarang memanggil `POST /api/vouchers/eligibility` sebelum user memilih voucher. Voucher yang belum memenuhi syarat dibuat gray/disabled dengan alasan singkat, misalnya pesanan pertama sudah terpakai, loyalty belum cukup transaksi selesai, kuota habis, atau tidak berlaku untuk produk di keranjang. Validasi final tetap berada di `createCheckoutOrder()` agar request manual tetap ditolak.

Aturan server saat audit:

- `NEW20`: hanya untuk akun tanpa order non-canceled sebelumnya.
- `LOYAL30`: butuh minimal 3 order `DONE`.
- `ONEDAY25`: voucher admin/default, valid selama aktif dan belum expired.
- Voucher dengan kuota diklaim secara atomik memakai `usedCount < usageQuota`.
- Voucher dan stok dikembalikan saat order pending kedaluwarsa atau dibatalkan sebelum pembayaran.

### 11. Revisi foto profil user

Tanggal: 28 Juni 2026.

File yang diubah:

- `components/profile-link.tsx`
- `components/profile-dashboard.tsx`
- `docs/CODE_DOCUMENTATION.md`

Perubahan: avatar profil sekarang bisa diklik untuk membuka file picker gambar. Gambar diproses langsung di browser: crop otomatis area badan atas, resize 512x512, convert ke WebP, lalu disimpan di `localStorage` per email user. Ini menjaga render tetap ringan tanpa menambah upload server/database.

Perubahan lanjutan: tombol Profile di header user berubah menjadi avatar lingkaran penuh jika akun yang sedang aktif di browser sudah punya foto profil. Teks `Profile` disembunyikan pada mode avatar supaya header lebih bersih.

Catatan: penyimpanan masih lokal per browser. Jika nanti ingin foto profil sinkron antar perangkat, perlu endpoint upload dan kolom avatar di database atau object storage.

### 12. Wajib WebP 4:5 untuk upload produk

Tanggal: 28 Juni 2026.

File yang diubah:

- `app/admin/products/new/actions.ts`
- `components/new-product-form.tsx`
- `lib/product-validation.ts`
- `docs/CODE_DOCUMENTATION.md`

Perubahan: upload produk admin sekarang wajib memakai WebP rasio tepat 4:5 untuk mockup depan dan belakang. Form admin hanya menerima `image/webp`, mengecek dimensi file di browser, dan tombol posting disabled sampai dua gambar valid. Server action tetap memvalidasi ulang MIME, signature WebP, dan dimensi 4:5 sebelum menyimpan file `.webp` ke `public/uploads/`.

Catatan keamanan: validasi browser hanya untuk UX. Proteksi final tetap di server agar request manual dengan JPG/PNG, file palsu, atau rasio selain 4:5 tetap ditolak.

### 13. Pembatalan item dan refund user

Tanggal: 28 Juni 2026.

File yang diubah:

- `prisma/schema.prisma`
- `app/api/orders/[id]/cancel-item/route.ts`
- `lib/orders.ts`
- `lib/finance.ts`
- `components/profile-dashboard.tsx`
- `docs/CODE_DOCUMENTATION.md`

Perubahan: tab Profil > Pesanan sekarang menyediakan pembatalan per 1 unit item. API user baru memvalidasi owner order, status order, dan item yang dipilih. Proses cancel berjalan dalam transaksi database: `canceledQuantity` bertambah 1, stok produk dikembalikan 1, refund produk dihitung setelah alokasi diskon, dan status refund dicatat berhasil. Jika unit terakhir order dibatalkan, order menjadi `Dibatalkan`, ongkir dilepas/refund, dan voucher dikembalikan.

Perubahan lanjutan: daftar item pesanan sekarang menampilkan thumbnail produk dan membuka modal preview sebelum pembatalan. Modal menampilkan foto produk, nama, size, SKU, order ID, jumlah aktif, dan estimasi refund agar user tidak salah memilih item yang ingin dibatalkan.

Catatan batasan: refund yang dibuat adalah catatan internal aplikasi yang deterministik dan tidak gagal selama transaksi database berhasil. Transfer uang otomatis ke rekening/e-wallet tetap butuh integrasi payment provider production.

Audit runtime 28 Juni 2026: pembatalan sempat gagal di lokal dengan error Prisma `Unknown argument canceledQuantity`. Penyebabnya bukan data order atau route, tetapi dev server masih memegang Prisma Client lama di memory setelah schema refund ditambahkan. Setelah restart `npm run start:all`, endpoint cancel-item berhasil membatalkan order test, mengembalikan stok, dan mencatat refund/pembatalan.

Perubahan lanjutan: order `Dibatalkan` atau payment `Kedaluwarsa` sekarang disaring dari `/api/orders`, tab Pesanan user, dan Pesanan Aktif admin. Tujuannya agar pesanan salah kuantitas/salah checkout yang sudah dibatalkan tidak mengganggu daftar operasional, walau record database tetap ada untuk audit internal.

## Catatan Responsive

- Header fixed sudah diberi ruang lewat `body padding-top: 4rem`.
- Pil kategori memakai horizontal scroll di layar kecil.
- Grid produk memakai 2 kolom mobile, 3 kolom tablet, 4 kolom desktop.
- Popup hero punya close button, Escape key, overlay, dan layout mobile/desktop.

Catatan batasan: environment terminal saat audit tidak memiliki Chromium/Playwright, jadi screenshot responsive otomatis belum dijalankan. Audit responsive perlu dilanjutkan secara visual manual pada lebar mobile, tablet, laptop, dan desktop.

## Verifikasi yang Sudah Dijalankan

```bash
npm run lint
npm run security:check
npm run build
npm run audit:local
```

Hasil:

- Lint: lolos.
- Security heuristic check: lolos.
- Production build: lolos.
- Local route/cache audit: lolos untuk `/`, `/products`, `/login`, `/api/products`, `/robots.txt`, dan `/sitemap.xml`.

Verifikasi tambahan setelah pembersihan 27 Juni 2026:

- `npm run lint`: lolos.
- `npm run security:check`: lolos.
- `npm run audit:local`: lolos setelah server lokal aktif.
- `npm run build`: lolos.
- `npx knip --production --no-exit-code`: sisa temuan hanya script maintenance yang dipanggil dari `package.json`.
- `npm audit --audit-level=low`: masih menemukan advisory moderate `postcss` melalui `next`; belum diperbaiki karena butuh keputusan upgrade Next yang kompatibel.

Verifikasi tambahan audit ulang 27 Juni 2026:

- `npm run lint`: lolos.
- `npm run security:check`: lolos.
- `npm run build`: lolos.
- `npm run audit:local`: lolos saat server lokal user/admin aktif.
- Scan file log lokal: tidak ada `.log`, `.tmp`, `.bak`, atau file `*~` tersisa di tiga level teratas workspace.
- `npm audit --audit-level=low`: masih menemukan advisory moderate `postcss` melalui `next`; belum diperbaiki karena fix otomatis mengarah ke perubahan dependency yang tidak aman untuk diterapkan otomatis.

Verifikasi tambahan audit performa 27 Juni 2026:

- `npm run lint`: lolos.
- `npm run build`: lolos.
- `npm run audit:local`: lolos di dev server lokal.
- Production smoke test sementara (`PORT=3010 npm run start`): homepage, listing, detail produk, dan API produk status `200`.

## Catatan Lanjutan Sebelum Production

- Ganti semua secret development di `.env` dengan secret production.
- Gunakan migration production (`prisma migrate deploy`), bukan `db push` rutin.
- Uji webhook QRIS dengan kontrak provider asli.
- Jalankan audit visual manual di handphone, tablet, laptop, dan desktop.
- Pertimbangkan CSP production setelah semua inline script Next/JSON-LD dipetakan.
