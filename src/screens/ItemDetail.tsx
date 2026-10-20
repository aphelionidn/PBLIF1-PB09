import { useEffect, useMemo, useState } from 'react'
import { Button, Empty, ErrorState, FavButton, Field, Glass, Icon, ItemThumb, Pill, Skeleton, StatusBadge, SuccessMark, inputCls } from '../components/ui'
import { rulesText } from '../config'
import { addDays, diffDays, fmtDate, fmtMonth, fmtRange, monthGrid, shiftMonth, type Loan } from '../data'
import { OCCUPYING, useStore } from '../store'

const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export default function ItemDetail() {
  const { param, itemById, nav, availableOn, availableRange, createLoan, loans, me, role, toast, today, rules, addToCart, cart, cartDates, setCartOpen, viewItem, dataStatus, refresh } = useStore()
  useEffect(() => { if (param) viewItem(param) }, [param]) // eslint-disable-line react-hooks/exhaustive-deps
  const item = param ? itemById(param) : undefined
  const [start, setStart] = useState<string | null>(null)
  const [end, setEnd] = useState<string | null>(null)
  const [qty, setQty] = useState(1)
  const [purpose, setPurpose] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<Loan | null>(null)

  const lastDay = addDays(today, rules.maxDaysAheadForBooking + rules.maxLoanDurationDays - 1)
  const [month, setMonth] = useState(today.slice(0, 7))
  const days = useMemo(() => monthGrid(month), [month])
  const canPrev = month > today.slice(0, 7)
  const canNext = month < lastDay.slice(0, 7)

  if (dataStatus === 'error') return <Glass><ErrorState onRetry={() => refresh()} /></Glass>
  if (dataStatus === 'loading' && !item) return <Glass className="p-4"><div className="flex flex-col gap-3"><Skeleton className="h-56" /><Skeleton className="h-24" /></div></Glass>
  if (!item) return <Glass><Empty title="Barang tidak ditemukan" action={<Button onClick={() => nav('catalog')}>Kembali ke Katalog</Button>} /></Glass>

  const rangeAvail = start ? availableRange(item.id, start, end ?? start) : null
  const activeTypes = new Set(loans.filter((l) => l.userId === me?.id && ['Menunggu', ...OCCUPYING].includes(l.status)).flatMap((l) => l.items.map((i) => i.itemId)))

  const dayState = (d: string) => {
    if (d < today || d > lastDay) return 'out'
    if (!start || end) return d > addDays(today, rules.maxDaysAheadForBooking) ? 'out' : availableOn(item.id, d) === 0 ? 'full' : 'ok'
    // memilih tanggal selesai
    if (d < start) return d > addDays(today, rules.maxDaysAheadForBooking) ? 'out' : availableOn(item.id, d) === 0 ? 'full' : 'ok'
    if (diffDays(start, d) >= rules.maxLoanDurationDays) return 'out'
    return availableRange(item.id, start, d) === 0 ? 'full' : 'ok'
  }
  const pick = (d: string) => {
    setErr({})
    if (!start || end || d < start) { setStart(d); setEnd(null); return }
    setEnd(d)
  }
  const inRange = (d: string) => start && d >= start && d <= (end ?? start)

  const submit = async () => {
    const n: Record<string, string> = {}
    if (!start) n.date = 'Pilih tanggal mulai dan selesai peminjaman.'
    else if (rangeAvail === 0) n.date = 'Stok habis pada tanggal yang dipilih.'
    if (rangeAvail !== null && qty > rangeAvail) n.qty = `Jumlah melebihi stok tersedia (${rangeAvail} unit).`
    if (qty < 1) n.qty = 'Jumlah minimal 1.'
    if (purpose.trim().length < 10) n.purpose = 'Jelaskan keperluan minimal 10 karakter.'
    if (!activeTypes.has(item.id) && activeTypes.size >= rules.maxActiveItemTypesPerUser) n.form = `Kamu sudah mencapai batas ${rules.maxActiveItemTypesPerUser} jenis barang aktif.`
    setErr(n)
    if (Object.keys(n).length) return
    const l = await createLoan({ items: [{ itemId: item.id, qty }], start: start!, end: end ?? start!, keperluan: purpose.trim() })
    if (l) { setSubmitted(l); toast('Booking diajukan') }
  }

  const addCart = () => {
    const n: Record<string, string> = {}
    if (!start) n.date = 'Pilih tanggal dulu agar stok bisa dicek.'
    else if (rangeAvail === 0) n.date = 'Stok habis pada tanggal yang dipilih.'
    else if (cartDates && cart.length && (cartDates.start !== start || cartDates.end !== (end ?? start))) n.form = `Keranjang memakai tanggal ${fmtRange(cartDates.start, cartDates.end)}. Satu pengajuan = satu rentang tanggal.`
    if (rangeAvail !== null && qty > rangeAvail) n.qty = `Jumlah melebihi stok tersedia (${rangeAvail} unit).`
    if (!cart.some((c) => c.itemId === item.id) && cart.length >= rules.maxActiveItemTypesPerUser) n.form = `Keranjang maksimal ${rules.maxActiveItemTypesPerUser} jenis barang.`
    setErr(n)
    if (Object.keys(n).length) return
    addToCart(item.id, qty, { start: start!, end: end ?? start! })
    toast('Ditambahkan ke keranjang')
    setCartOpen(true)
  }

  if (submitted)
    return (
      <div className="mx-auto max-w-[560px] pt-6">
        <Glass className="anim-pop p-8 text-center">
          <SuccessMark />
          <h1 className="text-[22px] font-semibold">Booking berhasil diajukan</h1>
          <p className="mt-1 text-[15px] text-ink-2">{qty}× {item.nama} · {fmtRange(submitted.start, submitted.end)}</p>
          <div className="my-4 flex items-center justify-center gap-2 text-[14px] text-ink-2">Status: <StatusBadge status="Menunggu" /></div>
          <p className="text-[14px] text-ink-2">Menunggu persetujuan dari Dosen atau Admin. Kamu akan menerima notifikasi setelah diproses.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" onClick={() => nav('catalog')}>Kembali ke Katalog</Button>
            <Button onClick={() => nav(role === 'Admin' ? 'admin-loans' : 'myloans')}>{role === 'Admin' ? 'Lihat Pengajuan' : 'Lihat Peminjaman'}</Button>
          </div>
        </Glass>
      </div>
    )

  const maxQty = rangeAvail ?? availableOn(item.id, today)

  return (
    <div className="pb-4 md:pb-0">
      <button onClick={() => nav('catalog')} className="-ml-2 mb-3 flex min-h-11 items-center gap-1 rounded-lg px-2 text-[15px] font-semibold text-primary-pressed hover:bg-white/50"><Icon name="left" className="size-4" />Katalog</button>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_1fr] lg:items-start">
        {/* Info */}
        <div className="flex min-w-0 flex-col gap-4">
          <Glass className="relative overflow-hidden p-0"><ItemThumb kategori={item.kategori} foto={item.foto} big className="h-56 md:h-80" />{role !== 'Admin' && <FavButton itemId={item.id} className="absolute right-4 top-4 size-11" />}</Glass>
          <Glass className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2"><Pill tone="blue">{item.kategori}</Pill><Pill tone={item.kondisi === 'Baik' ? 'green' : 'orange'}>Kondisi: {item.kondisi}</Pill></div>
            <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">{item.nama}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{item.deskripsi}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[16px] bg-white/60 p-3.5"><p className="text-[12px] font-medium text-ink-2">Stok total</p><p className="text-[22px] font-semibold">{item.stok_total} unit</p></div>
              <div className="rounded-[16px] bg-white/60 p-3.5">
                <p className="text-[12px] font-medium text-ink-2">{start ? `Tersedia ${fmtRange(start, end ?? start)}` : 'Tersedia hari ini'}</p>
                <p className={`text-[22px] font-semibold ${maxQty === 0 ? 'text-danger' : ''}`}>{maxQty} unit</p>
              </div>
            </div>
          </Glass>
          <Glass className="hidden p-5 lg:block"><Rules /></Glass>
        </div>

        {/* Booking form */}
        <Glass className="glass-strong flex flex-col gap-5 p-5 md:p-6 lg:sticky lg:top-6">
          <h2 className="text-[20px] font-semibold">Ajukan Booking</h2>
          {err.form && <div role="alert" className="flex gap-2 rounded-[14px] bg-tint-red p-3 text-[14px] font-medium text-danger"><Icon name="alert" className="size-5 shrink-0" />{err.form}</div>}
          <Field label={!start || end ? 'Pilih tanggal mulai' : 'Pilih tanggal selesai (atau ketuk tanggal yang sama)'} error={err.date}>
            <div className="rounded-[16px] bg-white/55 p-3">
              <div className="mb-2 flex items-center justify-between">
                <button type="button" aria-label="Bulan sebelumnya" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))} className="tap grid size-9 place-items-center rounded-full hover:bg-white disabled:opacity-30"><Icon name="left" className="size-4" /></button>
                <p key={month} className="anim-fade text-[15px] font-semibold capitalize">{fmtMonth(month)}</p>
                <button type="button" aria-label="Bulan berikutnya" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} className="tap grid size-9 place-items-center rounded-full hover:bg-white disabled:opacity-30"><Icon name="right" className="size-4" /></button>
              </div>
              <div className="mb-1 grid grid-cols-7 text-center text-[12px] font-medium text-ink-2">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  if (!d) return <span key={'e' + i} />
                  const s = dayState(d)
                  const sel = inRange(d)
                  const edge = d === start || d === end
                  return (
                    <button key={d} disabled={s !== 'ok'} onClick={() => pick(d)} aria-pressed={!!sel}
                      aria-label={`${fmtDate(d)}${s === 'full' ? ', stok habis' : ''}`}
                      className={`tap relative flex h-11 flex-col items-center justify-center rounded-[12px] text-[15px] font-semibold
                        ${edge ? 'bg-primary text-on' : sel ? 'bg-primary/15 text-primary-pressed' : s === 'ok' ? 'hover:bg-white' : ''}
                        ${s === 'out' ? 'text-ink-2/35' : ''} ${s === 'full' ? 'text-danger/60 line-through' : ''}`}>
                      {Number(d.slice(8))}
                      {d === today && <span className={`absolute bottom-1 size-1 rounded-full ${edge ? 'bg-white' : 'bg-primary'}`} />}
                    </button>
                  )
                })}
              </div>
              <p className="mt-2 flex flex-wrap gap-x-3 text-[12px] text-ink-2"><span><span className="text-danger line-through">12</span> stok habis</span><span>• titik = hari ini</span></p>
            </div>
          </Field>
          {start && rangeAvail === 0 && <div className="flex gap-2 rounded-[14px] bg-tint-red p-3 text-[14px] font-medium text-danger"><Icon name="alert" className="size-5 shrink-0" />Tidak ada stok pada {fmtRange(start, end ?? start)}. Pilih tanggal lain.</div>}

          <Field label="Jumlah" error={err.qty} helper={`Maksimal ${maxQty} unit untuk tanggal ini.`}>
            <div className="flex items-center gap-3">
              <button aria-label="Kurangi jumlah" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} className="tap grid size-11 place-items-center rounded-[14px] bg-white/75 disabled:opacity-40"><Icon name="minus" /></button>
              <span className="w-10 text-center text-[20px] font-semibold" aria-live="polite">{qty}</span>
              <button aria-label="Tambah jumlah" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} disabled={qty >= maxQty} className="tap grid size-11 place-items-center rounded-[14px] bg-white/75 disabled:opacity-40"><Icon name="plus" /></button>
            </div>
          </Field>
          <Field label="Keperluan" error={err.purpose} htmlFor="kep">
            <textarea id="kep" rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Contoh: Presentasi kelompok mata kuliah Jaringan Komputer di ruang B203" className={`${inputCls(err.purpose)} py-3`} />
          </Field>
          <div className="lg:hidden"><Rules /></div>
          <div className="hidden gap-2 md:grid md:grid-cols-2">
            <Button variant="secondary" onClick={addCart}><Icon name="cart" className="size-4" />Keranjang</Button>
            <Button onClick={submit}>Ajukan Sekarang</Button>
          </div>
        </Glass>
      </div>

      {/* Mobile fixed action bar */}
      <div className="glass glass-strong fixed inset-x-3 bottom-3 z-20 flex items-center gap-3 rounded-[22px] p-2.5 pl-4 md:hidden">
        <div className="min-w-0 flex-1 text-[13px]">
          <p className="font-semibold">{start ? fmtRange(start, end ?? start) : 'Belum pilih tanggal'}</p>
          <p className="text-ink-2">{qty} unit · tersedia {maxQty}</p>
        </div>
        <button onClick={addCart} aria-label="Tambah ke keranjang" className="tap grid size-11 shrink-0 place-items-center rounded-[14px] bg-tint-blue text-primary-pressed"><Icon name="cart" className="size-5" /></button>
        <Button onClick={submit}>Ajukan</Button>
      </div>
    </div>
  )
}

function Rules() {
  const { rules } = useStore()
  return (
    <div className="rounded-[16px] bg-tint-blue p-4">
      <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-primary-pressed"><Icon name="info" className="size-4" />Aturan peminjaman (sementara)</p>
      <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink">{rulesText(rules).map((r) => <li key={r}>{r}</li>)}</ul>
    </div>
  )
}
