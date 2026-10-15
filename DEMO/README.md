# Pinjam.in — Demo HTML Statis

Versi pembelajaran Pinjam.in yang dibuat hanya dengan HTML, CSS, dan JavaScript dasar. Folder ini berdiri sendiri dan tidak memakai React, Tailwind, Supabase, package manager, atau proses build.

## Membuka secara lokal

Klik dua kali `index.html`, lalu pilih akun Mahasiswa atau Admin.

Jika browser membatasi JavaScript pada berkas lokal, jalankan server statis sederhana:

```bash
python3 -m http.server 8080 --directory pinjamin-html-demo
```

Kemudian buka `http://localhost:8080`.

## Halaman

- `index.html` — pemilih akun demo
- `student.html` — katalog Mahasiswa
- `item.html` — detail dan form peminjaman barang
- `loans.html` — riwayat peminjaman Mahasiswa
- `profile.html` — profil dan preferensi
- `admin.html` — dashboard Admin
- `admin-items.html` — tabel pengelolaan barang
- `admin-loans.html` — tabel persetujuan peminjaman

## GitHub Pages

### Pilihan 1: folder ini menjadi isi repository

1. Buat repository GitHub baru.
2. Unggah seluruh **isi** folder `pinjamin-html-demo` ke root repository.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main`, folder `/ (root)`, lalu simpan.

### Pilihan 2: tetap sebagai subfolder

Jika folder ini tetap berada di repository utama, aktifkan GitHub Pages untuk root repository dan akses:

```text
https://USERNAME.github.io/NAMA-REPOSITORY/pinjamin-html-demo/
```

Semua stylesheet, script, dan tautan menggunakan path relatif sehingga dapat berjalan pada kedua cara tersebut.

## Catatan pembelajaran

- Struktur halaman dan komponen visual dapat dilihat langsung di setiap berkas HTML.
- Semua token warna, layout, komponen, dan media query berada di `styles.css`.
- `app.js` menangani SVG icon, pencarian/filter, favorit, keranjang, booking demo, preferensi, serta aksi tabel Admin.
- Data awal bersifat statis. Perubahan hanya disimpan sementara di DOM atau `localStorage` browser dan tidak dikirim ke server.
- Muat ulang halaman untuk mengembalikan perubahan tabel Admin. Hapus penyimpanan situs browser untuk menghapus booking, keranjang, dan preferensi demo.
