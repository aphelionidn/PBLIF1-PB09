import { useState } from 'react'
import { fmtRange, type Loan } from '../data'
import { OCCUPYING, useStore } from '../store'
import { Button, Empty, Field, Icon, ItemThumb, Overlay, StatusBadge, SuccessMark, inputCls } from './ui'

export default function CartPanel() {
  const { cart, cartDates, cartOpen, setCartOpen, itemById, availableRange, setCartQty, removeFromCart, clearCart, createLoan, loans, me, rules, toast, nav, role } = useStore()
  const [purpose, setPurpose] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState<Loan | null>(null)
  const close = () => { setCartOpen(false); setDone(null); setErr('') }

  const avail = (id: string) => (cartDates ? availableRange(id, cartDates.start, cartDates.end) : 0)
  const activeTypes = new Set(loans.filter((l) => l.userId === me?.id && [...OCCUPYING, 'Menunggu'].includes(l.status)).flatMap((l) => l.items.map((i) => i.itemId)))
  const newTypes = cart.filter((c) => !activeTypes.has(c.itemId)).length

  const checkout = async () => {
    if (!cartDates) return
    const short = cart.find((c) => c.qty > avail(c.itemId))
    if (short) return setErr(`Stok ${itemById(short.itemId)?.nama} tidak cukup pada tanggal ini (tersisa ${avail(short.itemId)}).`)
    if (activeTypes.size + newTypes > rules.maxActiveItemTypesPerUser) return setErr(`Melebihi batas ${rules.maxActiveItemTypesPerUser} jenis barang aktif. Kamu sudah punya ${activeTypes.size} jenis aktif.`)
    if (purpose.trim().length < 10) return setErr('Jelaskan keperluan minimal 10 karakter.')
    const l = await createLoan({ items: cart.map((c) => ({ itemId: c.itemId, qty: c.qty })), start: cartDates.start, end: cartDates.end, keperluan: purpose.trim() })
    if (l) { setDone(l); clearCart(); setPurpose(''); setErr(''); toast('Booking diajukan') }
  }

  return (
    <Overlay side open={cartOpen} onClose={close} title={done ? 'Berhasil' : `Keranjang (${cart.length})`}
      footer={done ? undefined : cart.length > 0 ? <Button onClick={checkout}>Ajukan {cart.length} barang</Button> : undefined}>
      {done ? (
        <div className="anim-pop py-6 text-center">
          <SuccessMark />
          <h3 className="text-[20px] font-semibold">Booking diajukan</h3>
          <p className="mt-1 text-[14px] text-ink-2">{done.id} · {done.items.length} jenis barang · {fmtRange(done.start, done.end)}</p>
          <div className="my-4 flex justify-center"><StatusBadge status="Menunggu" /></div>
          <Button className="w-full" onClick={() => { close(); nav(role === 'Admin' ? 'admin-loans' : 'myloans') }}>Lihat Peminjaman</Button>
        </div>
      ) : cart.length === 0 || !cartDates ? (
        <Empty icon="cart" title="Keranjang kosong" desc="Pilih tanggal di halaman barang, lalu tambahkan beberapa barang sekaligus." action={<Button variant="secondary" onClick={() => { close(); nav('catalog') }}>Jelajahi Katalog</Button>} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-[14px] bg-tint-blue p-3 text-[14px] font-medium text-primary-pressed"><Icon name="calendar" className="size-5" />{fmtRange(cartDates.start, cartDates.end)}<span className="ml-auto text-[12px] text-ink-2">untuk semua barang</span></div>
          <ul className="flex flex-col gap-2">
            {cart.map((c, i) => {
              const it = itemById(c.itemId)
              if (!it) return null
              const max = avail(c.itemId)
              return (
                <li key={c.itemId} className="anim-rise flex items-center gap-3 rounded-[16px] bg-white/60 p-2.5" style={{ animationDelay: `${i * 50}ms` }}>
                  <ItemThumb kategori={it.kategori} foto={it.foto} className="size-12 shrink-0 rounded-[12px]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{it.nama}</p>
                    <p className={`text-[12px] font-medium ${c.qty > max ? 'text-danger' : 'text-ink-2'}`}>Tersedia {max} unit</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button aria-label="Kurangi" disabled={c.qty <= 1} onClick={() => setCartQty(c.itemId, c.qty - 1)} className="tap grid size-8 place-items-center rounded-full bg-black/[0.06] disabled:opacity-40"><Icon name="minus" className="size-4" /></button>
                    <span className="w-6 text-center text-[15px] font-semibold tabular-nums">{c.qty}</span>
                    <button aria-label="Tambah" disabled={c.qty >= max} onClick={() => setCartQty(c.itemId, c.qty + 1)} className="tap grid size-8 place-items-center rounded-full bg-black/[0.06] disabled:opacity-40"><Icon name="plus" className="size-4" /></button>
                  </div>
                  <button aria-label={`Hapus ${it.nama}`} onClick={() => removeFromCart(c.itemId)} className="tap grid size-9 place-items-center rounded-full text-danger hover:bg-tint-red"><Icon name="trash" className="size-4" /></button>
                </li>
              )
            })}
          </ul>
          <Field label="Keperluan">
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} placeholder="Contoh: Presentasi tugas akhir kelompok di R. 301" className={inputCls()} />
          </Field>
          {err && <div role="alert" className="flex gap-2 rounded-[14px] bg-tint-red p-3 text-[14px] font-medium text-danger"><Icon name="alert" className="size-5 shrink-0" />{err}</div>}
          <button onClick={clearCart} className="self-start text-[14px] font-semibold text-danger">Kosongkan keranjang</button>
        </div>
      )}
    </Overlay>
  )
}
