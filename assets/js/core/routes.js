/**
 * Pinjam.in - Central route map.
 * Every page URL is resolved from the site root (derived from this file's location),
 * so links and redirects work from any folder (auth/, pages/, admin/) and under any base path.
 */

export const ROOT = new URL('../../../', import.meta.url)

export const ROUTES = {
  home: 'index.html',
  login: 'auth/login.html',

  // Mahasiswa / Dosen (queue is shared with Admin)
  catalog: 'pages/catalog.html',
  myLoans: 'pages/my-loans.html',
  notifications: 'pages/notifications.html',
  tolong: 'pages/tolong.html',
  profile: 'pages/profile.html',
  queue: 'pages/queue.html',

  // Admin
  adminDashboard: 'admin/dashboard.html',
  adminItems: 'admin/items.html',
  adminReturns: 'admin/returns.html',
  adminUsers: 'admin/users.html',
  adminCalendar: 'admin/calendar.html',
  adminActivity: 'admin/activity.html',
  adminNotifs: 'admin/notifs.html',
  adminRules: 'admin/rules.html',
}

/** Absolute URL for a route key, e.g. url('catalog'). */
export const url = (key) => new URL(ROUTES[key], ROOT).href

/** Landing page for a role after login or when access is denied. */
export const homeFor = (role) => url(role === 'Admin' ? 'adminDashboard' : 'catalog')

export const isLoginPage = () => window.location.pathname.endsWith('/' + ROUTES.login)
