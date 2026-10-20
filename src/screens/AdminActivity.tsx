import { useEffect, useMemo, useState } from 'react'
import { Button, Chip, Empty, Glass, Icon, PageHeader, Pagination, Pill, SearchBox, Skeleton, inputCls, useIsMobile, usePaged } from '../components/ui'
import { fmtDateTime, timeAgo, type ActivityEntry } from '../data'
import { useStore } from '../store'

export const ACTION_LABEL: Record<string, string> = {
  seed: 'Seed data',
  login: 'Masuk',
  login_gagal: 'Gagal masuk',
  logout: 'Keluar',
  profil_diubah: 'Profil diubah',
  password_diubah: 'Password diubah',
  akun_dibuat: 'Akun dibuat',
  akun_diubah: 'Akun diubah',
  password_direset: 'Password direset',
  akun_dihapus: 'Akun dihapus',
  foto_diunggah: 'Foto diunggah',
  booking_dibuat: 'Booking dibuat',
  pengembalian: 'Pengembalian',
  barang_ditambah: 'Barang ditambah',
  barang_diubah: 'Barang diubah',
  barang_dihapus: 'Barang dihapus',
  kategori_diubah: 'Kategori diubah',
  aturan_diubah: 'Aturan diubah',
  perpanjangan_diminta: 'Perpanjangan diminta',
  perpanjangan_disetujui: 'Perpanjangan disetujui',
  perpanjangan_ditolak: 'Perpanjangan ditolak',
  notifikasi_global: 'Notifikasi global',
  notifikasi_dihapus: 'Notifikasi dihapus',
  tiket_dibuat: 'Tiket dibuat',
  tiket_dibalas: 'Tiket dibalas',
  tiket_ditutup: 'Tiket ditutup',
  tiket_dibuka: 'Tiket dibuka',
  tiket_dihapus: 'Tiket dihapus',
}
export const actionLabel = (a: string) => ACTION_LABEL[a] ?? (a.startsWith('status_') ? `Status: ${a.slice(7)}` : a)
const tone = (a: string): 'gray' | 'green' | 'orange' | 'red' | 'blue' => {
  if (a === 'login_gagal') return 'red'
  if (a === 'login' || a === 'logout') return 'blue'
  if (a.startsWith('barang') || a.startsWith('kategori') || a.startsWith('aturan')) return 'orange'
  if (a.startsWith('akun') || a === 'password_direset' || a === 'notifikasi_global' || a === 'notifikasi_dihapus' || a === 'foto_diunggah') return 'green'
  if (a === 'tiket_dihapus' || a === 'akun_dihapus') return 'red'
  if (a.startsWith('tiket')) return 'blue'
  return 'gray'
}

const ACTION_KEYS = Object.keys(ACTION_LABEL)

