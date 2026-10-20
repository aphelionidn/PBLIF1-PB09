import type React from 'react'
import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react'
import { CONFIG } from '../config'
import type { Status } from '../data'
import { useStore } from '../store'

const P: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  clipboard: 'M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M9 12l2 2 4-4',
  check: 'M5 12.5l4.5 4.5L19 7',
  x: 'M6 6l12 12M18 6 6 18',
  bell: 'M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  inbox: 'M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5',
  return: 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.6-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2',
  left: 'M15 5l-7 7 7 7',
  right: 'M9 5l7 7-7 7',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  alert: 'M12 3 2 20h20zM12 10v4M12 17h.01',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8h.01',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  tag: 'M3 12V3h9l9 9-9 9zM8 8h.01',
  sidebar: 'M4 4h16v16H4zM9 4v16',
  cart: 'M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2M10 20.5h.01M17 20.5h.01',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
  heart: 'M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  cable: 'M7 3v5M11 3v5M5 8h8v4a4 4 0 0 1-8 0zM9 16v2a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V5',
  pen: 'M15 4l5 5L9 20H4v-5z',
  board: 'M3 4h18v12H3zM8 20l2-4M16 20l-2-4',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.6 5.6l12.8 12.8',
}

export function Icon({ name, className = 'size-5', stroke = 1.8 }: { name: string; className?: string; stroke?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === 'more' ? 3 : stroke} strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d={P[name] ?? P.box} />
    </svg>
  )
}

export const useIsMobile = () => useMedia('(max-width: 767px)')
export const useIsWide = () => useMedia('(min-width: 1280px)')
export function useMedia(q: string) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setM(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [q])
  return m
}

/** Simulasi pemuatan data (prototipe). */
export function useFakeLoad(key: unknown = 0) {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), CONFIG.fakeLoadingMs)
    return () => clearTimeout(t)
  }, [key])
  return loading
}

export function Glass({ className = '', children, as: As = 'div', ...rest }: { className?: string; children?: ReactNode; as?: 'div' | 'section' | 'aside' | 'header' | 'nav' } & Record<string, unknown>) {
  return (
    <As className={`glass rounded-[16px] ${className}`} {...rest}>
      {children}
    </As>
  )
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
const V: Record<BtnVariant, string> = {
  primary: 'bg-primary text-on hover:bg-primary-pressed dark:text-[#0B0B0B]',
  secondary: 'bg-white text-ink hover:bg-tint-blue border border-black/10 dark:border-white/15',
  danger: 'bg-danger text-on hover:brightness-90 dark:text-[#0B0B0B]',


  success: 'bg-success text-on hover:brightness-90 dark:text-[#0B0B0B]',
  ghost: 'text-primary-pressed hover:bg-tint-blue',
}

export function Button({ variant = 'primary', className = '', icon, loading, children, size, danger, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; icon?: string; loading?: boolean; size?: 'sm' | 'md'; danger?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`tap inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${V[danger ? 'danger' : variant ?? 'primary']} ${className}`}
    >
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon && <Icon name={icon} className="size-[18px]" />}
      {children}
    </button>
  )
}

