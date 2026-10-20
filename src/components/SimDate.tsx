import { fmtDate } from '../data'
import { useStore } from '../store'
import { Glass, Icon } from './ui'

/** Kontrol prototipe: menggeser "hari ini" untuk menguji status otomatis. */
export default function SimDate() {
  const { simDays, setSimDays, today } = useStore()
  const btn = 'tap grid size-10 place-items-center rounded-full bg-white/70 hover:bg-white disabled:opacity-40'
  return (
    <Glass className="flex flex-wrap items-center gap-3 border-dashed p-4">
      <div className="min-w-0 flex-1 basis-[220px]">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold"><Icon name="clock" className="size-4 text-primary" />Simulasi tanggal</p>
        <p className="text-[12px] text-ink-2">Majukan hari untuk melihat status Terlambat & Kedaluwarsa berubah otomatis.</p>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button aria-label="Mundur sehari" disabled={simDays <= 0} onClick={() => setSimDays(simDays - 1)} className={btn}><Icon name="minus" className="size-4" /></button>
        <div className="min-w-[96px] text-center">
          <p key={today} className="anim-badge text-[15px] font-semibold tabular-nums">{fmtDate(today)}</p>
          <p className="text-[11px] font-medium text-ink-2">{simDays === 0 ? 'Hari ini (asli)' : `+${simDays} hari`}</p>
        </div>
        <button aria-label="Maju sehari" disabled={simDays >= 14} onClick={() => setSimDays(simDays + 1)} className={btn}><Icon name="plus" className="size-4" /></button>
        {simDays > 0 && <button onClick={() => setSimDays(0)} className="text-[13px] font-semibold text-primary-pressed">Reset</button>}
      </div>
    </Glass>
  )
}