export default function AdminActivity() {
  const { fetchActivity, users, userById, toast } = useStore()
  const mobile = useIsMobile()
  const [rows, setRows] = useState<ActivityEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [who, setWho] = useState('semua')
  const [kind, setKind] = useState('semua')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setRows(await fetchActivity())
    } catch (e) {
      toast((e as Error).message, 'danger')
      setRows([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  // Jenis aktivitas yang benar-benar ada di data (untuk filter).
  const kinds = useMemo(() => {
    const set = new Set((rows ?? []).map((r) => r.action))
    const known = ACTION_KEYS.filter((k) => set.has(k))
    const extra = [...set].filter((k) => !ACTION_LABEL[k]).sort()
    return [...known, ...extra]
  }, [rows])

  const list = useMemo(() => {
    const ql = q.toLowerCase()
    return (rows ?? []).filter((r) => {
      if (who !== 'semua' && r.userId !== who) return false
      if (kind !== 'semua' && r.action !== kind) return false
      const d = r.at.slice(0, 10)
      if (from && d < from) return false
      if (to && d > to) return false
      if (ql && ![r.actor, actionLabel(r.action), r.detail ?? '', r.target ?? ''].some((v) => v.toLowerCase().includes(ql))) return false
      return true
    })
  }, [rows, q, who, kind, from, to])

  // Tampilkan 10 kejadian per halaman agar daftar panjang tidak memberatkan.
  const paged = usePaged(list)
  useEffect(() => { paged.setPage(1) }, [q, who, kind, from, to])

  const time = (r: ActivityEntry) => (
    <span className="flex flex-col"><span className="font-medium">{timeAgo(r.at)}</span><span className="text-[12px] text-ink-2">{fmtDateTime(r.at)}</span></span>
  )
  const actorCell = (r: ActivityEntry) => {
    const u = r.userId ? userById(r.userId) : undefined
    return <span className="flex flex-col"><span className="font-semibold">{u?.nama ?? r.actor}</span>{u && <span className="text-[12px] text-ink-2">{u.role}</span>}</span>
  }
  const kindCell = (r: ActivityEntry) => <Pill tone={tone(r.action)}>{actionLabel(r.action)}</Pill>

  return (
    <div>
      <PageHeader title="Aktivitas Sistem" subtitle="Semua kejadian penting tercatat di sini." action={<Button icon="refresh" variant="secondary" onClick={load} loading={loading}>Muat ulang</Button>} />

      <Glass className="mb-4 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="lg:w-72"><SearchBox value={q} onChange={setQ} placeholder="Cari pengguna, aktivitas, detail" /></div>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-2 lg:w-52">Pengguna
            <select value={who} onChange={(e) => setWho(e.target.value)} className={inputCls()}>
              <option value="semua">Semua pengguna</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.nama}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-2 lg:w-56">Jenis aktivitas
            <select value={kind} onChange={(e) => setKind(e.target.value)} className={inputCls()}>
              <option value="semua">Semua jenis</option>
              {kinds.map((k) => <option key={k} value={k}>{actionLabel(k)}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-2 lg:w-40">Dari tanggal
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls()} />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-ink-2 lg:w-40">Sampai tanggal
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls()} />
          </label>
        </div>
        {(who !== 'semua' || kind !== 'semua' || from || to || q) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip active onClick={() => { setQ(''); setWho('semua'); setKind('semua'); setFrom(''); setTo('') }}>Hapus filter</Chip>
            <span className="text-[13px] text-ink-2">{list.length} kejadian ditampilkan</span>
          </div>
        )}
      </Glass>

      {loading ? (
        <Glass className="p-4"><div className="flex flex-col gap-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14" />)}</div></Glass>
      ) : list.length === 0 ? (
        <Glass><Empty icon="clock" title="Tidak ada aktivitas" desc="Coba ubah filter pengguna, jenis, atau rentang tanggal." /></Glass>
      ) : mobile ? (
        <div className="flex flex-col gap-2.5">
          {paged.slice.map((r) => (
            <Glass key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-3">{kindCell(r)}{time(r)}</div>
              <p className="mt-2.5 text-[14px]">{actorCell(r)}</p>
              {r.detail && <p className="mt-1 text-[13px] text-ink-2">{r.detail}</p>}
              {r.target && <p className="mt-1 text-[12px] font-medium text-ink-2">Target: {r.target}</p>}
            </Glass>
          ))}
        </div>
      ) : (
        <Glass className="table-scroll overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-left text-[14px]">
            <thead className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">
              <tr className="border-b border-white/70"><th className="px-4 py-3">Waktu</th><th className="px-4 py-3">Pengguna</th><th className="px-4 py-3">Aktivitas</th><th className="px-4 py-3">Detail</th><th className="px-4 py-3">Target</th></tr>
            </thead>
            <tbody>
              {paged.slice.map((r) => (
                <tr key={r.id} className="border-b border-white/50 last:border-0 hover:bg-white/40">
                  <td className="whitespace-nowrap px-4 py-2.5">{time(r)}</td>
                  <td className="px-4 py-2.5">{actorCell(r)}</td>
                  <td className="px-4 py-2.5">{kindCell(r)}</td>
                  <td className="px-4 py-2.5 text-ink-2">{r.detail ?? '-'}</td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-2">{r.target ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      )}

      <Pagination page={paged.page} pages={paged.pages} total={paged.total} size={paged.size} onPage={paged.setPage} />

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-ink-2"><Icon name="info" className="size-4" />Menampilkan 10 aktivitas per halaman · log menyimpan 2.000 kejadian terbaru.</p>
    </div>
  )
}