export function IconButton({ icon, label, className = '', badge, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; badge?: number }) {
  return (
    <button {...rest} aria-label={label} title={label} className={`tap relative grid size-11 place-items-center rounded-[10px] text-ink hover:bg-tint-blue ${className}`}>
      <Icon name={icon} />
      {!!badge && <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold leading-[18px] text-on">{badge}</span>}
    </button>
  )
}

const BADGE: Record<Status, string> = {
  Menunggu: 'bg-tint-orange text-warning',
  Disetujui: 'bg-tint-blue text-primary-pressed',
  Ditolak: 'bg-tint-red text-danger',
  Dipinjam: 'bg-primary/15 text-primary-pressed ring-1 ring-primary/30',
  Dikembalikan: 'bg-tint-green text-success',
  Terlambat: 'bg-danger text-on',
  Dibatalkan: 'bg-black/[0.06] text-ink-2',
  Kedaluwarsa: 'bg-black/[0.06] text-ink-2',
}
export function StatusBadge({ status }: { status: Status }) {
  return <span key={status} className={`anim-badge inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${BADGE[status]}`}><span className="size-1.5 rounded-full bg-current" />{status}</span>
}
export function Pill({ tone = 'gray', children }: { tone?: 'gray' | 'green' | 'orange' | 'red' | 'blue'; children: ReactNode }) {
  const t = { gray: 'bg-black/[0.06] text-ink-2', green: 'bg-tint-green text-success', orange: 'bg-tint-orange text-warning', red: 'bg-tint-red text-danger', blue: 'bg-tint-blue text-primary-pressed' }[tone]
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${t}`}>{children}</span>
}

export function Field({ label, error, helper, children, htmlFor }: { label: string; error?: string; helper?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">{label}</label>
      {children}
      {error ? <p className="flex items-center gap-1 text-[13px] font-medium text-danger"><Icon name="alert" className="size-3.5" />{error}</p> : helper && <p className="text-[12px] text-ink-2">{helper}</p>}
    </div>
  )
}
export const inputCls = (err?: string) =>
  `w-full min-h-11 rounded-[10px] border bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-2/70 outline-none transition focus:ring-4 focus:ring-primary/15 dark:bg-black/10 ${err ? 'border-danger' : 'border-black/15 focus:border-primary dark:border-white/15'}`
export function Input({ error, ...rest }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return <input {...rest} aria-invalid={!!error} className={`${inputCls(error)} ${rest.className ?? ''}`} />
}

export function Segmented<T extends string>({ value, options, onChange, className = '' }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto rounded-[14px] bg-black/[0.06] p-1 ${className}`}>
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`tap flex min-h-9 shrink-0 grow items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[13px] font-semibold ${value === o.value ? 'bg-white text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}>
          {o.label}
          {o.count !== undefined && <span className={`rounded-full px-1.5 text-[11px] ${value === o.value ? 'bg-primary text-on' : 'bg-black/10'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`tap min-h-10 whitespace-nowrap rounded-full px-4 text-[14px] font-medium ${active ? 'bg-ink text-canvas' : 'glass text-ink hover:bg-white/80'}`}>
      {children}
    </button>
  )
}

