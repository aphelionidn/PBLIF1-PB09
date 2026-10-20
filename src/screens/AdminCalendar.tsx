import { useState } from 'react'
import { LoanSummary } from '../components/LoanDetail'
import { Chip, Empty, ErrorState, Glass, Icon, IconButton, Overlay, PageHeader, Skeleton, StatusBadge, useIsMobile } from '../components/ui'
import { addDays, fmtDate, fmtMonth, monthGrid, shiftMonth, type Loan } from '../data'
import { OCCUPYING, useStore } from '../store'

const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const heat = (used: number, total: number) => {
  if (total === 0 || used >= total) return 'bg-tint-red text-danger'
  if (used === 0) return 'bg-white/50 text-ink-2'
  return used / total >= 0.5 ? 'bg-tint-orange text-warning' : 'bg-tint-blue text-primary-pressed'
}

export default function AdminCalendar() {
  const { items, loans, usedOn, today, itemById, dataStatus, refresh } = useStore()
  const mobile = useIsMobile()
  const [offset, setOffset] = useState(0)
  const [mOff, setMOff] = useState(0)
  const [pick, setPick] = useState<{ itemId: string; date: string } | null>(null)
  const [itemId, setItemId] = useState(items[0]?.id)
  const start = addDays(today, offset)
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i))
  const loansOn = (id: string, d: string): Loan[] =>
    loans.filter((l) => OCCUPYING.includes(l.status) && l.items.some((x) => x.itemId === id) && d >= l.start && d <= (l.status === 'Terlambat' && l.end < today ? today : l.end))

  const nav = (
    <div className="flex items-center gap-1">
      <IconButton icon="left" label="Minggu sebelumnya" onClick={() => setOffset((o) => o - 7)} className="glass" />
      <button onClick={() => setOffset(0)} className="glass lg-rim tap min-h-11 rounded-full px-4 text-[14px] font-semibold">Hari ini</button>
      <IconButton icon="right" label="Minggu berikutnya" onClick={() => setOffset((o) => o + 7)} className="glass" />
    </div>
  )
  const legend = (
    <div className="flex flex-wrap gap-3 text-[12px] font-medium text-ink-2">
      {[['bg-white/70', 'Kosong'], ['bg-tint-blue', 'Sebagian'], ['bg-tint-orange', '≥ 50% terpakai'], ['bg-tint-red', 'Penuh']].map(([c, t]) => <span key={t} className="flex items-center gap-1.5"><span className={`size-3 rounded-[4px] ${c} ring-1 ring-black/10`} />{t}</span>)}
    </div>
  )

  if (dataStatus === 'error') return <><PageHeader title="Kalender Ketersediaan" /><Glass><ErrorState onRetry={() => refresh()} /></Glass></>
  if (dataStatus === 'loading') return <><PageHeader title="Kalender Ketersediaan" /><Glass className="p-4"><Skeleton className="h-64" /></Glass></>
  if (!items.length) return <><PageHeader title="Kalender Ketersediaan" /><Glass><Empty icon="calendar" title="Belum ada barang" desc="Tambahkan barang untuk melihat kalender." /></Glass></>

  const picked = pick ? loansOn(pick.itemId, pick.date) : []
  const detail = (
    <Overlay open={!!pick} onClose={() => setPick(null)} title={pick ? `${itemById(pick.itemId)?.nama} · ${fmtDate(pick.date)}` : ''}>
      {picked.length === 0 ? <Empty icon="check" title="Semua unit tersedia" desc="Tidak ada peminjaman pada tanggal ini." /> : (
        <ul className="flex flex-col gap-2">
          {picked.map((l, i) => (
            <li key={l.id} className="anim-rise flex items-center justify-between gap-3 rounded-[16px] bg-white/60 p-3" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="min-w-0"><LoanSummary loan={l} showBorrower /></div>
              <div className="flex shrink-0 flex-col items-end gap-1"><StatusBadge status={l.status} /><span className="text-[12px] font-medium text-ink-2">{l.items.find((x) => x.itemId === pick!.itemId)?.qty} unit</span></div>
            </li>
          ))}
        </ul>
      )}
    </Overlay>
  )

  if (mobile) {
    const it = itemById(itemId!) ?? items[0]
    const month = shiftMonth(today.slice(0, 7), mOff)
    const grid = monthGrid(month)
    return (
      <div>
        <PageHeader title="Kalender" subtitle="Unit tersedia per hari." />
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4">{items.map((x) => <Chip key={x.id} active={x.id === it.id} onClick={() => setItemId(x.id)}>{x.nama}</Chip>)}</div>
        <div className="mb-3 flex items-center justify-between">
          <IconButton icon="left" label="Bulan sebelumnya" onClick={() => setMOff((o) => o - 1)} className="glass" />
          <button onClick={() => setMOff(0)} key={month} className="anim-fade text-[17px] font-semibold capitalize">{fmtMonth(month)}</button>
          <IconButton icon="right" label="Bulan berikutnya" onClick={() => setMOff((o) => o + 1)} className="glass" />
        </div>
        <Glass className="p-3">
          <div className="mb-1 grid grid-cols-7 text-center text-[12px] font-medium text-ink-2">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              if (!d) return <span key={'e' + i} />
              const used = usedOn(it.id, d)
              const free = Math.max(0, it.stok_total - used)
              return (
                <button key={d} onClick={() => setPick({ itemId: it.id, date: d })}
                  className={`tap flex h-12 flex-col items-center justify-center rounded-[10px] ${heat(used, it.stok_total)} ${d === today ? 'ring-2 ring-primary' : ''} ${d < today ? 'opacity-50' : ''}`}>
                  <span className="text-[13px] font-semibold text-ink">{Number(d.slice(8))}</span>
                  <span className="text-[10px] font-semibold">{free}/{it.stok_total}</span>
                </button>
              )
            })}
          </div>
        </Glass>
        <div className="mt-3">{legend}</div>
        {detail}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Kalender Ketersediaan" subtitle="Unit terpakai / total per barang selama 14 hari. Klik sel untuk melihat peminjamnya." action={nav} />
      <p className="-mt-2 mb-3 text-[17px] font-semibold capitalize">{fmtMonth(days[0].slice(0, 7))}{days[13].slice(0, 7) !== days[0].slice(0, 7) ? ` – ${fmtMonth(days[13].slice(0, 7))}` : ''}</p>
      <Glass className="table-scroll overflow-x-auto p-0">
        <table className="w-full border-separate border-spacing-1 p-2 text-[13px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[180px] px-2 py-2 text-left font-semibold text-ink-2">Barang</th>
              {days.map((d) => {
                const dt = new Date(d + 'T00:00:00')
                return <th key={d} className={`min-w-[52px] rounded-[10px] py-1.5 font-medium ${d === today ? 'bg-primary text-on' : 'text-ink-2'}`}><span className="block text-[11px]">{DOW[dt.getDay()]}</span><span className="text-[15px] font-semibold">{dt.getDate()}</span>{dt.getDate() === 1 && <span className="block text-[10px] font-semibold uppercase">{dt.toLocaleDateString('id-ID', { month: 'short' })}</span>}</th>
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((it, r) => (
              <tr key={it.id} className="anim-rise" style={{ animationDelay: `${r * 40}ms` }}>
                <td className="sticky left-0 z-10 truncate rounded-[10px] bg-white/85 px-2 font-semibold">{it.nama}<span className="block text-[11px] font-medium text-ink-2">{it.stok_total} unit</span></td>
                {days.map((d) => {
                  const used = usedOn(it.id, d)
                  return (
                    <td key={d} className="p-0">
                      <button onClick={() => setPick({ itemId: it.id, date: d })} aria-label={`${it.nama} ${fmtDate(d)}: ${used} dari ${it.stok_total} terpakai`}
                        className={`tap grid h-11 w-full place-items-center rounded-[10px] font-semibold tabular-nums hover:ring-2 hover:ring-primary/50 ${heat(used, it.stok_total)}`}>
                        {used}/{it.stok_total}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Glass>
      <div className="mt-3 flex items-center justify-between">{legend}<span className="flex items-center gap-1 text-[12px] text-ink-2"><Icon name="info" className="size-4" />Termasuk Disetujui, Dipinjam & Terlambat</span></div>
      {detail}
    </div>
  )
}
