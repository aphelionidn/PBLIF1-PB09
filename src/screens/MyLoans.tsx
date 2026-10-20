import { addDays, fmtDate } from '../data'
import { useState } from 'react'
import LoanDetail, { LoanSummary } from '../components/LoanDetail'
import { Button, Confirm, Empty, ErrorState, Field, Glass, Icon, Overlay, Skeleton, inputCls, PageHeader, Segmented, SidePanel, StatusBadge, useIsMobile } from '../components/ui'
import type { Loan, Status } from '../data'
import { useStore } from '../store'

type Tab = 'Semua' | 'Menunggu' | 'Aktif' | 'Selesai'
const GROUP: Record<Exclude<Tab, 'Semua'>, Status[]> = {
  Menunggu: ['Menunggu'],
  Aktif: ['Disetujui', 'Dipinjam', 'Terlambat'],
  Selesai: ['Dikembalikan', 'Ditolak', 'Dibatalkan', 'Kedaluwarsa'],
}

export default function MyLoans() {
  const { loans, me, setStatus, toast, nav, requestExtension, rules, itemById, availableRange, dataStatus, refresh } = useStore()
  const [ext, setExt] = useState(false)
  const [extDays, setExtDays] = useState(1)
  const [extReason, setExtReason] = useState('')
  const [extErr, setExtErr] = useState('')
  const mobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('Semua')
  const [selId, setSelId] = useState<string | null>(null)
  const [cancel, setCancel] = useState(false)

  const mine = loans.filter((l) => l.userId === me?.id)
  const list = tab === 'Semua' ? mine : mine.filter((l) => GROUP[tab].includes(l.status))
  const sel = mine.find((l) => l.id === selId) ?? (mobile ? undefined : list[0])
  const canCancel = (l: Loan) => l.status === 'Menunggu' || l.status === 'Disetujui'
  const count = (t: Tab) => (t === 'Semua' ? mine.length : mine.filter((l) => GROUP[t].includes(l.status)).length)

  const doCancel = async () => {
    if (!sel) return
    const ok = await setStatus(sel.id, 'Dibatalkan', 'Dibatalkan oleh peminjam.')
    setCancel(false)
    if (ok) toast('Booking dibatalkan')
  }
  const canExtend = (l: Loan) => l.status === 'Dipinjam' && l.extension?.state !== 'Menunggu' && l.extension?.state !== 'Disetujui'
  const extFree = (l: Loan, d: number) => Math.min(...l.items.map((i) => availableRange(i.itemId, addDays(l.end, 1), addDays(l.end, d)) - i.qty + 0)) >= 0
  const sendExt = async () => {
    if (!sel) return
    if (extReason.trim().length < 5) return setExtErr('Tulis alasan minimal 5 karakter.')
    if (!extFree(sel, extDays)) return setExtErr('Stok tidak cukup untuk tanggal perpanjangan. Coba lebih singkat.')
    const ok = await requestExtension(sel.id, extDays, extReason.trim())
    if (!ok) return
    setExt(false); setExtReason(''); setExtErr(''); setExtDays(1)
    toast('Permintaan perpanjangan dikirim')
  }
  const cancelBtn = sel && (canCancel(sel)
    ? <Button variant="danger" icon="x" onClick={() => setCancel(true)}>Batalkan Booking</Button>
    : canExtend(sel) ? <Button variant="secondary" icon="refresh" onClick={() => setExt(true)}>Minta Perpanjangan</Button> : null)

  return (
    <div>
      <PageHeader title="Peminjaman Saya" subtitle="Pantau status booking dan riwayat peminjaman kamu." />
      <Segmented<Tab> value={tab} onChange={(t) => { setTab(t); setSelId(null) }} className="mb-4 md:max-w-lg" options={(['Semua', 'Menunggu', 'Aktif', 'Selesai'] as Tab[]).map((t) => ({ value: t, label: t, count: count(t) }))} />

      {dataStatus === 'error' ? (
        <Glass><ErrorState onRetry={() => refresh()} /></Glass>
      ) : dataStatus === 'loading' ? (
        <Glass className="p-4"><div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div></Glass>
      ) : list.length === 0 ? (
        <Glass><Empty icon="calendar" title={`Belum ada peminjaman ${tab === 'Semua' ? '' : tab.toLowerCase()}`} desc="Pinjam barang dari katalog, statusnya akan muncul di sini." action={<Button onClick={() => nav('catalog')}>Buka Katalog</Button>} /></Glass>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(320px,400px)] md:items-start">
          <div className="flex min-w-0 flex-col gap-2.5">
            {list.map((l) => (
              <button key={l.id} onClick={() => setSelId(l.id)} aria-pressed={sel?.id === l.id}
                className={`glass tap flex items-center gap-3 rounded-[20px] p-4 text-left hover:bg-white/70 ${!mobile && sel?.id === l.id ? 'ring-2 ring-primary' : ''}`}>
                <div className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-white/70 text-primary"><Icon name="box" /></div>
                <div className="min-w-0 flex-1"><LoanSummary loan={l} /></div>
                <StatusBadge status={l.status} />
              </button>
            ))}
          </div>
          {!mobile && sel && (
            <SidePanel title="Detail Peminjaman" footer={cancelBtn || undefined}>
              <LoanDetail loan={sel} />
            </SidePanel>
          )}
        </div>
      )}

      {mobile && (
        <Overlay open={!!sel} onClose={() => setSelId(null)} title="Detail Peminjaman" footer={cancelBtn || undefined}>
          {sel && <LoanDetail loan={sel} />}
        </Overlay>
      )}
      <Overlay open={ext && !!sel} onClose={() => setExt(false)} title="Minta perpanjangan"
        footer={<><Button variant="secondary" onClick={() => setExt(false)}>Batal</Button><Button onClick={sendExt}>Kirim</Button></>}>
        {sel && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] text-ink-2">{sel.items.map((i) => itemById(i.itemId)?.nama).join(', ')} · kembali saat ini <b className="text-ink">{fmtDate(sel.end)}</b></p>
            <div className="flex items-center justify-between rounded-[16px] bg-white/60 p-3">
              <span className="text-[14px] font-semibold">Tambah</span>
              <div className="flex items-center gap-2">
                <button aria-label="Kurangi" disabled={extDays <= 1} onClick={() => setExtDays(extDays - 1)} className="tap liquid grid size-9 place-items-center rounded-full bg-white disabled:opacity-40"><Icon name="minus" className="size-4" /></button>
                <span key={extDays} className="anim-badge w-16 text-center text-[17px] font-bold">{extDays} hari</span>
                <button aria-label="Tambah" disabled={extDays >= rules.maxLoanDurationDays} onClick={() => setExtDays(extDays + 1)} className="tap liquid grid size-9 place-items-center rounded-full bg-white disabled:opacity-40"><Icon name="plus" className="size-4" /></button>
              </div>
            </div>
            <p className="text-[13px] text-ink-2">Kembali baru: <b className="text-ink">{fmtDate(addDays(sel.end, extDays))}</b> {!extFree(sel, extDays) && <span className="font-semibold text-danger">· stok tidak cukup</span>}</p>
            <Field label="Alasan"><textarea rows={3} value={extReason} onChange={(e) => setExtReason(e.target.value)} placeholder="Contoh: presentasi diundur ke hari Jumat" className={inputCls()} /></Field>
            {extErr && <p role="alert" className="text-[14px] font-medium text-danger">{extErr}</p>}
          </div>
        )}
      </Overlay>
      <Confirm open={cancel} onClose={() => setCancel(false)} onConfirm={doCancel} tone="danger" confirmLabel="Ya, Batalkan" title="Batalkan booking?"
        message={`Booking ${sel?.id} akan dibatalkan dan stok dikembalikan. Tindakan ini tidak bisa diurungkan.`} />
    </div>
  )
}
