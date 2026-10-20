import { addDays, fmtDate } from '../data'
import { useState } from 'react'
import LoanDetail, { LoanSummary, lateDays } from '../components/LoanDetail'
import { Avatar, Button, Confirm, Empty, ErrorState, Glass, Icon, Overlay, PageHeader, Pill, SearchBox, Segmented, SidePanel, Skeleton, StatusBadge, inputCls, useIsMobile, useIsWide } from '../components/ui'
import { fmtRange, type Loan, type Status } from '../data'
import { useStore } from '../store'

type Mode = 'dosen' | 'admin'
const TABS: Record<Mode, (Status | 'Semua')[]> = {
  dosen: ['Menunggu', 'Disetujui', 'Ditolak'],
  admin: ['Menunggu', 'Disetujui', 'Dipinjam', 'Terlambat', 'Semua'],
}

export default function LoanQueue({ mode }: { mode: Mode }) {
  const { loans, userById, itemNames, setStatus, toast, availableRange, itemById, today, decideExtension, dataStatus, refresh } = useStore()
  const extReqs = loans.filter((l) => l.extension?.state === 'Menunggu')
  const extOk = (l: Loan) => l.items.every((i) => availableRange(i.itemId, addDays(l.end, 1), addDays(l.end, l.extension!.days)) >= i.qty)
  const mobile = useIsMobile()
  const wide = useIsWide()
  const [tab, setTab] = useState<Status | 'Semua'>('Menunggu')
  const [q, setQ] = useState('')
  const [selId, setSelId] = useState<string | null>(null)
  const [action, setAction] = useState<null | 'approve' | 'reject' | 'pickup'>(null)
  const [note, setNote] = useState('')

  const scope = mode === 'dosen' ? loans.filter((l) => TABS.dosen.includes(l.status)) : loans
  const byTab = (t: Status | 'Semua') => (t === 'Semua' ? scope : scope.filter((l) => l.status === t))
  const list = byTab(tab).filter((l) => {
    const s = q.toLowerCase()
    return !s || l.id.toLowerCase().includes(s) || itemNames(l).toLowerCase().includes(s) || (userById(l.userId)?.nama.toLowerCase().includes(s) ?? false)
  })
  const sel = list.find((l) => l.id === selId) ?? (wide ? list[0] : undefined)

  const open = (l: Loan, a: 'approve' | 'reject' | 'pickup') => { setSelId(l.id); setNote(''); setAction(a) }
  const run = async () => {
    if (!sel || !action) return
    if (action === 'approve') {
      const short = sel.items.find((i) => availableRange(i.itemId, sel.start, sel.end) < i.qty)
      if (short) { toast(`Stok ${itemById(short.itemId)?.nama} tidak cukup`, 'danger'); setAction(null); return }
      if (await setStatus(sel.id, 'Disetujui')) toast(`${sel.id} disetujui`)
    }
    if (action === 'reject') { if (await setStatus(sel.id, 'Ditolak', note.trim() || undefined)) toast(`${sel.id} ditolak`, 'info') }
    if (action === 'pickup') { if (await setStatus(sel.id, 'Dipinjam')) toast('Pengambilan dikonfirmasi') }
    setAction(null)
    if (!wide) setSelId(null)
  }

  const actions = (l: Loan, compact?: boolean) => {
    const cls = compact ? 'min-h-9 px-3 text-[13px]' : ''
    if (compact && l.status === 'Menunggu')
      return <><Button variant="secondary" aria-label="Tolak" title="Tolak" className="min-h-9 !px-2.5 !text-danger" icon="x" onClick={(e) => { e.stopPropagation(); open(l, 'reject') }} /><Button variant="success" aria-label="Setujui" title="Setujui" className="min-h-9 !px-2.5" icon="check" onClick={(e) => { e.stopPropagation(); open(l, 'approve') }} /></>
    if (compact && mode === 'admin' && l.status === 'Disetujui')
      return <Button className="min-h-9 px-3 text-[13px]" onClick={(e) => { e.stopPropagation(); open(l, 'pickup') }}>Ambil</Button>
    if (l.status === 'Menunggu')
      return <><Button variant="secondary" className={`${cls} !text-danger`} icon={compact ? undefined : 'x'} onClick={(e) => { e.stopPropagation(); open(l, 'reject') }}>Tolak</Button><Button variant="success" className={cls} icon={compact ? undefined : 'check'} onClick={(e) => { e.stopPropagation(); open(l, 'approve') }}>Setujui</Button></>
    if (mode === 'admin' && l.status === 'Disetujui')
      return <Button className={cls} icon={compact ? undefined : 'box'} onClick={(e) => { e.stopPropagation(); open(l, 'pickup') }}>Konfirmasi Pengambilan</Button>
    return null
  }

  const title = mode === 'dosen' ? 'Persetujuan' : 'Kelola Pengajuan'
  return (
    <div>
      <PageHeader title={title} subtitle={mode === 'dosen' ? 'Tinjau booking yang menunggu persetujuan. Satu persetujuan sudah cukup.' : 'Setujui, tolak, dan konfirmasi pengambilan barang.'} />
      {extReqs.length > 0 && (
        <Glass className="anim-rise mb-4 p-4">
          <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><Icon name="refresh" className="size-[18px] text-primary" />Permintaan perpanjangan <span className="anim-badge rounded-full bg-tint-orange px-2 text-[12px] text-warning">{extReqs.length}</span></p>
          <ul className="flex flex-col gap-2">
            {extReqs.map((l) => (
              <li key={l.id} className="anim-rise flex flex-wrap items-center gap-3 rounded-[16px] bg-white/60 p-3">
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="truncate text-[14px] font-semibold">{userById(l.userId)?.nama} · {itemNames(l)}</p>
                  <p className="text-[13px] text-ink-2">{l.id} · +{l.extension!.days} hari → {fmtDate(addDays(l.end, l.extension!.days))} · "{l.extension!.reason}"</p>
                  {!extOk(l) && <p className="text-[12px] font-semibold text-danger">Stok tidak cukup untuk tanggal tambahan</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="min-h-9 px-3 text-[13px] !text-danger" onClick={async () => { if (await decideExtension(l.id, false)) toast('Perpanjangan ditolak', 'info') }}>Tolak</Button>
                  <Button variant="success" disabled={!extOk(l)} className="min-h-9 px-3 text-[13px]" onClick={async () => { if (await decideExtension(l.id, true)) toast(`${l.id} diperpanjang`) }}>Setujui</Button>
                </div>
              </li>
            ))}
          </ul>
        </Glass>
      )}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Segmented value={tab} onChange={(t) => { setTab(t); setSelId(null) }} className="lg:max-w-2xl lg:flex-1"
          options={TABS[mode].map((t) => ({ value: t, label: t, count: byTab(t).length }))} />
        {!mobile && <div className="glass rounded-[16px] p-1 lg:w-80"><SearchBox value={q} onChange={setQ} placeholder="Cari kode, peminjam, barang" /></div>}
      </div>

      {dataStatus === 'error' ? (
        <Glass><ErrorState onRetry={() => refresh()} /></Glass>
      ) : dataStatus === 'loading' ? (
        <Glass className="p-4"><div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div></Glass>
      ) : list.length === 0 ? (
        <Glass><Empty icon="clipboard" title={tab === 'Menunggu' ? 'Tidak ada pengajuan menunggu' : 'Tidak ada data'} desc={tab === 'Menunggu' ? 'Semua booking sudah diproses. Kerja bagus!' : `Belum ada peminjaman berstatus ${tab}.`} /></Glass>
      ) : mobile ? (
        <div className="flex flex-col gap-2.5">
          {list.map((l) => (
            <button key={l.id} onClick={() => setSelId(l.id)} className="glass tap flex flex-col gap-3 rounded-[20px] p-4 text-left">
              <div className="flex w-full items-start gap-3">
                <div className="min-w-0 flex-1"><LoanSummary loan={l} showBorrower /></div>
                <StatusBadge status={l.status} />
              </div>
              <p className="line-clamp-2 text-[13px] text-ink-2">“{l.keperluan}”</p>
              {l.status === 'Terlambat' && <Pill tone="red">{lateDays(l, today)} hari terlambat</Pill>}
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
          <Glass className="table-scroll overflow-x-auto p-0">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead className="text-[12px] font-semibold uppercase tracking-wide text-ink-2">
                <tr className="border-b border-white/70"><th className="px-3 py-3">Peminjam</th><th className="px-3 py-3">Barang</th><th className="px-3 py-3">Tanggal</th><th className="px-3 py-3">Status</th>{!wide && <th className="px-3 py-3 text-right">Aksi</th>}</tr>
              </thead>
              <tbody>
                {list.map((l) => {
                  const u = userById(l.userId)
                  return (
                    <tr key={l.id} onClick={() => setSelId(l.id)} className={`cursor-pointer border-b border-white/50 transition-colors last:border-0 hover:bg-white/50 ${sel?.id === l.id ? 'bg-white/60' : ''}`}>
                      <td className="px-3 py-3"><div className="flex items-center gap-2.5"><Avatar name={u?.nama ?? '?'} src={u?.foto} className="hidden size-8 text-[12px] xl:grid" /><div><p className="whitespace-nowrap font-semibold">{u?.nama}</p><p className="whitespace-nowrap text-[12px] text-ink-2">{l.id} · {u?.role}</p></div></div></td>
                      <td className="px-3 py-3"><p className="max-w-[160px] truncate font-medium xl:max-w-[220px]">{itemNames(l)}</p><p className="max-w-[160px] truncate text-[12px] text-ink-2 xl:max-w-[220px]">{l.keperluan}</p></td>
                      <td className="whitespace-nowrap px-3 py-3">{fmtRange(l.start, l.end)}</td>
                      <td className="px-3 py-3"><StatusBadge status={l.status} /></td>
                      {!wide && <td className="w-px px-3 py-3"><div className="flex justify-end gap-2">{actions(l, true)}</div></td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Glass>
          {wide && sel && <div><SidePanel title="Detail Pengajuan" footer={actions(sel) ?? undefined}><LoanDetail loan={sel} /></SidePanel></div>}
        </div>
      )}

      {!wide && (
        <Overlay open={!!sel && !action} onClose={() => setSelId(null)} title="Detail Pengajuan" footer={sel ? actions(sel) ?? undefined : undefined}>
          {sel && <LoanDetail loan={sel} />}
        </Overlay>
      )}

      <Confirm open={action === 'approve'} onClose={() => setAction(null)} onConfirm={run} tone="success" confirmLabel="Setujui" title="Setujui booking?"
        message={`${sel?.id} — ${sel ? itemNames(sel) : ''} untuk ${sel ? userById(sel.userId)?.nama : ''}. Stok akan dicadangkan pada tanggal tersebut.`} />
      <Confirm open={action === 'pickup'} onClose={() => setAction(null)} onConfirm={run} confirmLabel="Konfirmasi" title="Konfirmasi pengambilan?"
        message={`Pastikan barang ${sel ? itemNames(sel) : ''} sudah diserahkan ke ${sel ? userById(sel.userId)?.nama : ''}. Status berubah menjadi Dipinjam.`} />
      <Confirm open={action === 'reject'} onClose={() => setAction(null)} onConfirm={run} tone="danger" confirmLabel="Tolak" title="Tolak booking?"
        message={`${sel?.id} akan ditolak dan peminjam menerima notifikasi.`}>
        <label className="mt-4 block text-[13px] font-medium text-ink-2" htmlFor="rnote">Catatan penolakan (opsional)</label>
        <textarea id="rnote" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Barang dipakai untuk acara jurusan." className={`${inputCls()} mt-1.5 py-3`} />
      </Confirm>
    </div>
  )
}
