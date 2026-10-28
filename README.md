# 📦 Pinjam.in — Standalone Vanilla Web Application (1:1 Multi-Page)

Aplikasi peminjaman perlengkapan kelas Politeknik Negeri Batam (Polibatam) yang dibangun menggunakan **100% Vanilla Web Technologies (HTML5, Modern CSS, ES Modules JavaScript)** tanpa dependensi runtime atau build tools (Vite, React, bundler, dll).

Folder ini adalah **website utuh yang sepenuhnya mandiri (self-contained)** dan dapat dijalankan langsung di browser, web server lokal, maupun platform hosting statis.

---

## 🚀 Fitur Utama

- **1:1 Multi-Page Architecture**: Setiap layar memiliki file HTML dan JavaScript controller tersendiri yang modular.
- **Zero-Dependency**: Tidak memerlukan `npm install`, compiler, atau build step.
- **Modern ES Modules**: Modul JavaScript modular (`api.js`, `auth.js`, `theme.js`, `icons.js`) yang di-load native oleh browser.
- **Desain Flat UI Presisi**: Ditenagai CSS Tokens (`tokens.css`) dan Komponen CSS (`components.css`) dengan warna pill indikator aktif yang hangat (`#38271e`).
- **Dukungan Dark Mode & Wallpaper**: Otomatis mendeteksi preferensi sistem dan dapat disimpan di `localStorage`.
- **Live Supabase REST Backend**: Terhubung langsung ke Supabase Edge Function (`make-server-5a56c1fa`) dengan Bearer JWT tokens.

---

## 📁 Struktur Halaman Lengkap

```
.
├── index.html                # Router utama (redirect sesuai sesi login & peran)
├── 404.html                  # Halaman Error 404 (path absolut, aman di URL mana pun)
├── serve.js                  # Server statis lokal bawaan (Node.js native)
├── package.json              # Skrip npm untuk menjalankan server lokal
├── vercel.json · netlify.toml
│
├── auth/
│   └── login.html            # Layar Masuk (NIM/NIP/Email Polibatam)
│
├── pages/                    # Mahasiswa / Dosen (login wajib)
│   ├── catalog.html          # Beranda (Katalog) — filter, pencarian, booking & keranjang
│   ├── my-loans.html         # Peminjaman Saya — riwayat, timeline, batal & perpanjangan
│   ├── notifications.html    # Notifikasi
│   ├── tolong.html           # Tolong.in — tiket bantuan & chat dengan Admin
│   ├── profile.html          # Profil — data akun, password, foto, tema & latar
│   └── queue.html            # Persetujuan (Dosen) / Pengajuan (Admin)
│
├── admin/                    # Khusus Admin (dijaga guard.js + backend 403)
│   ├── dashboard.html        # Metrik KPI, grafik 8 minggu, barang terpopuler
│   ├── items.html            # Inventaris CRUD, foto, stok & kategori
│   ├── returns.html          # Pengembalian dengan grading kondisi
│   ├── users.html            # Akun pengguna, peran, reset password, riwayat
│   ├── calendar.html         # Matriks ketersediaan 14 hari
│   ├── activity.html         # Log audit sistem
│   ├── notifs.html           # Broadcast notifikasi global
│   └── rules.html            # Aturan peminjaman
│
└── assets/
    ├── css/
    │   ├── tokens.css        # CSS Custom Properties (warna, radius, font, wallpaper)
    │   └── components.css    # Komponen, layout utilities, transisi halaman
    ├── img/
    │   └── 1transparant.svg  # Logo resmi Pinjam.in
    └── js/
        ├── core/             # Modul bersama
        │   ├── api.js        # REST client Supabase, toList(), utilitas tanggal, toast
        │   ├── auth.js       # Sesi, requireAuth, shell sidebar/topbar/bottom bar
        │   ├── routes.js     # Peta URL semua halaman (url('catalog'), homeFor(role))
        │   ├── guard.js      # Guard pra-render (classic script di <head>, data-roles)
        │   ├── theme.js      # Tema terang/gelap, wallpaper, blur, panel kaca (classic script)
        │   └── icons.js      # SVG icon generator (Lucide-compatible)
        ├── auth/login.js     # Controller login
        ├── pages/*.js        # Controller halaman pengguna (nama sama dengan HTML-nya)
        └── admin/*.js        # Controller halaman admin (nama sama dengan HTML-nya)
```

---

## 💻 Cara Menjalankan Secara Lokal

Buka terminal di folder ini, lalu jalankan:
```bash
npm start
# atau
node serve.js
```
Aplikasi akan aktif di **`http://localhost:3000/`**.
Halaman login: `http://localhost:3000/auth/login.html`. Halaman admin ada di `/admin/…` dan halaman pengguna di `/pages/…`.

> **Catatan keamanan:** folder `admin/` dijaga oleh `guard.js` (mengalihkan non-Admin sebelum halaman tampil), tetapi file statis tetap bisa diunduh siapa pun. Perlindungan data yang sebenarnya ada di backend (respons 401/403 untuk peran yang tidak berhak).
