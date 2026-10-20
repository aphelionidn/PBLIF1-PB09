export type Role = 'Mahasiswa' | 'Dosen' | 'Admin'
export type Status = 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Dipinjam' | 'Dikembalikan' | 'Terlambat' | 'Dibatalkan' | 'Kedaluwarsa'
export type Kondisi = 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Hilang'

export interface User { id: string; nama: string; nim_nip: string; email: string; role: Role; aktif: boolean; hp?: string; kota?: string; /** URL foto profil (Supabase Storage) */ foto?: string; /** ISO timestamp aktivitas terakhir (denyut dari server) */ lastSeen?: string; /** id akun Supabase Auth */ authId?: string; /** id seed lama (dari data.ts), dipakai server untuk kompatibilitas */ legacyId?: string }
export interface Item { id: string; nama: string; kategori: string; deskripsi: string; stok_total: number; kondisi: Kondisi; /** URL foto barang (Supabase Storage); kosong = pakai placeholder kategori */ foto?: string }
export interface LoanItem { itemId: string; qty: number; kondisiKembali?: Kondisi }
export interface HistoryEntry { status: Status; at: string; by: string; note?: string }
export interface Loan {
  id: string; userId: string; items: LoanItem[]; start: string; end: string; keperluan: string
  status: Status; approver?: string; note?: string; history: HistoryEntry[]; returnNote?: string
  /** Permintaan perpanjangan (bukan status baru; status loan tetap Dipinjam). */
  extension?: { days: number; reason: string; state: 'Menunggu' | 'Disetujui' | 'Ditolak'; by?: string }
}
export interface Notif { id: string; userId?: string; roles?: Role[]; title: string; message: string; at: string; read: boolean; kind: 'booking' | 'approved' | 'rejected' | 'reminder' | 'overdue' | 'warning' | 'info'; /** diisi untuk notifikasi global (Fase 4) */ broadcastId?: string; notifType?: NotifType }

/** Catatan log aktivitas server (GET /admin/activity). */
export interface ActivityEntry { id: string; at: string; userId?: string; actor: string; action: string; detail?: string; target?: string }

/** Tipe notifikasi global yang bisa dikirim Admin. */
export type NotifType = 'Peringatan' | 'Pesan' | 'Info'

/** Riwayat notifikasi global terkirim + jumlah pembacanya. */
export interface Broadcast { id: string; type: NotifType; title: string; message: string; audience: string; recipientIds: string[]; at: string; by: string; byId: string; recipients: number; read: number; /** server menandai true bila broadcast ini dikirim oleh admin yang sedang masuk */ canDelete?: boolean }

/** Status tiket bantuan (Tolong.in). */
export type ChatStatus = 'Terbuka' | 'Selesai'
/** Satu pesan di dalam tiket Tolong.in. `readBy` menandai siapa saja yang sudah membacanya. */
export interface ChatMessage { id: string; userId: string; by: string; role: Role; text: string; at: string; readBy: string[] }
/** Tiket bantuan (Tolong.in): satu topik yang diobrolkan pengguna dengan Admin. */
export interface ChatTicket { id: string; subject: string; userId: string; by: string; role: Role; status: ChatStatus; at: string; updatedAt: string; messages: ChatMessage[]; closedAt?: string; closedBy?: string }

/** Hanya email kampus Polibatam (termasuk subdomain, mis. students.polibatam.ac.id). */
export const isCampusEmail = (e: string) => /^[^\s@]+@([a-z0-9-]+\.)*polibatam\.ac\.id$/i.test(e.trim())

