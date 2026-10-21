/**
 * Pinjam.in - API Client & Core Domain Helpers
 * Strictly consumes the Supabase Edge Function REST API endpoints.
 */

export const PROJECT_ID = 'uljsqrakyulxkhbyvdps'
export const PUBLIC_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsanNxcmFreXVseGtoYnl2ZHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjA0MTcsImV4cCI6MjEwNjU5NjQxN30.-NbvlEjViHqshbXwJluarNnxYODKZO7dglTtNnV5ITE'
export const BASE_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/make-server-5a56c1fa`

export const pad = (n) => String(n).padStart(2, '0')
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const TODAY = toISO(new Date())

export const addDays = (iso, n) => {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export const day = (n) => addDays(TODAY, n)

export const diffDays = (a, b) =>
  Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86400000)

export const fmtDate = (iso) => {
  if (!iso) return '-'
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
  } catch {
    return iso
  }
}

export const fmtRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} – ${fmtDate(b)}`)

export const fmtMonth = (ym) => {
  try {
    return new Date(ym + '-01T00:00:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  } catch {
    return ym
  }
}

export const isCampusEmail = (e) => /^[^\s@]+@([a-z0-9-]+\.)*polibatam\.ac\.id$/i.test(String(e || '').trim())

/**
 * Toast notification system
 */
export function showToast(message, tone = 'success') {
  let container = document.getElementById('toast-container')
  if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.className = 'toast-container'
    container.setAttribute('aria-live', 'polite')
    document.body.appendChild(container)
  }

  const toast = document.createElement('div')
  toast.className = `toast toast-${tone}`
  const iconName = tone === 'success' ? 'check' : tone === 'danger' ? 'x' : 'info'
  const svg = window.renderIcon ? window.renderIcon(iconName, { size: 14, stroke: 2.5 }) : '✓'

  toast.innerHTML = `
    <span class="toast-icon">${svg}</span>
    <span class="toast-msg">${message}</span>
  `

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('closing')
    setTimeout(() => toast.remove(), 250)
  }, 2800)
}

/**
 * REST API Client
 */
export async function api(path, opts = {}) {
  let token = localStorage.getItem('pinjamin.token')
  if (!token) {
    try {
      const sess = JSON.parse(localStorage.getItem('pinjamin.session') || '{}')
      token = sess.access_token
    } catch {
      // ignore
    }
  }

  const authHeader = `Bearer ${token || PUBLIC_ANON_KEY}`
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)

  let res
  try {
    res = await fetch(BASE_URL + path, {
      method: opts.method || (opts.body ? 'POST' : 'GET'),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Server terlalu lama merespons. Coba lagi.')
    }
    throw new Error('Tidak bisa terhubung ke server. Periksa koneksi kamu.')
  } finally {
    window.clearTimeout(timeout)
  }

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('pinjamin.token')
      localStorage.removeItem('pinjamin.user')
      localStorage.removeItem('pinjamin.session')
      // Redirect to login if unauthorized and not already on login page
      if (!window.location.pathname.includes('login.html')) {
        window.location.href = 'login.html'
      }
    }
    const msg = json.error || json.message || `Server error ${res.status}`
    const err = new Error(res.status === 404 && !msg ? 'Endpoint belum tersedia.' : msg)
    err.status = res.status
    throw err
  }

  return json
}

if (typeof window !== 'undefined') {
  window.api = api
  window.showToast = showToast
  window.fmtDate = fmtDate
  window.fmtRange = fmtRange
  window.diffDays = diffDays
  window.addDays = addDays
  window.TODAY = TODAY
}
