import { LoanSummary } from '../components/LoanDetail'
import { AnimatedNumber, Button, Empty, ErrorState, Glass, Icon, Skeleton, StatusBadge } from '../components/ui'
import { WEEKLY } from '../data'
import { useStore } from '../store'

export default function AdminDashboard() {
  const { loans, items, nav, itemById, dataStatus, refresh } = useStore()
  const loading = dataStatus === 'loading'
  if (dataStatus === 'error')
    return (
      <div>
        <div className="mb-5"><h1 className="text-[28px] font-bold tracking-tight md:text-[34px]">Dashboard</h1></div>
        <Glass><ErrorState onRetry={() => { refresh() }} /></Glass>
      </div>
    )
  const count = (s: string) => loans.filter((l) => l.status === s).length
  const stats = [
    { label: 'Peminjaman Aktif', value: count('Dipinjam') + count('Terlambat'), icon: 'box', tint: 'bg-tint-blue text-primary-pressed', to: 'admin-returns' as const },
    { label: 'Menunggu Persetujuan', value: count('Menunggu'), icon: 'clock', tint: 'bg-tint-orange text-warning', to: 'admin-loans' as const },
    { label: 'Terlambat', value: count('Terlambat'), icon: 'alert', tint: 'bg-tint-red text-danger', to: 'admin-returns' as const },
    { label: 'Total Barang', value: items.reduce((s, i) => s + i.stok_total, 0), icon: 'grid', tint: 'bg-tint-green text-success', to: 'admin-items' as const, sub: `${items.length} jenis` },
  ]
  const tally: Record<string, number> = {}
  loans.filter((l) => !['Ditolak', 'Dibatalkan'].includes(l.status)).forEach((l) => l.items.forEach((i) => (tally[i.itemId] = (tally[i.itemId] ?? 0) + i.qty)))
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const pending = loans.filter((l) => l.status === 'Menunggu').slice(0, 4)
  const max = Math.max(...WEEKLY.map((w) => w.value))

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[28px] font-bold tracking-tight md:text-[34px]">Dashboard</h1>
        <p className="mt-1 text-[15px] text-ink-2">Ringkasan peminjaman. Laporan ditampilkan di layar saja.</p>
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {stats.map((s) =>
          loading ? <Glass key={s.label} className="p-4"><Skeleton className="mb-4 size-10" /><Skeleton className="h-7 w-12" /><Skeleton className="mt-2 h-4 w-3/4" /></Glass> : (
            <button key={s.label} onClick={() => nav(s.to)} className="glass lg-rim lg-refract tap rounded-[20px] p-4 text-left hover:bg-white/70 md:p-5">
              <span className={`mb-3 grid size-10 place-items-center rounded-[12px] ${s.tint}`}><Icon name={s.icon} /></span>
              <AnimatedNumber value={s.value} className="block text-[28px] font-bold leading-none tracking-tight md:text-[34px]" />
              <p className="mt-1.5 text-[13px] font-medium text-ink-2">{s.label}{s.sub ? ` · ${s.sub}` : ''}</p>
            </button>
          ),
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Glass className="p-5">
          <div className="mb-4 flex items-baseline justify-between"><h2 className="text-[20px] font-semibold">Peminjaman per minggu</h2><span className="text-[13px] font-medium text-ink-2">8 minggu terakhir</span></div>
          {loading ? <Skeleton className="h-52" /> : (
            <div className="flex h-52 items-end gap-2 md:gap-3" role="img" aria-label={`Grafik batang: ${WEEKLY.map((w) => `${w.label} ${w.value}`).join(', ')}`}>
              {WEEKLY.map((w, i) => (
                <div key={w.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[12px] font-semibold text-ink-2 opacity-0 transition-opacity group-hover:opacity-100">{w.value}</span>
                  <div className={`w-full max-w-[44px] rounded-t-[8px] rounded-b-[3px] transition-all ${i === WEEKLY.length - 1 ? 'bg-primary' : 'bg-primary/35 group-hover:bg-primary/60'}`} style={{ height: `${(w.value / max) * 82}%` }} />
                  <span className="whitespace-nowrap text-[11px] font-medium text-ink-2">{i === WEEKLY.length - 1 ? 'Ini' : w.label}</span>
                </div>
              ))}
            </div>
          )}
        </Glass>
        <Glass className="p-5">
          <h2 className="mb-3 text-[20px] font-semibold">Paling sering dipinjam</h2>
          {loading ? <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8" />)}</div> : top.length === 0 ? <Empty title="Belum ada data" /> : (
            <ol className="flex flex-col gap-3">
              {top.map(([id, n], i) => (
                <li key={id} className="flex items-center gap-3">
                  <span className="w-5 text-[13px] font-bold text-ink-2">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[14px]"><span className="truncate font-semibold">{itemById(id)?.nama}</span><span className="font-medium text-ink-2">{n}×</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/70"><div className="h-full rounded-full bg-primary" style={{ width: `${(n / top[0][1]) * 100}%` }} /></div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Glass>
        <Glass className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-[20px] font-semibold">Pengajuan terbaru</h2><Button variant="ghost" onClick={() => nav('admin-loans')}>Lihat semua</Button></div>
          {loading ? <Skeleton className="h-24" /> : pending.length === 0 ? <Empty icon="check" title="Tidak ada pengajuan menunggu" /> : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {pending.map((l) => (
                <button key={l.id} onClick={() => nav('admin-loans')} className="tap flex items-center gap-3 rounded-[16px] bg-white/55 p-3 text-left hover:bg-white/80">
                  <div className="min-w-0 flex-1"><LoanSummary loan={l} showBorrower /></div><StatusBadge status={l.status} />
                </button>
              ))}
            </div>
          )}
        </Glass>
      </div>
    </div>
  )
}
