/**
 * Pinjam.in Theme & Customization Engine
 * Manages Dark Mode, Performance Mode, Wireframe Mode, Time-of-Day, Wallpapers,
 * wallpaper blur and glass panels.
 *
 * Loaded as a classic (non-module) script in <head> on purpose: it must apply the
 * saved theme synchronously before first paint, otherwise every page navigation
 * flashes the light theme. Exposes `window.Theme`.
 */
;(function () {
  const THEME_KEY = 'pinjamin.theme'
  const WALL_KEY = 'pinjamin.wall'
  const WALL_IMAGE_KEY = 'pinjamin.wall.image'
  const PERF_KEY = 'pinjamin.performance'
  const WIRE_KEY = 'pinjamin.wireframe'

  const PRESETS = ['aurora', 'sunset', 'ocean', 'forest', 'plain']
  const DEFAULT_WALL = { id: 'default', blur: 0, glass: false, color: '#0A84FF', color2: '#8E7CFF' }
  const root = document.documentElement
  let imageObjectUrl = null

  const clampBlur = (n) => Math.max(0, Math.min(24, Math.round(Number(n) || 0)))

  // Relative luminance (0..1) of a #RRGGBB color.
  function luminance(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
    if (!m) return 1
    const v = parseInt(m[1], 16)
    const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => {
      c /= 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  }

  // Convert a stored data URL to a blob URL so the DOM doesn't carry a huge inline string.
  function dataUrlToObjectUrl(dataUrl) {
    try {
      const [head, b64] = dataUrl.split(',')
      const mime = (/data:([^;]+)/.exec(head) || [])[1] || 'image/jpeg'
      const bin = atob(b64)
      const bytes = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
      return URL.createObjectURL(new Blob([bytes], { type: mime }))
    } catch {
      return null
    }
  }

  const Theme = {
    PRESETS,

    init() {
      this.updateTOD()
      this.applyTheme(this.getTheme())
      this.applyPerformance(this.getPerformance())
      this.applyWireframe(this.getWireframe())
      this.applyWallpaper(this.getWallpaper())

      setInterval(() => this.updateTOD(), 60000)

      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', () => {
        if (this.getTheme() === 'system') this.applyTheme('system')
      })

      // Keep tabs in sync when settings change in another tab.
      window.addEventListener('storage', (e) => {
        if (e.key === THEME_KEY) this.applyTheme(this.getTheme())
        if (e.key === WALL_KEY || e.key === WALL_IMAGE_KEY) this.applyWallpaper(this.getWallpaper())
      })
    },

    emit() {
      window.dispatchEvent(new CustomEvent('pinjamin:themechange', {
        detail: { theme: this.getTheme(), dark: this.isDark(), wallpaper: this.getWallpaper() },
      }))
    },

    updateTOD() {
      const h = new Date().getHours()
      root.dataset.tod = h < 10 ? 'pagi' : h < 15 ? 'siang' : h < 19 ? 'sore' : 'malam'
    },

    /* ---------------- Light / Dark ---------------- */
    getTheme() {
      const t = localStorage.getItem(THEME_KEY)
      return t === 'dark' || t === 'system' || t === 'light' ? t : 'light'
    },

    setTheme(theme) {
      localStorage.setItem(THEME_KEY, theme)
      this.applyTheme(theme)
      this.emit()
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
      root.classList.toggle('dark', isDark)
    },

    /* ---------------- Performance / Wireframe ---------------- */
    getPerformance() {
      return localStorage.getItem(PERF_KEY) === 'true'
    },
    setPerformance(enabled) {
      localStorage.setItem(PERF_KEY, String(enabled))
      this.applyPerformance(enabled)
    },
    applyPerformance(enabled) {
      root.classList.toggle('performance-mode', enabled)
    },

    getWireframe() {
      return localStorage.getItem(WIRE_KEY) === 'true'
    },
    setWireframe(enabled) {
      localStorage.setItem(WIRE_KEY, String(enabled))
      this.applyWireframe(enabled)
    },
    applyWireframe(enabled) {
      root.classList.toggle('wireframe', enabled)
    },

    /* ---------------- Wallpaper ---------------- */
    getWallpaper() {
      let w = null
      try {
        const v = localStorage.getItem(WALL_KEY)
        w = v ? JSON.parse(v) : null
      } catch {
        w = null
      }
      // Older builds stored a bare preset name string.
      if (typeof w === 'string') w = { id: w }
      if (!w || typeof w !== 'object') w = {}
      const out = { ...DEFAULT_WALL, ...w }
      out.blur = clampBlur(out.blur)
      out.glass = !!out.glass
      const valid = out.id === 'default' || out.id === 'solid' || out.id === 'gradient' || out.id === 'image' || PRESETS.includes(out.id)
      if (!valid) out.id = 'default'
      if (out.id === 'image' && !this.getWallpaperImage()) out.id = 'default'
      return out
    },

    /** Merge a partial update (or a preset id string) into the saved wallpaper. */
    setWallpaper(update) {
      const patch = typeof update === 'string' ? { id: update } : (update || {})
      const next = { ...this.getWallpaper(), ...patch }
      next.blur = clampBlur(next.blur)
      try {
        localStorage.setItem(WALL_KEY, JSON.stringify(next))
      } catch {
        // localStorage full — still apply for this page.
      }
      this.applyWallpaper(next)
      this.emit()
      return next
    },

    getWallpaperImage() {
      return localStorage.getItem(WALL_IMAGE_KEY) || ''
    },

    /** Stores an image data URL. Returns false when browser storage is full. */
    setWallpaperImage(dataUrl) {
      try {
        localStorage.setItem(WALL_IMAGE_KEY, dataUrl)
      } catch {
        return false
      }
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl)
        imageObjectUrl = null
      }
      this.setWallpaper({ id: 'image' })
      return true
    },

    removeWallpaperImage() {
      localStorage.removeItem(WALL_IMAGE_KEY)
      if (imageObjectUrl) {
        URL.revokeObjectURL(imageObjectUrl)
        imageObjectUrl = null
      }
      if (this.getWallpaper().id === 'image') this.setWallpaper({ id: 'default' })
      else this.emit()
    },

    applyWallpaper(w) {
      w = w || this.getWallpaper()
      const el = root
      el.style.removeProperty('--wall-bg')
      el.style.removeProperty('--wall-a')
      el.style.removeProperty('--wall-b')
      el.style.setProperty('--wall-blur', `${clampBlur(w.blur)}px`)
      delete el.dataset.wallTone

      if (!w.id || w.id === 'default') {
        delete el.dataset.wall
        el.classList.remove('glass-ui')
        return
      }

      el.dataset.wall = w.id
      el.classList.toggle('glass-ui', !!w.glass)

      if (w.id === 'solid' || w.id === 'gradient') {
        const a = w.color || DEFAULT_WALL.color
        const b = w.id === 'solid' ? a : (w.color2 || DEFAULT_WALL.color2)
        el.style.setProperty('--wall-bg', w.id === 'solid' ? a : `linear-gradient(135deg, ${a}, ${b})`)
        el.style.setProperty('--wall-a', a)
        el.style.setProperty('--wall-b', b)
        el.dataset.wallTone = (luminance(a) + luminance(b)) / 2 < 0.35 ? 'dark' : 'light'
      } else if (w.id === 'image') {
        const data = this.getWallpaperImage()
        if (!imageObjectUrl && data) imageObjectUrl = dataUrlToObjectUrl(data)
        const url = imageObjectUrl || data
        el.style.setProperty('--wall-bg', `url("${url}") center / cover no-repeat`)
        el.dataset.wallTone = w.tone === 'dark' ? 'dark' : 'light'
      }
    },

    bindThemeToggles() {
      document.querySelectorAll('[data-action="toggle-theme"]').forEach((btn) => {
        if (btn.dataset.themeBound) return
        btn.dataset.themeBound = 'true'
        btn.addEventListener('click', () => Theme.toggleDark())
      })
    },
  }

  Theme.init()
  window.Theme = Theme
})()
