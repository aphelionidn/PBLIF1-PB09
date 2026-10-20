import type { ReactNode } from 'react'
import { ITEMS, type Status } from '../data'
import { Icon, ItemThumb, StatusBadge } from './ui'

/** Mockup layar aplikasi yang bergulir terus — hanya dekorasi di halaman masuk. */
const Card = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`glass shrink-0 rounded-[20px] p-3 ${className}`}>{children}</div>
)

const ItemCard = ({ i }: { i: number }) => {
  const it = ITEMS[i % ITEMS.length]
  return (
    <Card className="p-0 overflow-hidden">
      <ItemThumb kategori={it.kategori} className="h-24 w-full" />
      <div className="p-3">
        <p className="text-[11px] font-medium text-ink-2">{it.kategori}</p>
        <p className="truncate text-[14px] font-semibold">{it.nama}</p>
        <p className="mt-1.5 text-[12px] font-semibold text-success">● {it.stok_total} unit tersedia</p>
      </div>
    </Card>
  )
}
const StatusCard = ({ s, name, id }: { s: Status; name: string; id: string }) => (
  <Card>
    <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-semibold text-ink-2">{id}</p><StatusBadge status={s} /></div>
    <p className="mt-2 truncate text-[14px] font-semibold">{name}</p>
  </Card>
)
const MiniCalendar = () => (
  <Card>
    <p className="mb-2 text-[13px] font-semibold">Oktober</p>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 21 }, (_, d) => (
        <span key={d} className={`grid h-6 place-items-center rounded-[6px] text-[10px] font-semibold ${d >= 8 && d <= 10 ? 'bg-primary text-on' : d === 15 ? 'bg-tint-red text-danger line-through' : 'bg-white/50'}`}>{d + 1}</span>
      ))}
    </div>
  </Card>
)
const Countdown = () => (
  <div className="shrink-0 rounded-[16px] bg-primary p-4 text-on">
    <p className="text-[11px] font-semibold opacity-90">Sedang dipinjam</p>
    <p className="text-[30px] font-bold leading-none">2 <span className="text-[13px]">hari lagi</span></p>
    <p className="mt-1 text-[12px] opacity-90">Proyektor Epson</p>
  </div>
)
const NotifCard = ({ t, m }: { t: string; m: string }) => (
  <Card className="flex gap-2.5">
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tint-blue text-primary"><Icon name="bell" className="size-4" /></span>
    <span className="min-w-0"><span className="block text-[13px] font-semibold">{t}</span><span className="block truncate text-[12px] text-ink-2">{m}</span></span>
  </Card>
)

const COLS: ReactNode[][] = [
  [<ItemCard i={0} />, <StatusCard s="Disetujui" name="Speaker Portabel" id="PJ-1041" />, <MiniCalendar />, <ItemCard i={3} />, <NotifCard t="Booking disetujui" m="Silakan ambil hari ini" />],
  [<Countdown />, <ItemCard i={1} />, <NotifCard t="Pengingat" m="Kembalikan besok" />, <StatusCard s="Menunggu" name="Kabel HDMI 5 Meter" id="PJ-1046" />, <ItemCard i={6} />],
  [<StatusCard s="Dipinjam" name="Terminal Listrik" id="PJ-1036" />, <ItemCard i={2} />, <Countdown />, <ItemCard i={7} />, <StatusCard s="Dikembalikan" name="Pointer Presentasi" id="PJ-1029" />],
]

export default function ScrollPreview({ horizontal }: { horizontal?: boolean }) {
  if (horizontal) {
    const row = [
      <StatusCard s="Disetujui" name="Speaker Portabel" id="PJ-1041" />, <NotifCard t="Booking disetujui" m="Silakan ambil hari ini" />,
      <StatusCard s="Dipinjam" name="Terminal Listrik" id="PJ-1036" />, <NotifCard t="Pengingat" m="Kembalikan besok" />,
      <StatusCard s="Menunggu" name="Kabel HDMI 5 Meter" id="PJ-1046" />,
    ]
    return (
      <div aria-hidden className="marquee-pause fade-x -mx-4 overflow-hidden py-1">
        <div className="marquee-x flex w-max gap-3 [--dur:30s]">{[...row, ...row].map((c, i) => <div key={i} className="w-[200px] shrink-0 [&>*]:h-[74px]">{c}</div>)}</div>
      </div>
    )
  }
  return (
    <div aria-hidden className="marquee-pause fade-y grid h-full grid-cols-2 gap-3 overflow-hidden xl:grid-cols-3">
      {COLS.map((col, ci) => (
        <div key={ci} className={ci === 2 ? 'hidden xl:block' : ''}>
          <div className={`marquee-y flex flex-col gap-3 ${ci === 1 ? '[--dur:46s] [animation-direction:reverse]' : ci === 2 ? '[--dur:42s]' : ''}`}>
            {[...col, ...col].map((c, i) => <div key={i}>{c}</div>)}
          </div>
        </div>
      ))}
    </div>
  )
}
