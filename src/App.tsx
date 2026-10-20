import { lazy, Suspense } from 'react'
import Shell, { Logo, Toasts } from './components/Shell'
import { ErrorState, Glass } from './components/ui'
import { StoreProvider, useStore } from './store'

const Auth = lazy(() => import('./screens/Auth'))
const Catalog = lazy(() => import('./screens/Catalog'))
const AdminCalendar = lazy(() => import('./screens/AdminCalendar'))
const AdminRules = lazy(() => import('./screens/AdminRules'))
const AdminActivity = lazy(() => import('./screens/AdminActivity'))
const AdminDashboard = lazy(() => import('./screens/AdminDashboard'))
const AdminItems = lazy(() => import('./screens/AdminItems'))
const AdminNotifs = lazy(() => import('./screens/AdminNotifs'))
const AdminReturns = lazy(() => import('./screens/AdminReturns'))
const AdminUsers = lazy(() => import('./screens/AdminUsers'))
const ItemDetail = lazy(() => import('./screens/ItemDetail'))
const LoanQueue = lazy(() => import('./screens/LoanQueue'))
const MyLoans = lazy(() => import('./screens/MyLoans'))
const Notifications = lazy(() => import('./screens/Notifications'))
const Profile = lazy(() => import('./screens/Profile'))
const Tolong = lazy(() => import('./screens/Tolong'))

function Mesh() {
  const { wallpaper } = useStore()
  return (
    <div className="mesh" aria-hidden="true">
      {wallpaper.id === 'custom' && wallpaper.image ? (
        <>
          <div className="mesh-photo" style={{ backgroundImage: `url(${wallpaper.image})`, ['--wall-blur' as string]: `${wallpaper.blur}px` }} />
          <div className="mesh-dim" />
        </>
      ) : wallpaper.id === 'solid' || wallpaper.id === 'gradient' ? (
        <>
          <div className="mesh-color" />
          <div className="mesh-dim" />
        </>
      ) : (
        <>
          <i className="-left-32 -top-32 size-[520px]" />
          <i className="right-[-10%] top-[20%] size-[460px]" />
          <i className="bottom-[-15%] left-[25%] size-[560px]" />
          <i className="bottom-[10%] right-[-8%] size-[300px]" />
        </>
      )}
    </div>
  )
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-live="polite">
      <div className="anim-pop">
        <div className="glass glass-strong flex flex-col items-center gap-3 rounded-[28px] px-10 py-8">
          <div className="scale-125"><Logo compact /></div>
          <p className="text-[14px] font-medium text-ink-2">Memulihkan sesi…</p>
        </div>
      </div>
    </div>
  )
}

function PageLoading() {
  return (
    <div className="py-16 text-center" role="status">
      <p className="text-[14px] font-medium text-ink-2">Menyiapkan halaman…</p>
    </div>
  )
}

function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center" role="status">
      <p className="text-[14px] font-medium text-ink-2">Membuka Pinjam.in…</p>
    </div>
  )
}

function Router() {
  const { me, page, role, authStatus, dataStatus, refresh } = useStore()
  if (authStatus === 'loading') return <Splash />
  if (authStatus === 'out') return <Suspense fallback={<AuthLoading />}><Auth /></Suspense>
  // Sesi aktif tetapi data server belum siap (memuat) atau gagal dimuat.
  if (!me) {
    if (dataStatus === 'error')
      return (
        <div className="grid min-h-screen place-items-center px-4">
          <div className="w-full max-w-md"><Glass><ErrorState onRetry={() => { refresh() }} /></Glass></div>
        </div>
      )
    return <Splash />
  }
  const screen = (() => {
    switch (page) {
      case 'item': return <ItemDetail />
      case 'myloans': return role === 'Admin' ? <Catalog /> : <MyLoans />
      case 'approvals': return <LoanQueue mode="dosen" />
      case 'notifs': return <Notifications />
      case 'tolong': return role === 'Admin' ? <Catalog /> : <Tolong />
      case 'profile': return <Profile />
      case 'dashboard': return <AdminDashboard />
      case 'admin-items': return <AdminItems />
      case 'admin-loans': return <LoanQueue mode="admin" />
      case 'admin-returns': return <AdminReturns />
      case 'admin-users': return <AdminUsers />
      case 'admin-calendar': return role === 'Admin' ? <AdminCalendar /> : <Catalog />
      case 'admin-rules': return role === 'Admin' ? <AdminRules /> : <Catalog />
      case 'admin-activity': return role === 'Admin' ? <AdminActivity /> : <Catalog />
      case 'admin-notifs': return role === 'Admin' ? <AdminNotifs /> : <Catalog />
      case 'admin-tolong': return role === 'Admin' ? <Tolong /> : <Catalog />
      default: return <Catalog />
    }
  })()
  return <Shell><Suspense fallback={<PageLoading />}>{screen}</Suspense></Shell>
}

export default function App() {
  return (
    <StoreProvider>
      <Mesh />
      <Router />
      <Toasts />
    </StoreProvider>
  )
}
