/**
 * Pinjam.in - Authentication & Universal Shell Layout Controller
 * 1:1 match with React Shell.tsx navigation hierarchy, role guards, and design tokens.
 */

import { api, showToast } from './api.js'
import { renderIcon } from './icons.js'
import { url, homeFor } from './routes.js'

export const Auth = {
  getUser() {
    try {
      const u = localStorage.getItem('pinjamin.user')
      if (!u) return null
      let parsed = JSON.parse(u)
      while (parsed && (parsed.user || parsed.me)) {
        parsed = parsed.user || parsed.me
      }
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  },

  getToken() {
    return localStorage.getItem('pinjamin.token') || null
  },

  isAuthenticated() {
    return !!(this.getUser() && this.getToken())
  },

  /**
   * Route guard for protected pages
   * @param {Object} [options]
   * @param {Array<string>} [options.roles] - Allowed roles e.g. ['Admin'], ['Dosen', 'Admin']
   * @returns {Object|null} The authenticated user
   */
  requireAuth({ roles = [] } = {}) {
    const user = this.getUser()
    const token = this.getToken()

    if (!user || !token) {
      window.location.replace(url('login'))
      return null
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      showToast(`Akses ditolak. Halaman khusus untuk: ${roles.join(' atau ')}.`, 'danger')
      setTimeout(() => {
        if (user.role === 'Admin') {
          window.location.replace(url('adminDashboard'))
        } else {
          window.location.replace(url('catalog'))
        }
      }, 400)
      return null
    }

    return user
  },

  async logout() {
    try {
      await api('/auth/logout', { method: 'POST' }).catch(() => {})
    } finally {
      localStorage.removeItem('pinjamin.token')
      localStorage.removeItem('pinjamin.user')
      localStorage.removeItem('pinjamin.session')
      localStorage.removeItem('pinjamin.state')
      window.location.replace(url('login'))
    }
  },

  /**
   * Render universal Shell (Sidebar + Headers + Mobile Bottom Nav)
   * @param {string} activePage - e.g. 'catalog', 'myloans', 'notifications', 'tolong', 'profile', 'admin-dashboard', 'admin-items', 'queue', 'admin-returns', 'admin-users', 'admin-calendar', 'admin-activity', 'admin-notifs', 'admin-rules'
   * @param {Object} [user] - Authenticated user object
   */
  renderShell(activePage, user) {
    if (!user) user = this.getUser()
    if (!user) return

    const role = user.role || 'Mahasiswa'

    // Define items per role exactly matching React Shell.tsx
    let primaryNav = []
    let extraNav = []

    if (role === 'Mahasiswa') {
      primaryNav = [
        { id: 'catalog', label: 'Beranda (Katalog)', short: 'Beranda', href: url('catalog'), icon: 'home' },
        { id: 'myloans', label: 'Peminjaman Saya', short: 'Pinjaman', href: url('myLoans'), icon: 'calendar' },
        { id: 'notifications', label: 'Notifikasi', short: 'Notifikasi', href: url('notifications'), icon: 'bell', badgeKey: 'notifs' },
        { id: 'tolong', label: 'Tolong.in', short: 'Tolong', href: url('tolong'), icon: 'mail', badgeKey: 'chats' },
        { id: 'profile', label: 'Profil', short: 'Profil', href: url('profile'), icon: 'user' },
      ]
    } else if (role === 'Dosen') {
      primaryNav = [
        { id: 'catalog', label: 'Beranda (Katalog)', short: 'Beranda', href: url('catalog'), icon: 'home' },
        { id: 'queue', label: 'Persetujuan', short: 'Setujui', href: url('queue'), icon: 'clipboard' },
        { id: 'myloans', label: 'Peminjaman Saya', short: 'Pinjaman', href: url('myLoans'), icon: 'calendar' },
        { id: 'notifications', label: 'Notifikasi', short: 'Notifikasi', href: url('notifications'), icon: 'bell', badgeKey: 'notifs' },
        { id: 'tolong', label: 'Tolong.in', short: 'Tolong', href: url('tolong'), icon: 'mail', badgeKey: 'chats' },
        { id: 'profile', label: 'Profil', short: 'Profil', href: url('profile'), icon: 'user' },
      ]
    } else if (role === 'Admin') {
      primaryNav = [
        { id: 'admin-dashboard', label: 'Dashboard', short: 'Dashboard', href: url('adminDashboard'), icon: 'grid' },
        { id: 'admin-items', label: 'Barang', short: 'Barang', href: url('adminItems'), icon: 'box' },
        { id: 'queue', label: 'Pengajuan', short: 'Pengajuan', href: url('queue'), icon: 'inbox' },
        { id: 'admin-returns', label: 'Pengembalian', short: 'Kembali', href: url('adminReturns'), icon: 'return' },
        { id: 'admin-users', label: 'Pengguna', short: 'Pengguna', href: url('adminUsers'), icon: 'users' },
      ]
      extraNav = [
        { id: 'tolong', label: 'Tolong.in', short: 'Tolong', href: url('tolong'), icon: 'mail', badgeKey: 'chats' },
        { id: 'admin-calendar', label: 'Kalender', short: 'Kalender', href: url('adminCalendar'), icon: 'calendar' },
        { id: 'admin-activity', label: 'Aktivitas', short: 'Aktivitas', href: url('adminActivity'), icon: 'clock' },
        { id: 'admin-notifs', label: 'Kirim Notifikasi', short: 'Kirim Notif', href: url('adminNotifs'), icon: 'sparkle' },
        { id: 'admin-rules', label: 'Aturan', short: 'Aturan', href: url('adminRules'), icon: 'sliders' },
        { id: 'catalog', label: 'Beranda (Katalog)', short: 'Beranda', href: url('catalog'), icon: 'home' },
        { id: 'notifications', label: 'Notifikasi', short: 'Notifikasi', href: url('notifications'), icon: 'bell', badgeKey: 'notifs' },
        { id: 'profile', label: 'Profil', short: 'Profil', href: url('profile'), icon: 'user' },
      ]
    }

    const titles = {
      catalog: 'Katalog Barang',
      myloans: 'Peminjaman Saya',
      queue: role === 'Dosen' ? 'Persetujuan' : 'Kelola Pengajuan',
      notifications: 'Notifikasi',
      tolong: 'Tolong.in (Bantuan)',
      profile: 'Profil Pengguna',
      'admin-dashboard': 'Dashboard Admin',
      'admin-items': 'Kelola Inventaris Barang',
      'admin-returns': 'Pencatatan Pengembalian',
      'admin-users': 'Kelola Pengguna',
      'admin-calendar': 'Kalender Ketersediaan',
      'admin-activity': 'Aktivitas Sistem',
      'admin-notifs': 'Kirim Notifikasi',
      'admin-rules': 'Pengaturan Aturan',
    }

    const safeUser = (user && (user.user || user.me)) ? (user.user || user.me) : (user || {})
    const userName = safeUser.nama || 'Pengguna'
    const userRole = safeUser.role || 'Mahasiswa'
    const userNimNip = safeUser.nim_nip || ''
    const userRoleDisplay = userNimNip ? `${userRole} · ${userNimNip}` : userRole

    const userInitials = userName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'U'

    // 1. Sidebar injection
    const sidebarContainer = document.getElementById('shell-sidebar')
    if (sidebarContainer) {
      sidebarContainer.innerHTML = `
        <aside class="sidebar" id="sidebar">
          <nav class="sidebar-panel" aria-label="Navigasi utama">
            <div class="sidebar-brand">
              <a href="${homeFor(role)}" class="brand-badge">
                <div class="brand-icon-box">
                  ${renderIcon('box', { size: 20, stroke: 2 })}
                </div>
                <span class="sidebar-link-text">Pinjam<span class="logo-text">.in</span></span>
              </a>
              <button type="button" class="icon-btn icon-btn-sm" id="sidebar-toggle" title="Ciutkan / Buka Sidebar" aria-label="Toggle sidebar">
                ${renderIcon('sidebar', { size: 18 })}
              </button>
            </div>

            <div class="sidebar-nav" id="sidebar-nav-list">
              ${primaryNav.map((item) => `
                <a href="${item.href}" class="sidebar-link ${activePage === item.id ? 'is-active' : ''}" data-nav-id="${item.id}">
                  <span class="sidebar-link-icon">${renderIcon(item.icon, { size: 19 })}</span>
                  <span class="sidebar-link-text">${item.label}</span>
                  ${item.badgeKey ? `<span class="sidebar-link-badge" id="badge-${item.badgeKey}" style="display: none;">0</span>` : ''}
                </a>
              `).join('')}

              ${extraNav.length > 0 ? `
                <div class="sidebar-section-title">LAINNYA</div>
                ${extraNav.map((item) => `
                  <a href="${item.href}" class="sidebar-link ${activePage === item.id ? 'is-active' : ''}" data-nav-id="${item.id}">
                    <span class="sidebar-link-icon">${renderIcon(item.icon, { size: 19 })}</span>
                    <span class="sidebar-link-text">${item.label}</span>
                    ${item.badgeKey ? `<span class="sidebar-link-badge" id="badge-${item.badgeKey}" style="display: none;">0</span>` : ''}
                  </a>
                `).join('')}
              ` : ''}
            </div>

            <div class="sidebar-footer">
              <button type="button" class="sidebar-link" data-action="toggle-theme" title="Ganti Mode Gelap/Terang">
                <span class="sidebar-link-icon">${renderIcon('moon', { size: 18 })}</span>
                <span class="sidebar-link-text">Mode Tampilan</span>
              </button>

              <a href="${url('profile')}" class="sidebar-user-card" id="user-profile-btn" title="Buka Profil (${userName})">
                <div class="avatar">${safeUser.foto ? `<img src="${safeUser.foto}" alt="${userName}">` : userInitials}</div>
                <div class="sidebar-user-meta">
                  <div class="sidebar-user-name" title="${userName}">${userName}</div>
                  <div class="sidebar-user-role">${userRoleDisplay}</div>
                </div>
              </a>

              <button type="button" class="sidebar-link" id="logout-btn" style="color: var(--c-danger);" title="Keluar">
                <span class="sidebar-link-icon">${renderIcon('logout', { size: 18 })}</span>
                <span class="sidebar-link-text">Keluar</span>
              </button>
            </div>
          </nav>
        </aside>
      `
    }

    // 2. Desktop top bar
    const desktopTopBar = document.getElementById('shell-topbar-desktop')
    if (desktopTopBar) {
      desktopTopBar.innerHTML = `
        <div class="breadcrumb">
          <span>Pinjam.in</span>
          <span>/</span>
          <span class="breadcrumb-active">${titles[activePage] || activePage}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${role !== 'Admin' ? `
            <button type="button" class="btn btn-secondary btn-sm" id="cart-btn-desktop">
              ${renderIcon('cart', { size: 16 })}
              <span>Keranjang</span>
              <span class="segmented-count" id="cart-badge-desktop" style="display: none;">0</span>
            </button>
          ` : ''}
          <a href="${url('notifications')}" class="icon-btn" title="Notifikasi" style="position: relative;">
            ${renderIcon('bell', { size: 18 })}
            <span class="icon-badge" id="top-bell-badge" style="display: none;">0</span>
          </a>
          <button type="button" class="icon-btn" data-action="toggle-theme" title="Ganti Tema">
            ${renderIcon('moon', { size: 18 })}
          </button>
        </div>
      `
    }

    // 3. Mobile top bar
    const mobileTopBar = document.getElementById('shell-topbar-mobile')
    if (mobileTopBar) {
      mobileTopBar.innerHTML = `
        <a href="${homeFor(role)}" class="brand-badge">
          <div class="brand-icon-box">
            ${renderIcon('box', { size: 18, stroke: 2 })}
          </div>
          <span>Pinjam<span class="logo-text">.in</span></span>
        </a>
        <div style="display: flex; align-items: center; gap: 0.25rem;">
          ${role !== 'Admin' ? `
            <button type="button" class="icon-btn" id="cart-btn-mobile" title="Keranjang" aria-label="Keranjang" style="position: relative;">
              ${renderIcon('cart', { size: 18 })}
              <span class="icon-badge" id="cart-badge-mobile" style="display: none;">0</span>
            </button>
          ` : ''}
          <a href="${url('notifications')}" class="icon-btn" title="Notifikasi" style="position: relative;">
            ${renderIcon('bell', { size: 18 })}
            <span class="icon-badge" id="mobile-bell-badge" style="display: none;">0</span>
          </a>
          <button type="button" class="icon-btn" data-action="toggle-theme" title="Ganti Mode Gelap/Terang">
            ${renderIcon('moon', { size: 18 })}
          </button>
          <button type="button" class="icon-btn" id="logout-btn-mobile" title="Keluar" style="color: var(--c-danger);">
            ${renderIcon('logout', { size: 18 })}
          </button>
        </div>
      `
    }

    // 4. Mobile bottom bar
    const bottomBar = document.getElementById('shell-bottombar-mobile')
    if (bottomBar) {
      const bottomItems = primaryNav.slice(0, 5)
      bottomBar.innerHTML = `
        <nav class="mobile-bottom-bar" aria-label="Navigasi bawah">
          ${bottomItems.map((item) => `
            <a href="${item.href}" class="mobile-nav-link ${activePage === item.id ? 'is-active' : ''}">
              <span class="mobile-nav-icon">
                ${renderIcon(item.icon, { size: 20 })}
                ${item.badgeKey ? `<span class="mobile-nav-badge" id="mobile-badge-${item.badgeKey}" style="display: none;">0</span>` : ''}
              </span>
              <span>${item.short}</span>
            </a>
          `).join('')}
        </nav>
      `
    }

    // Toggle sidebar collapse
    const sidebarToggle = document.getElementById('sidebar-toggle')
    if (sidebarToggle) {
      const sidebar = document.getElementById('sidebar')
      // Restore collapsed state
      if (localStorage.getItem('pinjamin.sidebar_collapsed') === 'true') {
        sidebar.classList.add('is-collapsed')
      }
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('is-collapsed')
        localStorage.setItem('pinjamin.sidebar_collapsed', sidebar.classList.contains('is-collapsed'))
      })
    }

    // Logout events
    const logoutBtn = document.getElementById('logout-btn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Yakin ingin keluar dari akun kamu?')) {
          Auth.logout()
        }
      })
    }

    const logoutBtnMobile = document.getElementById('logout-btn-mobile')
    if (logoutBtnMobile) {
      logoutBtnMobile.addEventListener('click', () => {
        if (confirm('Yakin ingin keluar dari akun kamu?')) {
          Auth.logout()
        }
      })
    }

    // Theme toggles
    if (window.Theme) {
      window.Theme.bindThemeToggles()
    }

    // Sync badges from state
    this.syncBadges()
  },

  /**
   * Sync unread notification and chat badges
   */
  async syncBadges() {
    try {
      const state = await api('/state').catch(() => null)
      if (!state) return

      const me = state.me || this.getUser()
      const notifs = state.notifs || []
      const chats = state.chats || []

      const unreadNotifs = notifs.filter((n) => !n.read).length
      let unreadChats = 0
      if (me) {
        unreadChats = chats.reduce((acc, c) => {
          const unreadMsgs = (c.messages || []).filter(
            (m) => m.userId !== me.id && !(m.readBy || []).includes(me.id)
          ).length
          return acc + (unreadMsgs > 0 ? 1 : 0)
        }, 0)
      }

      // Update notif badges
      const notifBadges = ['badge-notifs', 'top-bell-badge', 'mobile-bell-badge', 'mobile-badge-notifs']
      notifBadges.forEach((id) => {
        const el = document.getElementById(id)
        if (el) {
          if (unreadNotifs > 0) {
            el.textContent = unreadNotifs > 99 ? '99+' : unreadNotifs
            el.style.display = 'inline-flex'
          } else {
            el.style.display = 'none'
          }
        }
      })

      // Update chat badges
      const chatBadges = ['badge-chats', 'mobile-badge-chats']
      chatBadges.forEach((id) => {
        const el = document.getElementById(id)
        if (el) {
          if (unreadChats > 0) {
            el.textContent = unreadChats > 99 ? '99+' : unreadChats
            el.style.display = 'inline-flex'
          } else {
            el.style.display = 'none'
          }
        }
      })
    } catch {
      // ignore
    }
  },
}

if (typeof window !== 'undefined') {
  window.Auth = Auth
}
