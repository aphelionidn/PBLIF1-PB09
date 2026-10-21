/**
 * Pinjam.in Theme & Customization Engine
 * Manages Dark Mode, Performance Mode, Wireframe Mode, Time-of-Day, and Wallpapers.
 */

const THEME_KEY = 'pinjamin.theme'
const WALL_KEY = 'pinjamin.wall'
const PERF_KEY = 'pinjamin.performance'
const WIRE_KEY = 'pinjamin.wireframe'

export const Theme = {
  init() {
    this.updateTOD()
    this.applyTheme(this.getTheme())
    this.applyPerformance(this.getPerformance())
    this.applyWireframe(this.getWireframe())
    this.applyWallpaper(this.getWallpaper())

    // Update TOD every minute
    setInterval(() => this.updateTOD(), 60000)

    // Listen to system dark mode change
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      if (this.getTheme() === 'system') {
        this.applyTheme('system')
      }
    })
  },

  updateTOD() {
    const h = new Date().getHours()
    const tod = h < 10 ? 'pagi' : h < 15 ? 'siang' : h < 19 ? 'sore' : 'malam'
    document.documentElement.dataset.tod = tod
  },

  getTheme() {
    return localStorage.getItem(THEME_KEY) || 'light'
  },

  setTheme(theme) {
    localStorage.setItem(THEME_KEY, theme)
    this.applyTheme(theme)
  },

  isDark() {
    const t = this.getTheme()
    if (t === 'dark') return true
    if (t === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches
    return false
  },

  toggleDark() {
    const next = this.isDark() ? 'light' : 'dark'
    this.setTheme(next)
    return next === 'dark'
  },

  applyTheme(theme) {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', isDark)
  },

  getPerformance() {
    return localStorage.getItem(PERF_KEY) === 'true'
  },

  setPerformance(enabled) {
    localStorage.setItem(PERF_KEY, String(enabled))
    this.applyPerformance(enabled)
  },

  applyPerformance(enabled) {
    document.documentElement.classList.toggle('performance-mode', enabled)
  },

  getWireframe() {
    return localStorage.getItem(WIRE_KEY) === 'true'
  },

  setWireframe(enabled) {
    localStorage.setItem(WIRE_KEY, String(enabled))
    this.applyWireframe(enabled)
  },

  applyWireframe(enabled) {
    document.documentElement.classList.toggle('wireframe', enabled)
  },

  getWallpaper() {
    try {
      const v = localStorage.getItem(WALL_KEY)
      return v ? JSON.parse(v) : { id: 'default', blur: 8 }
    } catch {
      return { id: 'default', blur: 8 }
    }
  },

  setWallpaper(w) {
    try {
      localStorage.setItem(WALL_KEY, JSON.stringify(w))
    } catch {
      // LocalStorage full
    }
    this.applyWallpaper(w)
  },

  applyWallpaper(w) {
    const el = document.documentElement
    if (!w || w.id === 'default') {
      delete el.dataset.wall
      el.style.removeProperty('--wall-bg')
      delete el.dataset.wallTone
      return
    }

    el.dataset.wall = w.id
    if (w.id === 'solid' || w.id === 'gradient') {
      const a = w.color || '#0A84FF'
      const b = w.color2 || '#8E7CFF'
      el.style.setProperty('--wall-bg', w.id === 'solid' ? a : `linear-gradient(135deg, ${a}, ${b})`)
      el.style.setProperty('--wall-a', a)
      el.style.setProperty('--wall-b', w.id === 'solid' ? a : b)
    } else {
      el.style.removeProperty('--wall-bg')
      delete el.dataset.wallTone
    }
  },

  bindThemeToggles() {
    document.querySelectorAll('[data-action="toggle-theme"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        Theme.toggleDark()
      })
    })
  }
}

// Auto-run immediately
Theme.init()

if (typeof window !== 'undefined') {
  window.Theme = Theme
}
