import { Button, DataGate, Empty, Glass, Icon, PageHeader, Pagination, usePaged } from '../components/ui'
import { useStore } from '../store'

const KIND: Record<string, { icon: string; cls: string }> = {
  booking: { icon: 'inbox', cls: 'bg-tint-blue text-primary-pressed' },
  approved: { icon: 'check', cls: 'bg-tint-green text-success' },
  rejected: { icon: 'x', cls: 'bg-tint-red text-danger' },
  reminder: { icon: 'clock', cls: 'bg-tint-orange text-warning' },
  overdue: { icon: 'alert', cls: 'bg-danger text-on' },
  // Notifikasi global (Fase 4) — `warning` = Peringatan, `info` = Pesan/Info.
  warning: { icon: 'alert', cls: 'bg-tint-orange text-warning' },
  info: { icon: 'info', cls: 'bg-tint-blue text-primary-pressed' },
}

export default function Notifications() {
  const { myNotifs, markAllRead, markRead } = useStore()
  const unread = myNotifs.filter((n) => !n.read).length
  // 10 notifikasi per halaman agar daftar panjang tetap ringan.
  const paged = usePaged(myNotifs)
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifikasi" subtitle={unread ? `${unread} belum dibaca` : 'Semua notifikasi sudah dibaca'}
        action={myNotifs.length > 0 && <Button variant="secondary" icon="check" onClick={markAllRead} disabled={!unread}>Tandai semua dibaca</Button>} />
      <p className="mb-4 flex items-center gap-2 rounded-[14px] bg-white/50 px-3.5 py-2.5 text-[13px] font-medium text-ink-2"><Icon name="mail" className="size-4 text-primary" />Notifikasi juga dikirim lewat email.</p>
      <DataGate>
      {myNotifs.length === 0 ? (
        <Glass><Empty icon="bell" title="Belum ada notifikasi" desc="Kabar terbaru soal booking kamu akan muncul di sini." /></Glass>
      ) : (
        <Glass className="overflow-hidden p-0">
          {unread === 0 && <p className="flex items-center gap-2 border-b border-white/60 px-4 py-3 text-[13px] font-semibold text-success"><Icon name="check" className="size-4" />Semua sudah dibaca</p>}
          {paged.slice.map((n) => {
            const k = KIND[n.kind] ?? KIND.info
            return (
              <button key={n.id} onClick={() => markRead(n.id)} className={`flex w-full items-start gap-3 border-b border-white/60 px-4 py-4 text-left transition-colors last:border-0 hover:bg-white/50 ${n.read ? '' : 'bg-white/35'}`}>
                <span className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${k.cls}`}><Icon name={k.icon} className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2"><span className="text-[15px] font-semibold">{n.title}</span><span className="shrink-0 text-[12px] font-medium text-ink-2">{n.at}</span></span>
                  <span className="mt-0.5 block text-[14px] text-ink-2">{n.message}</span>
                </span>
                <span className={`mt-2 size-2.5 shrink-0 rounded-full ${n.read ? '' : 'bg-primary'}`}><span className="sr-only">{n.read ? 'Sudah dibaca' : 'Belum dibaca'}</span></span>
              </button>
            )
          })}
        </Glass>
      )}
      <Pagination page={paged.page} pages={paged.pages} total={paged.total} size={paged.size} onPage={paged.setPage} />
      </DataGate>
    </div>
  )
}
