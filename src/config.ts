// Aturan bisnis sementara (placeholder). Nilai di sini adalah DEFAULT;
// Admin bisa mengubahnya lewat halaman Pengaturan Aturan (disimpan di localStorage).
export const CONFIG = {
  maxDaysAheadForBooking: 7,
  maxLoanDurationDays: 3,
  pickupDeadlineDaysAfterStart: 1,
  maxActiveItemTypesPerUser: 3,
  fakeLoadingMs: 650,
}

export type Rules = Pick<typeof CONFIG, 'maxDaysAheadForBooking' | 'maxLoanDurationDays' | 'pickupDeadlineDaysAfterStart' | 'maxActiveItemTypesPerUser'>

export const DEFAULT_RULES: Rules = {
  maxDaysAheadForBooking: CONFIG.maxDaysAheadForBooking,
  maxLoanDurationDays: CONFIG.maxLoanDurationDays,
  pickupDeadlineDaysAfterStart: CONFIG.pickupDeadlineDaysAfterStart,
  maxActiveItemTypesPerUser: CONFIG.maxActiveItemTypesPerUser,
}

export const RULE_META: { key: keyof Rules; label: string; unit: string; min: number; max: number; help: string }[] = [
  { key: 'maxDaysAheadForBooking', label: 'Batas booking ke depan', unit: 'hari', min: 1, max: 30, help: 'Seberapa jauh ke depan pengguna boleh memesan.' },
  { key: 'maxLoanDurationDays', label: 'Durasi pinjam maksimal', unit: 'hari', min: 1, max: 14, help: 'Lama maksimal satu peminjaman.' },
  { key: 'pickupDeadlineDaysAfterStart', label: 'Batas pengambilan', unit: 'hari', min: 0, max: 7, help: 'Setelah lewat, booking yang disetujui otomatis Kedaluwarsa.' },
  { key: 'maxActiveItemTypesPerUser', label: 'Jenis barang aktif per pengguna', unit: 'jenis', min: 1, max: 10, help: 'Juga membatasi jumlah jenis barang di keranjang.' },
]

export const rulesText = (r: Rules) => [
  `Booking paling lambat ${r.maxDaysAheadForBooking} hari ke depan.`,
  `Durasi pinjam maksimal ${r.maxLoanDurationDays} hari.`,
  `Ambil barang paling lambat ${r.pickupDeadlineDaysAfterStart} hari setelah tanggal mulai, atau booking kedaluwarsa.`,
  `Maksimal ${r.maxActiveItemTypesPerUser} jenis barang aktif per pengguna.`,
]
