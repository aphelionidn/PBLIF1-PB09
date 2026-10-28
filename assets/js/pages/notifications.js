/**
 * Pinjam.in - Notifications Screen Controller
 * 1:1 match with React Notifications.tsx
 */

import { api, showToast } from '../core/api.js'
import { Auth } from '../core/auth.js'
import { renderIcon } from '../core/icons.js'

const KIND_META = {
  booking: { icon: 'inbox', bg: 'var(--c-tint-blue)', color: 'var(--c-primary-pressed)' },
  approved: { icon: 'check', bg: 'var(--c-tint-green)', color: 'var(--c-success)' },
  rejected: { icon: 'x', bg: 'var(--c-tint-red)', color: 'var(--c-danger)' },
  reminder: { icon: 'clock', bg: 'var(--c-tint-orange)', color: 'var(--c-warning)' },
  overdue: { icon: 'alert', bg: 'var(--c-danger)', color: '#FFFFFF' },
  warning: { icon: 'alert', bg: 'var(--c-tint-orange)', color: 'var(--c-warning)' },
  info: { icon: 'info', bg: 'var(--c-tint-blue)', color: 'var(--c-primary-pressed)' },
}

const PAGE_SIZE = 10
let currentPage = 1
let notifications = []

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireAuth()
  if (!user) return

  Auth.renderShell('notifications', user)

  const markAllBtn = document.getElementById('mark-all-btn')
  markAllBtn.addEventListener('click', async () => {
    try {
      markAllBtn.disabled = true
      await api('/notifs/read', { method: 'POST', body: { ids: [] } })
      notifications.forEach((n) => { n.read = true })
      renderNotifications()
      showToast('Semua notifikasi ditandai dibaca', 'success')
      Auth.syncBadges()
    } catch (e) {
      showToast(e.message || 'Gagal menandai notifikasi', 'danger')
    } finally {
      markAllBtn.disabled = false
    }
  })

  await loadNotifications()
})

async function loadNotifications() {
  const loadingEl = document.getElementById('notif-loading')
  const emptyEl = document.getElementById('notif-empty')
  const listEl = document.getElementById('notif-items-list')
  const subtitleEl = document.getElementById('notif-subtitle')
  const markAllBtn = document.getElementById('mark-all-btn')

  try {
    const state = await api('/state')
    notifications = state.notifs || []
    loadingEl.style.display = 'none'

    renderNotifications()
  } catch (error) {
    loadingEl.innerHTML = `<p style="color: var(--c-danger);">${error.message || 'Gagal memuat notifikasi.'}</p>`
  }
}

function renderNotifications() {
  const emptyEl = document.getElementById('notif-empty')
  const listEl = document.getElementById('notif-items-list')
  const subtitleEl = document.getElementById('notif-subtitle')
  const markAllBtn = document.getElementById('mark-all-btn')
  const paginationEl = document.getElementById('pagination-container')

  const unreadCount = notifications.filter((n) => !n.read).length
  subtitleEl.textContent = unreadCount ? `${unreadCount} belum dibaca` : 'Semua notifikasi sudah dibaca'
  markAllBtn.disabled = unreadCount === 0

  if (notifications.length === 0) {
    emptyEl.style.display = 'block'
    listEl.innerHTML = ''
    paginationEl.innerHTML = ''
    return
  }

  emptyEl.style.display = 'none'

  const totalPages = Math.ceil(notifications.length / PAGE_SIZE)
  if (currentPage > totalPages) currentPage = totalPages || 1

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pagedItems = notifications.slice(startIdx, startIdx + PAGE_SIZE)

  listEl.innerHTML = pagedItems
    .map((n) => {
      const k = KIND_META[n.kind] || KIND_META.info
      return `
        <button type="button" class="notif-item ${n.read ? '' : 'is-unread'}" data-id="${n.id}">
          <div class="notif-icon-box" style="background-color: ${k.bg}; color: ${k.color};">
            ${renderIcon(k.icon, { size: 20 })}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem;">
              <span style="font-size: 0.9375rem; font-weight: 600; color: var(--c-ink);">${n.title}</span>
              <span style="font-size: 0.75rem; color: var(--c-ink-2); flex-shrink: 0;">${n.at || ''}</span>
            </div>
            <p style="margin-top: 0.25rem; font-size: 0.875rem; color: var(--c-ink-2); line-height: 1.45;">${n.message || ''}</p>
          </div>
          <span class="notif-dot ${n.read ? 'is-read' : ''}" aria-label="${n.read ? 'Sudah dibaca' : 'Belum dibaca'}"></span>
        </button>
      `
    })
    .join('')

  // Bind click to mark single as read
  listEl.querySelectorAll('.notif-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-id')
      const notif = notifications.find((x) => x.id === id)
      if (notif && !notif.read) {
        notif.read = true
        btn.classList.remove('is-unread')
        const dot = btn.querySelector('.notif-dot')
        if (dot) dot.classList.add('is-read')
        try {
          await api('/notifs/read', { method: 'POST', body: { ids: [id] } })
          Auth.syncBadges()
        } catch {
          // ignore
        }
        const updatedUnread = notifications.filter((n) => !n.read).length
        subtitleEl.textContent = updatedUnread ? `${updatedUnread} belum dibaca` : 'Semua notifikasi sudah dibaca'
        markAllBtn.disabled = updatedUnread === 0
      }
    })
  })

  // Render pagination controls
  if (totalPages > 1) {
    paginationEl.innerHTML = `
      <p style="font-size: 0.8125rem; color: var(--c-ink-2);">
        Menampilkan ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, notifications.length)} dari ${notifications.length} notifikasi
      </p>
      <div style="display: flex; gap: 0.5rem;">
        <button type="button" class="btn btn-secondary btn-sm" id="prev-page-btn" ${currentPage === 1 ? 'disabled' : ''}>
          Sebelumnya
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="next-page-btn" ${currentPage === totalPages ? 'disabled' : ''}>
          Berikutnya
        </button>
      </div>
    `

    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--
        renderNotifications()
      }
    })
    document.getElementById('next-page-btn')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++
        renderNotifications()
      }
    })
  } else {
    paginationEl.innerHTML = ''
  }
}