export function Empty({ icon = 'inbox', title, desc, action }: { icon?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-[22px] bg-white/70 text-primary shadow-sm"><Icon name={icon} className="size-7" /></div>
      <p className="text-[17px] font-semibold">{title}</p>
      {desc && <p className="mt-1 max-w-xs text-[14px] text-ink-2">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <Empty icon="alert" title="Gagal memuat data" desc="Periksa koneksi internet kamu, lalu coba lagi." action={<Button icon="refresh" variant="secondary" onClick={onRetry}>Coba Lagi</Button>} />
}
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-[12px] ${className}`} />
}

const PAGE_SIZE = 10

/** Bagi daftar panjang menjadi halaman kecil agar tampilan tetap ringan. */
export function usePaged<T>(items: T[], size = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const pages = Math.max(1, Math.ceil(items.length / size))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const slice = useMemo(() => items.slice((page - 1) * size, page * size), [items, page, size])
  return { page, pages, setPage, slice, size, total: items.length }
}

/** Kontrol halaman: "Menampilkan x–y dari n" + tombol Sebelumnya/Berikutnya. */
export function Pagination({ page, pages, total, size, onPage, className = '' }: { page: number; pages: number; total: number; size: number; onPage: (p: number) => void; className?: string }) {
  if (total <= size) return null
  const from = (page - 1) * size + 1
  const to = Math.min(page * size, total)
  return (
    <nav aria-label="Navigasi halaman" className={`mt-4 flex flex-wrap items-center justify-between gap-3 ${className}`}>
      <p className="text-[13px] text-ink-2">Menampilkan <span className="font-semibold text-ink">{from}–{to}</span> dari {total}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" icon="left" disabled={page <= 1} onClick={() => onPage(page - 1)}>Sebelumnya</Button>
        <span className="min-w-[84px] text-center text-[13px] font-semibold text-ink-2">Hal. {page} / {pages}</span>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Berikutnya<Icon name="right" className="size-4" /></Button>
      </div>
    </nav>
  )
}

/** Gerbang status server: skeleton saat memuat, ErrorState saat gagal, isi saat siap. */
export function DataGate({ children, skeleton }: { children: ReactNode; skeleton?: ReactNode }) {
  const { dataStatus, refresh } = useStore()
  if (dataStatus === 'error') return <Glass><ErrorState onRetry={() => { refresh() }} /></Glass>
  if (dataStatus === 'loading') return <>{skeleton ?? <Glass className="p-4"><div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div></Glass>}</>
  return <>{children}</>
}

/** Bottom sheet di mobile, modal di desktop. */
export function Overlay({ open, onClose, title, children, footer, wide, side }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean; side?: boolean }) {
  const mobile = useIsMobile()
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])
  // Tetap ter-mount sebentar setelah ditutup agar animasi keluar sempat diputar
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) { setMounted(true); return }
    const t = setTimeout(() => setMounted(false), 220)
    return () => clearTimeout(t)
  }, [open])
  const last = useRef({ title, children, footer })
  if (open) last.current = { title, children, footer }
  ;({ title, children, footer } = last.current)
  if (!open && !mounted) return null
  return (
    <div className={`${open ? 'anim-fade' : 'closing'} fixed inset-0 z-50 flex bg-[rgba(0,0,0,0.25)] dark:bg-[rgba(0,0,0,0.55)] ${mobile ? 'items-end' : side ? 'justify-end p-3' : 'items-center justify-center p-6'}`} onClick={onClose}>
      {/* Animasi masuk dipasang pada pembungkus, bukan pada lapisan kaca, agar backdrop-filter
          tidak di-suspend Chromium selama animasi (efek "blink" setelah animasi selesai). */}
      <div onClick={(e) => e.stopPropagation()} className={`flex w-full ${mobile ? 'anim-sheet' : side ? 'anim-drawer h-full max-h-none max-w-[420px]' : `anim-pop ${wide ? 'max-w-[720px]' : 'max-w-[560px]'}`}`}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`glass glass-strong flex w-full flex-col rounded-[18px] ${mobile ? 'max-h-[92vh] rounded-b-none' : side ? 'h-full max-h-none' : 'max-h-[92vh]'}`}>
        {mobile && <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-black/20" />}
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-[20px] font-semibold">{title}</h2>
          <IconButton icon="x" label="Tutup" onClick={onClose} className="-mr-2" />
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="flex gap-2 border-t border-white/70 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&>*]:flex-1">{footer}</div>}
      </div>
      </div>
    </div>
  )
}

export function Confirm({ open, onClose, onConfirm, title, message, confirmLabel, tone = 'primary', children }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; message: string; confirmLabel: string; tone?: BtnVariant; children?: ReactNode }) {
  return (
    <Overlay open={open} onClose={onClose} title={title}
      footer={<><Button variant="secondary" onClick={onClose}>Batal</Button><Button variant={tone} onClick={onConfirm}>{confirmLabel}</Button></>}>
      <p className="text-[15px] text-ink-2">{message}</p>
      {children}
    </Overlay>
  )
}

/** Panel sisi kanan (desktop) untuk detail. */
export function SidePanel({ title, onClose, children, footer }: { title: string; onClose?: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <Glass as="aside" className="anim-slide sticky top-6 flex max-h-[calc(100vh-48px)] min-w-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/70 px-5 py-3">
        <h2 className="text-[17px] font-semibold">{title}</h2>
        {onClose && <IconButton icon="x" label="Tutup detail" onClick={onClose} className="-mr-2" />}
      </div>
      {footer && <div className="flex gap-2 border-b border-white/70 px-5 py-3 [&>*]:flex-1">{footer}</div>}
      <div className="min-h-0 overflow-y-auto p-5">{children}</div>
    </Glass>
  )
}

const CAT_ICON: Record<string, string> = { Elektronik: 'monitor', 'Kabel dan Aksesori': 'cable', 'Alat Tulis': 'pen', 'Perlengkapan Kelas': 'board' }
const CAT_TINT: Record<string, string> = {
  Elektronik: 'from-[#BFDFFF] to-[#D9D0FF]',
  'Kabel dan Aksesori': 'from-[#D9D0FF] to-[#FFD3E6]',
  'Alat Tulis': 'from-[#FFE1C7] to-[#FFD3E6]',
  'Perlengkapan Kelas': 'from-[#C8F0D6] to-[#BFDFFF]',
}
export function ItemThumb({ kategori, foto, className = '', big }: { kategori: string; foto?: string; className?: string; big?: boolean }) {
  if (foto) {
    // Ukuran wadah mengikuti kelas dari pemanggil; tinggi cadangan hanya dipasang
    // bila kelas itu memakai `h-auto` atau tidak menentukan tinggi sama sekali.
    const autoH = /(?:^|\s)h-auto(?:\s|$)/.test(className)
    const noH = !/(?:^|\s)(?:h-|size-)/.test(className)
    return (
      <div className={`thumb relative overflow-hidden bg-black/[0.06] ${autoH || noH ? 'min-h-12' : ''} ${className}`} aria-hidden="true">
        <img src={foto} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
      </div>
    )
  }
  return (
    <div className={`thumb relative grid place-items-center overflow-hidden bg-gradient-to-br ${CAT_TINT[kategori] ?? 'from-[#E5E5EA] to-[#F2F2F7]'} ${className}`} aria-hidden="true">
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-white/40 blur-xl" />
      <div className={`grid place-items-center rounded-[18px] bg-white/60 text-ink-2 shadow-sm ${big ? 'size-24' : 'size-12'}`}>
        <Icon name={CAT_ICON[kategori] ?? 'box'} className={big ? 'size-11' : 'size-6'} stroke={1.5} />
      </div>
    </div>
  )
}

export function Avatar({ name, src, className = 'size-10 text-[15px]' }: { name: string; src?: string; className?: string }) {
  if (src) return <img src={src} alt={name} className={`shrink-0 rounded-full bg-black/[0.06] object-cover ${className}`} />
  const ini = name.replace(/^Dr\.\s*/, '').split(' ').slice(0, 2).map((w) => w[0]).join('')
  return <div className={`avatar-grad grid shrink-0 place-items-center rounded-full font-semibold text-on ${className}`}>{ini}</div>
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-[34px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="relative block flex-1">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-ink-2" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={`${inputCls()} pl-10`} />
      {value && <button onClick={() => onChange('')} aria-label="Hapus pencarian" className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-2 hover:bg-black/5"><Icon name="x" className="size-4" /></button>}
    </label>
  )
}

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const { performanceMode } = useStore()
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || performanceMode) { setShown(value); from.current = value; return }
    const a = from.current, t0 = performance.now(), dur = 600
    let raf = 0
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3)
      setShown(Math.round(a + (value - a) * e))
      if (p < 1) raf = requestAnimationFrame(step)
      else from.current = value
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, performanceMode])
  return <span className={`tabular-nums ${className ?? ''}`}>{shown}</span>
}

export function SuccessMark() {
  return (
    <div className="relative mx-auto mb-4 grid size-16 place-items-center">
      <span className="anim-ring absolute inset-0 rounded-full bg-success/30" />
      <span className="relative grid size-16 place-items-center rounded-full bg-success text-on">
        <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path className="anim-draw" d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </span>
    </div>
  )
}

export function FavButton({ itemId, className = '' }: { itemId: string; className?: string }) {
  const { favs, toggleFav, toast } = useStore()
  const on = favs.includes(itemId)
  return (
    <button type="button" aria-pressed={on} aria-label={on ? 'Hapus dari favorit' : 'Tambah ke favorit'} title={on ? 'Hapus dari favorit' : 'Favorit'}
      onClick={(e) => { e.stopPropagation(); toggleFav(itemId); toast(on ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit', on ? 'info' : 'success') }}
      className={`tap liquid glass grid size-10 place-items-center rounded-full ${on ? 'text-danger' : 'text-ink-2'} ${className}`}>
      <span key={String(on)} className={on ? 'anim-bounce' : ''}><Icon name="heart" className={`size-5 ${on ? 'fill-current' : ''}`} /></span>
    </button>
  )
}