export const pad = (n: number) => String(n).padStart(2, '0')
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const TODAY = toISO(new Date())
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d)
}
export const day = (n: number) => addDays(TODAY, n)
export const diffDays = (a: string, b: string) => Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)
export const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
export const fmtRange = (a: string, b: string) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`)
export const stamp = (n: number, time = '09.00') => `${fmtDate(day(n))}, ${time}`
/** Format ISO timestamp server → tanggal + jam lokal Indonesia. */
export const fmtDateTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-')
/** "3 menit lalu" ringkas dari ISO timestamp. */
export const timeAgo = (iso?: string) => {
  if (!iso) return 'Belum pernah'
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'Baru saja'
  const m = Math.round(s / 60)
  if (m < 60) return `${m} menit lalu`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.round(h / 24)
  return d < 30 ? `${d} hari lalu` : fmtDateTime(iso)
}

export const CATEGORIES = ['Elektronik', 'Kabel dan Aksesori', 'Alat Tulis', 'Perlengkapan Kelas']

export const ITEMS: Item[] = [
  { id: 'i1', nama: 'Proyektor Epson', kategori: 'Elektronik', stok_total: 3, kondisi: 'Baik', deskripsi: 'Proyektor 3LCD 3.600 lumen, sudah termasuk kabel daya dan tas jinjing.' },
  { id: 'i2', nama: 'Kabel HDMI 5 Meter', kategori: 'Kabel dan Aksesori', stok_total: 6, kondisi: 'Baik', deskripsi: 'Kabel HDMI 2.0 sepanjang 5 meter, mendukung resolusi 4K.' },
  { id: 'i3', nama: 'Terminal Listrik 5 Lubang', kategori: 'Kabel dan Aksesori', stok_total: 8, kondisi: 'Baik', deskripsi: 'Stopkontak 5 lubang dengan saklar dan kabel 3 meter.' },
  { id: 'i4', nama: 'Spidol Papan Tulis (Set)', kategori: 'Alat Tulis', stok_total: 10, kondisi: 'Baik', deskripsi: 'Satu set berisi 4 warna: hitam, biru, merah, hijau.' },
  { id: 'i5', nama: 'Remote AC', kategori: 'Perlengkapan Kelas', stok_total: 4, kondisi: 'Baik', deskripsi: 'Remote universal untuk AC di ruang kelas gedung A dan B.' },
  { id: 'i6', nama: 'Penghapus Papan Tulis', kategori: 'Perlengkapan Kelas', stok_total: 5, kondisi: 'Rusak Ringan', deskripsi: 'Penghapus busa magnetik. Beberapa unit sedikit aus.' },
  { id: 'i7', nama: 'Speaker Portabel', kategori: 'Elektronik', stok_total: 2, kondisi: 'Baik', deskripsi: 'Speaker Bluetooth 20W dengan mikrofon nirkabel.' },
  { id: 'i8', nama: 'Pointer Presentasi', kategori: 'Elektronik', stok_total: 3, kondisi: 'Baik', deskripsi: 'Pointer laser merah dengan tombol slide maju/mundur.' },
]

export const USERS: User[] = [
  { id: 'u1', nama: 'Budi Santoso', nim_nip: '3312601001', email: '3312601001@students.polibatam.ac.id', role: 'Mahasiswa', aktif: true },
  { id: 'u2', nama: 'Dr. Siti Rahma', nim_nip: '198501012010', email: 'siti.rahma@polibatam.ac.id', role: 'Dosen', aktif: true },
  { id: 'u3', nama: 'Admin 3312601048', nim_nip: '3312601048', email: '3312601048@students.polibatam.ac.id', role: 'Admin', aktif: true },
  { id: 'u7', nama: 'Admin 3312601049', nim_nip: '3312601049', email: '3312601049@students.polibatam.ac.id', role: 'Admin', aktif: true },
  { id: 'u4', nama: 'Rina Putri', nim_nip: '3312601014', email: '3312601014@students.polibatam.ac.id', role: 'Mahasiswa', aktif: true },
  { id: 'u5', nama: 'Andi Wijaya', nim_nip: '3312601027', email: '3312601027@students.polibatam.ac.id', role: 'Mahasiswa', aktif: true },
  { id: 'u6', nama: 'Hendra Kusuma, M.T.', nim_nip: '197903152008', email: 'hendra.kusuma@polibatam.ac.id', role: 'Dosen', aktif: false },
]

const h = (status: Status, n: number, by: string, note?: string, time?: string): HistoryEntry => ({ status, at: stamp(n, time), by, note })

export const LOANS: Loan[] = [
  { id: 'PJ-1042', userId: 'u1', items: [{ itemId: 'i1', qty: 1 }, { itemId: 'i2', qty: 1 }], start: day(1), end: day(2), keperluan: 'Presentasi tugas akhir mata kuliah Basis Data', status: 'Menunggu', history: [h('Menunggu', 0, 'Budi Santoso', undefined, '08.12')] },
  { id: 'PJ-1041', userId: 'u1', items: [{ itemId: 'i7', qty: 1 }], start: day(0), end: day(1), keperluan: 'Latihan debat Himpunan Mahasiswa', status: 'Disetujui', approver: 'Dr. Siti Rahma', history: [h('Menunggu', -2, 'Budi Santoso'), h('Disetujui', -1, 'Dr. Siti Rahma', undefined, '10.30')] },
  { id: 'PJ-1038', userId: 'u1', items: [{ itemId: 'i1', qty: 2 }], start: day(3), end: day(3), keperluan: 'Nonton bareng kelas', status: 'Ditolak', approver: 'Admin Pengelola', note: 'Proyektor diprioritaskan untuk acara jurusan.', history: [h('Menunggu', -3, 'Budi Santoso'), h('Ditolak', -2, 'Admin Pengelola', 'Proyektor diprioritaskan untuk acara jurusan.')] },
  { id: 'PJ-1036', userId: 'u4', items: [{ itemId: 'i3', qty: 2 }, { itemId: 'i4', qty: 1 }], start: day(-1), end: day(1), keperluan: 'Workshop desain UI di ruang B204', status: 'Dipinjam', approver: 'Dr. Siti Rahma', history: [h('Menunggu', -3, 'Rina Putri'), h('Disetujui', -2, 'Dr. Siti Rahma'), h('Dipinjam', -1, 'Admin Pengelola', undefined, '07.45')] },
  { id: 'PJ-1029', userId: 'u1', items: [{ itemId: 'i8', qty: 1 }], start: day(-10), end: day(-8), keperluan: 'Seminar proposal', status: 'Dikembalikan', approver: 'Admin Pengelola', history: [h('Menunggu', -12, 'Budi Santoso'), h('Disetujui', -11, 'Admin Pengelola'), h('Dipinjam', -10, 'Admin Pengelola'), h('Dikembalikan', -8, 'Admin Pengelola', 'Kondisi baik.', '15.20')] },
  { id: 'PJ-1031', userId: 'u5', items: [{ itemId: 'i1', qty: 1 }, { itemId: 'i2', qty: 1 }], start: day(-5), end: day(-3), keperluan: 'Kuliah tamu Rekayasa Perangkat Lunak', status: 'Terlambat', approver: 'Dr. Siti Rahma', history: [h('Menunggu', -7, 'Andi Wijaya'), h('Disetujui', -6, 'Dr. Siti Rahma'), h('Dipinjam', -5, 'Admin Pengelola'), h('Terlambat', -2, 'Sistem', 'Melewati tanggal kembali.', '00.00')] },
  { id: 'PJ-1033', userId: 'u2', items: [{ itemId: 'i5', qty: 1 }], start: day(-2), end: day(-2), keperluan: 'Kuliah pagi ruang A101', status: 'Dibatalkan', history: [h('Menunggu', -4, 'Dr. Siti Rahma'), h('Dibatalkan', -3, 'Dr. Siti Rahma', 'Kelas dipindah ke ruang lain.')] },
  { id: 'PJ-1027', userId: 'u5', items: [{ itemId: 'i7', qty: 1 }], start: day(-6), end: day(-5), keperluan: 'Acara penyambutan mahasiswa baru', status: 'Kedaluwarsa', approver: 'Admin Pengelola', history: [h('Menunggu', -8, 'Andi Wijaya'), h('Disetujui', -7, 'Admin Pengelola'), h('Kedaluwarsa', -5, 'Sistem', 'Barang tidak diambil tepat waktu.', '00.00')] },
  { id: 'PJ-1043', userId: 'u2', items: [{ itemId: 'i4', qty: 2 }, { itemId: 'i6', qty: 1 }], start: day(2), end: day(3), keperluan: 'Ujian tengah semester kelas Statistika', status: 'Menunggu', history: [h('Menunggu', 0, 'Dr. Siti Rahma', undefined, '09.40')] },
  { id: 'PJ-1044', userId: 'u4', items: [{ itemId: 'i8', qty: 1 }], start: day(1), end: day(1), keperluan: 'Presentasi kelompok Kewirausahaan', status: 'Menunggu', history: [h('Menunggu', 0, 'Rina Putri', undefined, '10.05')] },
]

export const NOTIFS: Notif[] = [
  { id: 'n1', roles: ['Dosen', 'Admin'], kind: 'booking', title: 'Booking baru masuk', message: 'Rina Putri mengajukan Pointer Presentasi untuk besok.', at: 'Hari ini, 10.05', read: false },
  { id: 'n2', userId: 'u1', kind: 'approved', title: 'Booking disetujui', message: 'PJ-1041 (Speaker Portabel) disetujui oleh Dr. Siti Rahma. Silakan ambil hari ini.', at: 'Kemarin, 10.30', read: false },
  { id: 'n3', userId: 'u1', kind: 'rejected', title: 'Booking ditolak', message: 'PJ-1038 ditolak: Proyektor diprioritaskan untuk acara jurusan.', at: '2 hari lalu', read: true },
  { id: 'n4', userId: 'u1', kind: 'reminder', title: 'Pengingat pengembalian', message: 'Speaker Portabel harus dikembalikan besok sebelum 16.00.', at: 'Hari ini, 07.00', read: false },
  { id: 'n5', roles: ['Admin'], userId: 'u5', kind: 'overdue', title: 'Peminjaman terlambat', message: 'PJ-1031 (Proyektor Epson, Kabel HDMI) terlambat 3 hari.', at: 'Hari ini, 00.00', read: false },
]

// Jumlah peminjaman per minggu (8 minggu terakhir) untuk grafik dashboard.
export const WEEKLY = [
  { label: 'M-7', value: 9 }, { label: 'M-6', value: 12 }, { label: 'M-5', value: 8 }, { label: 'M-4', value: 15 },
  { label: 'M-3', value: 11 }, { label: 'M-2', value: 17 }, { label: 'M-1', value: 14 }, { label: 'Minggu ini', value: 10 },
]

/** Grid bulan penuh: null untuk sel kosong sebelum tanggal 1. `ym` = 'YYYY-MM'. */
export const monthGrid = (ym: string): (string | null)[] => {
  const [y, m] = ym.split('-').map(Number)
  const first = new Date(y, m - 1, 1).getDay()
  const count = new Date(y, m, 0).getDate()
  return [...Array<null>(first).fill(null), ...Array.from({ length: count }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)]
}
export const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
export const fmtMonth = (ym: string) => new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

export const fmtUsers = (ids: string[], users: User[]) => ids.length === 0 ? '-' : ids.slice(0, 6).map((i) => { const u = users.find((x) => x.id === i); return u ? u.nama : '-'; }).join(', ')
