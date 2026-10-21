/**
 * Pinjam.in - Authentication & Shell Layout Controller
 * Manages user sessions, role-based page guards, sidebar rendering, and navigation.
 */

import { api, showToast } from './api.js'
import { renderIcon } from './icons.js'

export const Auth = {
  getUser() {
    try {
      const u = localStorage.getItem('pinjamin.user')
      return u ? JSON.parse(u) : null
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
   * @param {Array<string>} [options.roles] - Allowed roles, e.g. ['Admin'], ['Dosen', 'Admin']
   * @returns {Object|null} The authenticated user
   */
  requireAuth({ roles = [] } = {}) {
    const user = this.getUser()
    if (!user || !this.getToken()) {
      window.location.href = 'login.html'
      return null
    }

    if (roles.length > 0 && !roles.includes(user.role)) {
      alert(`Akses ditolak. Halaman ini memerlukan hak akses: ${roles.join(' atau ')}.`)
      if (user.role === 'Admin') {
        window.location.href = 'admin-items.html'
      } else {
        window.location.href = 'catalog.html'
      }
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
      window.location.href = 'login.html'
    }
  },

  /**
   * Render universal Shell (Sidebar + Headers + Mobile Bottom Nav)
   * @param {string} activePage - Identifier for current page ('catalog', 'myloans', 'queue', 'admin-items', 'admin-returns')
   * @param {Object} user - Authenticated user object
   */
  renderShell(activePage, user) {
    if (!user) user = this.getUser()
    if (!user) return

    const role = user.role || 'Mahasiswa'

    // Define navigation items per role
    let navLinks = []
    if (role === 'Mahasiswa') {
      navLinks = [
        { id: 'catalog', label: 'Katalog', short: 'Katalog', href: 'catalog.html', icon: 'home' },
        { id: 'myloans', label: 'Peminjaman Saya', short: 'Pinjaman', href: 'my-loans.html', icon: 'calendar' },
      ]
    } else if (role === 'Dosen') {
      navLinks = [
        { id: 'catalog', label: 'Katalog', short: 'Katalog', href: 'catalog.html', icon: 'home' },
        { id: 'queue', label: 'Persetujuan', short: 'Setujui', href: 'queue.html', icon: 'clipboard' },
        { id: 'myloans', label: 'Peminjaman Saya', short: 'Pinjaman', href: 'my-loans.html', icon: 'calendar' },
      ]
    } else if (role === 'Admin') {
      navLinks = [
        { id: 'queue', label: 'Kelola Pengajuan', short: 'Pengajuan', href: 'queue.html', icon: 'inbox' },
        { id: 'admin-items', label: 'Kelola Barang', short: 'Barang', href: 'admin-items.html', icon: 'box' },
        { id: 'admin-returns', label: 'Pengembalian', short: 'Kembali', href: 'admin-returns.html', icon: 'return' },
        { id: 'catalog', label: 'Katalog Barang', short: 'Katalog', href: 'catalog.html', icon: 'home' },
      ]
    }

    // 1. Sidebar injection
    const sidebarContainer = document.getElementById('shell-sidebar')
    if (sidebarContainer) {
      const userInitials = (user.nama || 'User').split(' ').slice(0, 2).map((w) => w[0]).join('')
      sidebarContainer.innerHTML = `
        <aside class="sidebar" id="sidebar">
          <nav class="sidebar-panel" aria-label="Navigasi utama">
            <div class="sidebar-brand">
              <a href="catalog.html" class="brand-badge">
                <div class="brand-icon-box">
                  ${renderIcon('box', { size: 20, stroke: 2 })}
                </div>
                <span class="sidebar-link-text">Pinjam<span class="logo-text">.in</span></span>
              </a>
              <button type="button" class="icon-btn icon-btn-sm" id="sidebar-toggle" title="Ciutkan / Buka Sidebar" aria-label="Toggle sidebar">
                ${renderIcon('sidebar', { size: 18 })}
              </button>
            </div>

            <div class="sidebar-nav">
              ${navLinks.map((item) => `
                <a href="${item.href}" class="sidebar-link ${activePage === item.id ? 'is-active' : ''}">
                  <span class="sidebar-link-icon">${renderIcon(item.icon, { size: 20 })}</span>
                  <span class="sidebar-link-text">${item.label}</span>
                </a>
              `).join('')}
            </div>

            <div class="sidebar-footer">
              <button type="button" class="sidebar-link" data-action="toggle-theme" title="Ganti Mode Gelap/Terang">
                <span class="sidebar-link-icon">${renderIcon('moon', { size: 18 })}</span>
                <span class="sidebar-link-text">Mode Tampilan</span>
              </button>

              <div class="sidebar-user-card" id="user-profile-btn" title="${user.nama}">
                <div class="avatar">${user.foto ? `<img src="${user.foto}" alt="${user.nama}">` : userInitials}</div>
                <div class="sidebar-user-meta">
                  <div class="sidebar-user-name">${user.nama}</div>
                  <div class="sidebar-user-role">${user.role} · ${user.nim_nip}</div>
                </div>
              </div>

              <button type="button" class="sidebar-link" id="logout-btn" style="color: var(--c-danger);" title="Keluar">
                <span class="sidebar-link-icon">${renderIcon('logout', { size: 18 })}</span>
                <span class="sidebar-link-text">Keluar</span>
              </button>
            </div>
          </nav>
        </aside>
      `
    }

    // 2. Mobile top bar
    const mobileTopBar = document.getElementById('shell-topbar-mobile')
    if (mobileTopBar) {
      mobileTopBar.innerHTML = `
        <a href="catalog.html" class="brand-badge">
          <div class="brand-icon-box">
            ${renderIcon('box', { size: 18, stroke: 2 })}
          </div>
          <span>Pinjam<span class="logo-text">.in</span></span>
        </a>
        <div style="display: flex; align-items: center; gap: 0.25rem;">
          ${role !== 'Admin' ? `
            <button type="button" class="icon-btn glass" id="cart-btn-mobile" title="Keranjang" aria-label="Keranjang">
              ${renderIcon('cart', { size: 18 })}
              <span class="icon-badge" id="cart-badge-mobile" style="display: none;">0</span>
            </button>
          ` : ''}
          <button type="button" class="icon-btn glass" data-action="toggle-theme" title="Ganti Mode Gelap/Terang">
            ${renderIcon('moon', { size: 18 })}
          </button>
          <button type="button" class="icon-btn glass" id="logout-btn-mobile" title="Keluar" style="color: var(--c-danger);">
            ${renderIcon('logout', { size: 18 })}
          </button>
        </div>
      `
    }

    // 3. Desktop top bar
    const desktopTopBar = document.getElementById('shell-topbar-desktop')
    if (desktopTopBar) {
      const pageTitles = {
        catalog: 'Katalog Barang',
        myloans: 'Peminjaman Saya',
        queue: role === 'Dosen' ? 'Persetujuan Booking' : 'Kelola Pengajuan',
        'admin-items': 'Kelola Barang',
        'admin-returns': 'Pencatatan Pengembalian',
      }
      desktopTopBar.innerHTML = `
        <div class="breadcrumb">
          <span>Pinjam.in</span>
          <span>/</span>
          <span class="breadcrumb-active">${pageTitles[activePage] || activePage}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${role !== 'Admin' ? `
            <button type="button" class="btn btn-secondary btn-sm" id="cart-btn-desktop">
              ${renderIcon('cart', { size: 16 })}
              <span>Keranjang</span>
              <span class="segmented-count" id="cart-badge-desktop" style="display: none;">0</span>
            </button>
          ` : ''}
          <button type="button" class="icon-btn" data-action="toggle-theme" title="Ganti Tema">
            ${renderIcon('moon', { size: 18 })}
          </button>
        </div>
      `
    }

    // 4. Mobile Bottom Bar
    const bottomBar = document.getElementById('shell-bottombar-mobile')
    if (bottomBar) {
      bottomBar.innerHTML = `
        <nav class="mobile-bottom-bar" aria-label="Navigasi bawah">
          ${navLinks.map((item) => `
            <a href="${item.href}" class="mobile-nav-link ${activePage === item.id ? 'is-active' : ''}">
              ${renderIcon(item.icon, { size: 20 })}
              <span>${item.short}</span>
            </a>
          `).join('')}
        </nav>
      `
    }

    // Bind event listeners
    const sidebarToggle = document.getElementById('sidebar-toggle')
    if (sidebarToggle) {
      const sidebar = document.getElementById('sidebar')
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('is-collapsed')
      })
    }

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

    // Re-bind theme buttons
    if (window.Theme) {
      window.Theme.bindThemeToggles()
    }
  }
}

if (typeof window !== 'undefined') {
  window.Auth = Auth
}
