import { CONFIG } from '../config'
import { addDays, diffDays, fmtDate, fmtRange, type Loan } from '../data'
import { useStore } from '../store'
import { Avatar, ItemThumb, Pill, StatusBadge } from './ui'

export function lateDays(l: Loan, today: string) {
  return Math.max(0, diffDays(l.end, today))
}

export function LoanSummary({ loan, showBorrower }: { loan: Loan; showBorrower?: boolean }) {
  const { itemNames, userById } = useStore()
  const u = userById(loan.userId)
  return (
    <div className="min-w-0">
      <p className="truncate whitespace-nowrap text-[12px] font-medium text-ink-2">{loan.id} · {fmtRange(loan.start, loan.end)}</p>
      <p className="truncate text-[15px] font-semibold">{itemNames(loan)}</p>
      {showBorrower && u && <p className="truncate text-[13px] text-ink-2">{u.nama} · {u.role}</p>}
    </div>
  )
}

export default function LoanDetail({ loan }: { loan: Loan }) {
  const { itemById, userById, today, rules } = useStore()
  const u = userById(loan.userId)
  const late = loan.status === 'Terlambat' ? lateDays(loan, today) : 0
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><p className="text-[12px] font-medium text-ink-2">Kode peminjaman</p><p className="text-[20px] font-semibold">{loan.id}</p></div>
        <div className="flex items-center gap-2"><StatusBadge status={loan.status} />{late > 0 && <Pill tone="red">{late} hari terlambat</Pill>}</div>
      </div>

      {u && (
        <div className="flex items-center gap-3 rounded-[16px] bg-white/55 p-3">
          <Avatar name={u.nama} src={u.foto} />
          <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{u.nama}</p><p className="text-[13px] text-ink-2">{u.role} · {u.nim_nip}</p></div>
        </div>
      )}

      <div>
        <p className="mb-2 text-[13px] font-medium text-ink-2">Barang</p>
        <div className="flex flex-col gap-2">
          {loan.items.map((li) => {
            const it = itemById(li.itemId)
            return (
              <div key={li.itemId} className="flex items-center gap-3 rounded-[14px] bg-white/55 p-2">
                <ItemThumb kategori={it?.kategori ?? ''} foto={it?.foto} className="size-12 shrink-0 rounded-[12px] [&>div:last-child]:size-8 [&_svg]:size-4" />
                <div className="min-w-0 flex-1"><p className="truncate text-[14px] font-semibold">{it?.nama ?? 'Barang dihapus'}</p><p className="text-[12px] text-ink-2">{it?.kategori}</p></div>
                <span className="text-[14px] font-semibold">×{li.qty}</span>
                {li.kondisiKembali && <Pill tone={li.kondisiKembali === 'Baik' ? 'green' : li.kondisiKembali === 'Hilang' ? 'red' : 'orange'}>{li.kondisiKembali}</Pill>}
              </div>
            )
          })}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-[14px]">
        <div><dt className="text-[12px] font-medium text-ink-2">Tanggal pinjam</dt><dd className="font-semibold">{fmtDate(loan.start)}</dd></div>
        <div><dt className="text-[12px] font-medium text-ink-2">Tanggal kembali</dt><dd className="font-semibold">{fmtDate(loan.end)}</dd></div>
        {loan.extension && <div className="col-span-2"><dt className="text-[12px] font-medium text-ink-2">Perpanjangan</dt><dd className="font-semibold">+{loan.extension.days} hari · <span className={loan.extension.state === 'Disetujui' ? 'text-success' : loan.extension.state === 'Ditolak' ? 'text-danger' : 'text-warning'}>{loan.extension.state === 'Menunggu' ? 'Menunggu persetujuan' : loan.extension.state}</span><span className="block text-[13px] font-normal text-ink-2">"{loan.extension.reason}"</span></dd></div>}
        {loan.status === 'Disetujui' && <div className="col-span-2"><dt className="text-[12px] font-medium text-ink-2">Batas pengambilan</dt><dd className="font-semibold">{fmtDate(addDays(loan.start, rules.pickupDeadlineDaysAfterStart))}</dd></div>}
        <div className="col-span-2"><dt className="text-[12px] font-medium text-ink-2">Keperluan</dt><dd>{loan.keperluan}</dd></div>
        {loan.approver && <div className="col-span-2"><dt className="text-[12px] font-medium text-ink-2">Diproses oleh</dt><dd className="font-semibold">{loan.approver}</dd></div>}
        {loan.note && <div className="col-span-2"><dt className="text-[12px] font-medium text-ink-2">Catatan</dt><dd>{loan.note}</dd></div>}
        {loan.returnNote && <div className="col-span-2"><dt className="text-[12px] font-medium text-ink-2">Catatan pengembalian</dt><dd>{loan.returnNote}</dd></div>}
      </dl>

      <div>
        <p className="mb-3 text-[13px] font-medium text-ink-2">Riwayat status</p>
        <ol className="relative ml-2 border-l-2 border-white/80">
          {loan.history.map((h, i) => (
            <li key={i} className="relative pb-4 pl-5 last:pb-0">
              <span className={`absolute -left-[7px] top-1 size-3 rounded-full ring-4 ring-white/70 ${i === loan.history.length - 1 ? 'bg-primary' : 'bg-ink-2/40'}`} />
              <div className="flex flex-wrap items-center gap-2"><StatusBadge status={h.status} /><span className="text-[12px] font-medium text-ink-2">{h.at}</span></div>
              <p className="mt-1 text-[13px] text-ink-2">oleh {h.by}{h.note ? ` — “${h.note}”` : ''}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
