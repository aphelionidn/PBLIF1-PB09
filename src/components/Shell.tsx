import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import CartPanel from './CartPanel'
import type { Role } from '../data'
import { useStore, type Page } from '../store'
import { Avatar, Icon, IconButton, Overlay } from './ui'

type NavItem = { page: Page; label: string; short: string; icon: string }
const N = {
  catalog: { page: 'catalog', label: 'Beranda (Katalog)', short: 'Beranda', icon: 'home' },
  approvals: { page: 'approvals', label: 'Persetujuan', short: 'Setujui', icon: 'clipboard' },
  myloans: { page: 'myloans', label: 'Peminjaman Saya', short: 'Pinjaman', icon: 'calendar' },
  notifs: { page: 'notifs', label: 'Notifikasi', short: 'Notifikasi', icon: 'bell' },
  tolong: { page: 'tolong', label: 'Tolong.in', short: 'Tolong', icon: 'mail' },
  profile: { page: 'profile', label: 'Profil', short: 'Profil', icon: 'user' },
  dashboard: { page: 'dashboard', label: 'Dashboard', short: 'Dashboard', icon: 'grid' },
  items: { page: 'admin-items', label: 'Barang', short: 'Barang', icon: 'box' },
  loans: { page: 'admin-loans', label: 'Pengajuan', short: 'Pengajuan', icon: 'inbox' },
  returns: { page: 'admin-returns', label: 'Pengembalian', short: 'Kembali', icon: 'return' },
  users: { page: 'admin-users', label: 'Pengguna', short: 'Pengguna', icon: 'users' },
} satisfies Record<string, NavItem>

export const NAV: Record<Role, NavItem[]> = {
  Mahasiswa: [N.catalog, N.myloans, N.notifs, N.tolong, N.profile],
  Dosen: [N.catalog, N.approvals, N.myloans, N.notifs, N.tolong, N.profile],
  Admin: [N.dashboard, N.items, N.loans, N.returns, N.users],
}
const ADMIN_EXTRA: NavItem[] = [
  { page: 'admin-tolong', label: 'Tolong.in', short: 'Tolong', icon: 'mail' },
  { page: 'admin-calendar', label: 'Kalender', short: 'Kalender', icon: 'calendar' },
  { page: 'admin-activity', label: 'Aktivitas', short: 'Aktivitas', icon: 'clock' },
  { page: 'admin-notifs', label: 'Kirim Notifikasi', short: 'Kirim Notif', icon: 'sparkle' },
  { page: 'admin-rules', label: 'Aturan', short: 'Aturan', icon: 'sliders' },
  N.catalog, N.notifs, N.profile,
]

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="logo-grad grid size-9 place-items-center rounded-[11px] text-on">
        <Icon name="box" className="size-5" stroke={2} />
      </div>
      {!compact && <span className="text-[19px] font-bold tracking-tight">Pinjam<span className="logo-text">.in</span></span>}
    </div>
  )
}
export { Logo }

function BellDropdown() {
  const { myNotifs, nav, markAllRead, markRead } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const unread = myNotifs.filter((n) => !n.read).length
  useEffect(() => {
    const c = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', c)
    return () => document.removeEventListener('mousedown', c)
  }, [])
  return (
    <div className="relative" ref={ref}>
      <IconButton icon="bell" label={`Notifikasi, ${unread} belum dibaca`} badge={unread} onClick={() => setOpen((o) => !o)} className="glass" aria-expanded={open} />
      {open && (
        <div className="anim-pop absolute right-0 top-14 z-40 w-[380px]">
        <div className="glass glass-strong overflow-hidden rounded-[14px]">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-[17px] font-semibold">Notifikasi</p>
            <button onClick={markAllRead} disabled={!unread} className="rounded-lg px-2 py-1 text-[13px] font-semibold text-primary-pressed hover:bg-white/60 disabled:text-ink-2/60">Tandai semua dibaca</button>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {myNotifs.length === 0 && <p className="px-4 py-8 text-center text-[14px] text-ink-2">Belum ada notifikasi.</p>}
            {myNotifs.slice(0, 5).map((n) => (
              <button key={n.id} onClick={() => markRead(n.id)} className="flex w-full gap-3 border-t border-white/60 px-4 py-3 text-left hover:bg-white/50">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-primary'}`} aria-label={n.read ? 'Sudah dibaca' : 'Belum dibaca'} />
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{n.title}</span>
                  <span className="block text-[13px] text-ink-2">{n.message}</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-ink-2">{n.at}</span>
                </span>
              </button>
            ))}
          </div>
          <button onClick={() => { setOpen(false); nav('notifs') }} className="w-full border-t border-white/60 py-3 text-[14px] font-semibold text-primary-pressed hover:bg-white/50">Lihat semua notifikasi</button>
        </div>
        </div>
      )}
    </div>
  )
}

