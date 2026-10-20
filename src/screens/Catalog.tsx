import { useMemo, useState } from 'react'
import { AnimatedNumber, Chip, FavButton, Empty, ErrorState, Glass, Icon, ItemThumb, Pill, SearchBox, Skeleton, Button } from '../components/ui'
import { diffDays, fmtDate } from '../data'
import { useStore } from '../store'

export default function Catalog() {
  const { items, categories, me, nav, availableOn, simError, setSimError, today, loans, itemNames, itemById, recent, role, favs, dataStatus, refresh } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Semua')
  const loading = dataStatus === 'loading'
  const failed = dataStatus === 'error' || simError

  const list = useMemo(
    () => items.filter((i) => (cat === 'Semua' || (cat === 'Favorit' ? favs.includes(i.id) : i.kategori === cat)) && i.nama.toLowerCase().includes(q.toLowerCase())),
    [items, cat, q, favs],
  )
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'

  function ForYou() {
    const mine = loans.filter((l) => l.userId === me?.id)
    const active = mine.filter((l) => ['Dipinjam', 'Terlambat', 'Disetujui'].includes(l.status)).sort((a, b) => a.end.localeCompare(b.end))[0]
    const again = [...new Set(mine.filter((l) => ['Dikembalikan'].includes(l.status)).flatMap((l) => l.items.map((i) => i.itemId)))].slice(0, 4)
    const seen = recent.filter((id) => itemById(id)).slice(0, 4)
    const fav = favs.filter((id) => itemById(id)).slice(0, 6)
    if (!active && !again.length && !seen.length && !fav.length) return null
    const left = active ? diffDays(today, active.status === 'Disetujui' ? active.start : active.end) : 0
    const tone = active?.status === 'Terlambat' ? 'bg-danger' : left <= 0 ? 'bg-warning' : 'bg-primary'
    const mini = (id: string, i: number) => {
      const it = itemById(id)!
      return (
        <button key={id} onClick={() => nav('item', id)} style={{ animationDelay: `${i * 50}ms` }} className="anim-rise tap flex shrink-0 items-center gap-2 rounded-full bg-white/70 py-1 pl-1 pr-3.5 text-[13px] font-semibold hover:bg-white">
          <ItemThumb kategori={it.kategori} foto={it.foto} className="size-8 rounded-full" />{it.nama}
        </button>
      )
    }
    return (
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {active && (
          <button onClick={() => nav('myloans')} className={`anim-rise tap accent-hero-shadow relative overflow-hidden rounded-[24px] ${tone} p-5 text-left text-on`}>
            <span aria-hidden className="absolute -right-10 -top-10 size-40 rounded-full bg-[rgba(255,255,255,0.18)]" />
            <p className="text-[13px] font-semibold opacity-90">{active.status === 'Disetujui' ? 'Siap diambil' : active.status === 'Terlambat' ? 'Segera kembalikan' : 'Sedang dipinjam'} · {active.id}</p>
            <div className="mt-2 flex items-end gap-2">
              {left === 0 && active.status !== 'Terlambat' ? <span className="text-[40px] font-bold leading-none tracking-tight">Hari ini</span> : <AnimatedNumber value={Math.abs(left)} className="text-[44px] font-bold leading-none tracking-tight" />}
              <span className="pb-1 text-[15px] font-semibold">{left === 0 && active.status !== 'Terlambat' ? (active.status === 'Disetujui' ? 'ambil barang' : 'batas kembali') : active.status === 'Terlambat' || left < 0 ? 'hari terlambat' : active.status === 'Disetujui' ? 'hari lagi mulai' : 'hari lagi'}</span>
            </div>
            <p className="mt-2 truncate text-[14px] opacity-90">{itemNames(active)} · s.d. {fmtDate(active.end)}</p>
          </button>
        )}
        <Glass className="anim-rise flex min-w-0 flex-col gap-3 p-4">
          {fav.length > 0 && <div><p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2"><Icon name="heart" className="size-4 text-danger" />Favorit</p><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{fav.map(mini)}</div></div>}
          {again.length > 0 && <div><p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2"><Icon name="refresh" className="size-4" />Pinjam lagi</p><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{again.map(mini)}</div></div>}
          {seen.length > 0 && <div><p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-2"><Icon name="eye" className="size-4" />Terakhir dilihat</p><div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">{seen.map(mini)}</div></div>}
          {!again.length && !seen.length && !fav.length && <p className="text-[14px] text-ink-2">Barang yang kamu lihat akan muncul di sini.</p>}
        </Glass>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-5">
        <p className="text-[15px] font-medium text-ink-2">{greet},</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">{me?.nama.split(',')[0]}</h1>
        <p className="mt-1 text-[15px] text-ink-2">Mau pinjam apa hari ini?</p>
      </div>
      {role !== 'Admin' && ForYou()}

      <div className="sticky top-[60px] z-10 -mx-4 mb-4 px-4 py-2 md:static md:mx-0 md:p-0">
        <div className="glass rounded-[18px] p-1.5 md:max-w-xl"><SearchBox value={q} onChange={setQ} placeholder="Cari barang, mis. proyektor" /></div>
      </div>
      <div className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        {['Semua', ...(role !== 'Admin' ? ['Favorit'] : []), ...categories].map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>

      {failed ? (
        <Glass><ErrorState onRetry={() => { if (simError) setSimError(false); refresh() }} /></Glass>
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Glass key={i} className="overflow-hidden p-0"><Skeleton className="h-40 rounded-none" /><div className="space-y-2 p-4"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div></Glass>)}
        </div>
      ) : list.length === 0 ? (
        <Glass><Empty icon="search" title={cat === 'Favorit' && !q ? 'Belum ada favorit' : 'Barang tidak ditemukan'} desc={cat === 'Favorit' && !q ? 'Ketuk ikon hati di kartu barang untuk menyimpannya di sini.' : `Tidak ada hasil untuk "${q}"${cat !== 'Semua' ? ` di ${cat}` : ''}.`} action={<Button variant="secondary" onClick={() => { setQ(''); setCat('Semua') }}>Reset pencarian</Button>} /></Glass>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {list.map((it, idx) => {
            const avail = availableOn(it.id, today)
            return (
              <div key={it.id} className="anim-rise relative" style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }}>
              <button onClick={() => nav('item', it.id)} className="glass tap group flex h-full w-full overflow-hidden rounded-[16px] text-left hover:border-primary/40 md:flex-col">
                <ItemThumb kategori={it.kategori} foto={it.foto} className="h-auto w-28 shrink-0 md:h-40 md:w-full" />
                <div className="flex flex-1 flex-col gap-1 p-4">
                  <p className="text-[12px] font-medium text-ink-2">{it.kategori}</p>
                  <p className="text-[16px] font-semibold leading-snug">{it.nama}</p>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
                    {avail === 0 ? <Pill tone="red">Habis hari ini</Pill> : avail <= 1 ? <Pill tone="orange">Hampir habis</Pill> : <Pill tone="green">Tersedia</Pill>}
                    <span className="text-[13px] font-medium text-ink-2"><AnimatedNumber value={avail} className="font-bold text-ink" />/{it.stok_total} unit</span>
                  </div>
                </div>
              </button>
              {role !== 'Admin' && <FavButton itemId={it.id} className="absolute right-2.5 top-2.5" />}
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