const TITLES: Record<Page, string> = {
  catalog: 'Katalog', item: 'Detail Barang', myloans: 'Peminjaman Saya', approvals: 'Persetujuan', notifs: 'Notifikasi', profile: 'Profil',
  dashboard: 'Dashboard', 'admin-items': 'Kelola Barang', 'admin-loans': 'Kelola Pengajuan', 'admin-returns': 'Pengembalian', 'admin-users': 'Kelola Pengguna',
  'admin-calendar': 'Kalender Ketersediaan', 'admin-rules': 'Pengaturan Aturan',
  'admin-activity': 'Aktivitas Sistem', 'admin-notifs': 'Kirim Notifikasi',
  tolong: 'Tolong.in', 'admin-tolong': 'Tolong.in',
}

/** Mengukur posisi tombol aktif di dalam container untuk highlight yang bergeser. */
function useIndicator(active: string | undefined, deps: unknown[]) {
  const box = useRef<HTMLDivElement>(null)
  const [r, setR] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = active ? box.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`) : null
      setR(el ? { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight } : null)
    }
    measure()
    // Ukur ulang setiap ukuran container berubah (mis. saat sidebar melebar/menyempit)
    const ro = new ResizeObserver(measure)
    if (box.current) ro.observe(box.current)
    window.addEventListener('resize', measure)
    return () => { ro.disconnect(); window.removeEventListener('resize', measure) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ...deps])
  return { box, r }
}

function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme } = useStore()
  const dark = theme === 'dark' || (theme === 'system' && document.documentElement.classList.contains('dark'))
  return (
    <button onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'} title={dark ? 'Mode terang' : 'Mode gelap'}
      className={`tap flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-[12px] px-3 text-[15px] font-medium text-ink hover:bg-white/50`}>
      <span key={String(dark)} className="anim-nudge grid shrink-0 place-items-center"><Icon name={dark ? 'sun' : 'moon'} /></span>
      <span className={`whitespace-nowrap transition-all duration-200 ${compact ? '-translate-x-2 opacity-0' : 'opacity-100'}`}>{dark ? 'Mode terang' : 'Mode gelap'}</span>
    </button>
  )
}

function CartButton({ className = '' }: { className?: string }) {
  const { cart, setCartOpen } = useStore()
  return <span key={cart.length} className={cart.length ? 'anim-badge inline-flex' : 'inline-flex'}><IconButton icon="cart" label={`Keranjang, ${cart.length} jenis barang`} badge={cart.length} onClick={() => setCartOpen(true)} className={className} /></span>
}

export default function Shell({ children }: { children: ReactNode }) {
  const { me, role, page, nav, myNotifs, unreadChats } = useStore()
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024)
  const [more, setMore] = useState(false)
  const items = NAV[role]
  const unread = myNotifs.filter((n) => !n.read).length
  const badgeOf = (p: Page) =>
    p === 'notifs' ? unread : p === 'tolong' || p === 'admin-tolong' ? unreadChats : 0
  const activePage = page === 'item' ? 'catalog' : page
  const side = useIndicator(activePage, [collapsed, role])
  const bottom = useIndicator(activePage, [role, page === 'item'])
  if (!me) return null
  const isActive = (p: Page) => p === activePage
  const canCart = role !== 'Admin'

  const sideLink = (it: NavItem) => (
    <button key={it.page} data-nav={it.page} onClick={() => nav(it.page)} aria-current={isActive(it.page) ? 'page' : undefined} title={collapsed ? it.label : undefined}
      className={`relative z-10 flex min-h-11 w-full items-center gap-3 overflow-hidden rounded-[12px] px-3 text-[15px] font-medium transition-colors ${isActive(it.page) ? 'text-primary-pressed' : 'text-ink hover:bg-white/40'}`}>
      <span key={isActive(it.page) ? 'on' : 'off'} className={`relative grid shrink-0 place-items-center ${isActive(it.page) ? 'anim-nudge' : ''}`}>
        <Icon name={it.icon} />
        {collapsed && badgeOf(it.page) > 0 && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-danger" />}
      </span>
      <span className={`flex-1 whitespace-nowrap text-left transition-all duration-200 ${collapsed ? 'pointer-events-none -translate-x-2 opacity-0' : 'translate-x-0 opacity-100 delay-75'}`}>{it.label}</span>
      {!collapsed && badgeOf(it.page) > 0 && <span className="anim-pop rounded-full bg-danger px-1.5 text-[11px] font-semibold text-on">{badgeOf(it.page)}</span>}
    </button>
  )

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop / tablet sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden p-3 md:block ${collapsed ? 'w-[88px]' : 'w-[264px]'} transition-[width] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]`}>
        <nav aria-label="Navigasi utama" className={`glass glass-strong flex h-full flex-col overflow-hidden rounded-[16px] transition-[padding] duration-300 ${collapsed ? 'p-2' : 'p-3'}`}>
          <div className={`mb-6 flex items-center px-1 pt-1 ${collapsed ? 'flex-col gap-3' : 'justify-between'}`}>
            <Logo compact={collapsed} />
            <IconButton icon="sidebar" label={collapsed ? 'Buka sidebar' : 'Ciutkan sidebar'} onClick={() => setCollapsed((c) => !c)} className="size-9" />
          </div>
          <div ref={side.box} className="relative flex flex-col gap-1 overflow-y-auto overflow-x-hidden">
            {side.r && <span aria-hidden className="absolute left-0 z-0 rounded-[10px] bg-tint-blue transition-all duration-300 ease-out" style={{ top: side.r.y, height: side.r.h, width: side.r.w }} />}
            {items.map(sideLink)}
            {role === 'Admin' && (
              <>
                <p className={`mb-1 mt-5 whitespace-nowrap px-3 text-[12px] font-semibold uppercase tracking-wide text-ink-2 transition-opacity duration-200 ${collapsed ? 'h-px bg-white/70 p-0 text-transparent' : ''}`}>{collapsed ? '' : 'Lainnya'}</p>
                {ADMIN_EXTRA.map(sideLink)}
              </>
            )}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-3">
            <ThemeToggle compact={collapsed} />
            <button onClick={() => nav('profile')} title={collapsed ? me.nama : undefined} className={`tap flex items-center gap-3 overflow-hidden rounded-[16px] text-left transition-all duration-300 ${collapsed ? 'p-1' : 'bg-white/50 p-2.5 hover:bg-white/80'}`}>
              <Avatar name={me.nama} src={me.foto} />
              <span className={`min-w-0 whitespace-nowrap transition-all duration-200 ${collapsed ? '-translate-x-2 opacity-0' : 'opacity-100'}`}>
                <span className="block truncate text-[14px] font-semibold">{me.nama}</span>
                <span className="block text-[12px] font-medium text-ink-2">{me.role} · {me.nim_nip}</span>
              </span>
            </button>
          </div>
        </nav>
      </aside>

      <div className={`min-w-0 flex-1 ${collapsed ? 'md:pl-[88px]' : 'md:pl-[264px]'} transition-[padding] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]`}>
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 pb-2 pt-3 md:hidden">
          <Logo />
          <div className="flex items-center gap-1">
            {canCart && <CartButton className="glass" />}
            <IconButton icon="bell" label={`Notifikasi, ${unread} belum dibaca`} badge={unread} onClick={() => nav('notifs')} className="glass" />
            {role === 'Admin' && <IconButton icon="more" label="Menu lainnya" onClick={() => setMore(true)} className="glass" />}
          </div>
        </header>
        {/* Desktop top bar */}
        <header className="hidden items-center justify-between px-8 pt-6 md:flex">
          <p className="text-[13px] font-medium text-ink-2">Pinjam.in <span className="mx-1">/</span> <span className="text-ink">{TITLES[page]}</span></p>
          <div className="flex items-center gap-1">{canCart && <CartButton />}<BellDropdown /></div>
        </header>
        <main className="overflow-x-clip px-4 pb-32 pt-2 md:px-8 md:pb-12 md:pt-4"><div key={page} className="anim-page">{children}</div></main>
      </div>

      {/* Mobile bottom nav */}
      {page !== 'item' && <nav aria-label="Navigasi utama" className="glass glass-strong fixed inset-x-3 bottom-3 z-30 rounded-[16px] p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden">
        <div ref={bottom.box} className="relative flex">
          {bottom.r && <span aria-hidden className="absolute top-0 rounded-[12px] bg-tint-blue transition-all duration-300 ease-out" style={{ left: bottom.r.x, width: bottom.r.w, height: bottom.r.h }} />}
          {items.map((it) => (
            <button key={it.page} data-nav={it.page} onClick={() => nav(it.page)} aria-current={isActive(it.page) ? 'page' : undefined}
              className={`tap relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] text-[11px] font-semibold transition-colors ${isActive(it.page) ? 'text-primary-pressed' : 'text-ink-2'}`}>
              <span key={isActive(it.page) ? 'on' : 'off'} className={isActive(it.page) ? 'anim-bounce' : ''}><Icon name={it.icon} className="size-[22px]" /></span>
              {it.short}
              {badgeOf(it.page) > 0 && <span className="absolute right-[calc(50%-18px)] top-1.5 size-2 rounded-full bg-danger" />}
            </button>
          ))}
        </div>
      </nav>}

      <Overlay open={more} onClose={() => setMore(false)} title="Lainnya">
        <div className="flex flex-col gap-1">
          {ADMIN_EXTRA.map((it) => (
            <button key={it.page} onClick={() => { setMore(false); nav(it.page) }} className="tap flex min-h-12 items-center gap-3 rounded-[14px] px-3 text-[16px] font-medium hover:bg-white/60">
              <Icon name={it.icon} className="size-5 text-primary" /> {it.label}
              <Icon name="right" className="ml-auto size-4 text-ink-2" />
            </button>
          ))}
          <div className="mt-2 border-t border-white/60 pt-2"><ThemeToggle /></div>
        </div>
      </Overlay>
      <CartPanel />
    </div>
  )
}

export function Toasts() {
  const { toasts } = useStore()
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-auto md:left-auto md:right-6 md:top-6 md:items-end">
      {toasts.map((t) => (
        <div key={t.id} className="anim-pop">
          <div className="glass glass-strong flex items-center gap-2.5 rounded-[12px] py-2.5 pl-3 pr-4 text-[14px] font-semibold">
            <span className={`grid size-6 place-items-center rounded-full text-on ${t.tone === 'success' ? 'bg-success' : t.tone === 'danger' ? 'bg-danger' : 'bg-primary'}`}>
              <Icon name={t.tone === 'success' ? 'check' : t.tone === 'danger' ? 'x' : 'info'} className="size-3.5" stroke={2.5} />
            </span>
            {t.msg}
          </div>
        </div>
      ))}
    </div>
  )
}
