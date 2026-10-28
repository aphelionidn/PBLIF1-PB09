/**
 * Pinjam.in - Admin Broadcast Notifications Screen Controller
 * 1:1 match with React AdminNotifs.tsx
 */

import { api, showToast, toList } from '../core/api.js'
import { Auth } from '../core/auth.js'

let allUsers = []
let allBroadcasts = []
let selectedType = 'Info'
let targetAudience = 'semua'
let selectedUserIds = new Set()

const TYPE_DESCS = {
  Peringatan: 'Hal mendesak atau peringatan kedisiplinan yang butuh perhatian segera.',
  Pesan: 'Pesan atau pengumuman berkala untuk pengguna.',
  Info: 'Informasi umum seputar fasilitas atau layanan.',
}

document.addEventListener('DOMContentLoaded', async () => {
  const admin = Auth.requireAuth({ roles: ['Admin'] })
  if (!admin) return

  Auth.renderShell('admin-notifs', admin)

  // Type selection
  document.querySelectorAll('#type-selector .type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#type-selector .type-btn').forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      selectedType = btn.getAttribute('data-type')
      document.getElementById('type-description').textContent = TYPE_DESCS[selectedType] || ''
    })
  })

  // Audience selection
  const userBox = document.getElementById('specific-users-box')
  document.querySelectorAll('[data-target]').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-target]').forEach((c) => c.classList.remove('is-active'))
      chip.classList.add('is-active')
      targetAudience = chip.getAttribute('data-target')
      userBox.style.display = targetAudience === 'pilih' ? 'block' : 'none'
    })
  })

  // Search specific users
  document.getElementById('search-target-user')?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim()
    renderUserCheckboxes(q)
  })

  // Submit broadcast
  document.getElementById('broadcast-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const title = document.getElementById('bc-title').value.trim()
    const message = document.getElementById('bc-message').value.trim()
    const btn = document.getElementById('send-broadcast-btn')
    const btnText = document.getElementById('send-btn-text')

    if (title.length < 3) {
      showToast('Judul minimal 3 karakter.', 'danger')
      return
    }
    if (message.length < 3) {
      showToast('Pesan minimal 3 karakter.', 'danger')
      return
    }
    if (targetAudience === 'pilih' && selectedUserIds.size === 0) {
      showToast('Pilih minimal satu penerima spesifik.', 'danger')
      return
    }

    btn.disabled = true
    btnText.textContent = 'Menyiarkan…'

    try {
      const payload = {
        type: selectedType,
        title,
        message,
        audience: targetAudience === 'pilih' ? 'semua' : targetAudience,
      }
      if (targetAudience === 'pilih') {
        payload.recipientIds = Array.from(selectedUserIds)
      }

      await api('/admin/notifs', {
        method: 'POST',
        body: payload,
      })

      showToast('Notifikasi berhasil disiarkan!', 'success')
      document.getElementById('bc-title').value = ''
      document.getElementById('bc-message').value = ''
      selectedUserIds.clear()
      renderUserCheckboxes()

      await loadBroadcasts()
    } catch (err) {
      showToast(err.message || 'Gagal menyiarkan notifikasi', 'danger')
    } finally {
      btn.disabled = false
      btnText.textContent = 'Siarkan Notifikasi'
    }
  })

  document.getElementById('refresh-broadcasts-btn')?.addEventListener('click', loadBroadcasts)

  await Promise.all([loadUsers(), loadBroadcasts()])
})

async function loadUsers() {
  try {
    const state = await api('/state')
    allUsers = state.users || []
    renderUserCheckboxes()
  } catch {
    // ignore
  }
}

function renderUserCheckboxes(filterQ = '') {
  const container = document.getElementById('users-checkboxes')
  if (!container) return

  const filtered = allUsers.filter((u) => {
    if (!u.aktif) return false
    if (filterQ) {
      return [u.nama, u.nim_nip, u.email].some((v) => (v || '').toLowerCase().includes(filterQ))
    }
    return true
  })

  if (filtered.length === 0) {
    container.innerHTML = '<p style="font-size: 0.75rem; color: var(--c-ink-2);">Tidak ada pengguna ditemukan.</p>'
    return
  }

  container.innerHTML = filtered.map((u) => {
    const checked = selectedUserIds.has(u.id) ? 'checked' : ''
    return `
      <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; color: var(--c-ink); cursor: pointer;">
        <input type="checkbox" data-uid="${u.id}" ${checked}>
        <span>${u.nama} (${u.role})</span>
      </label>
    `
  }).join('')

  container.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const uid = cb.getAttribute('data-uid')
      if (e.target.checked) {
        selectedUserIds.add(uid)
      } else {
        selectedUserIds.delete(uid)
      }
    })
  })
}

async function loadBroadcasts() {
  const loading = document.getElementById('broadcasts-loading')
  const empty = document.getElementById('broadcasts-empty')
  const list = document.getElementById('broadcasts-items')

  try {
    const res = await api('/admin/notifs')
    allBroadcasts = toList(res, 'broadcasts', 'notifs')
    loading.style.display = 'none'

    if (allBroadcasts.length === 0) {
      empty.style.display = 'block'
      list.innerHTML = ''
      return
    }

    empty.style.display = 'none'

    list.innerHTML = allBroadcasts.map((b) => {
      const readCount = b.readBy ? b.readBy.length : 0
      const totalRecipients = b.recipientIds ? b.recipientIds.length : (b.totalRecipients || 1)
      const readPct = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0

      const pillClass = b.type === 'Peringatan' ? 'pill-red' : b.type === 'Pesan' ? 'pill-blue' : 'pill-gray'

      return `
        <div class="broadcast-card">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="pill ${pillClass}">${b.type}</span>
              <span style="font-size: 0.75rem; color: var(--c-ink-2);">${b.audience || 'Semua'}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--c-ink-2);">${b.at ? b.at.slice(0, 16).replace('T', ' ') : ''}</span>
          </div>

          <h3 style="font-size: 1rem; font-weight: 600; color: var(--c-ink); margin: 0;">${b.title}</h3>
          <p style="font-size: 0.875rem; color: var(--c-ink-2); line-height: 1.45; margin: 0;">${b.message}</p>

          <!-- Read Analytics Progress -->
          <div style="margin-top: 0.375rem; padding-top: 0.625rem; border-top: 1px dashed var(--c-border); display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;">
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--c-ink-2); margin-bottom: 0.25rem;">
                <span>Dibaca oleh ${readCount} dari ${totalRecipients} penerima</span>
                <span>${readPct}%</span>
              </div>
              <div style="height: 5px; background: var(--c-surface-muted); border-radius: var(--radius-full); overflow: hidden;">
                <div style="height: 100%; width: ${readPct}%; background: var(--c-primary); border-radius: var(--radius-full);"></div>
              </div>
            </div>

            ${b.canDelete ? `
              <button type="button" class="btn btn-ghost btn-sm" data-delete-id="${b.id}" style="color: var(--c-danger); padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                Hapus
              </button>
            ` : ''}
          </div>
        </div>
      `
    }).join('')

    list.querySelectorAll('[data-delete-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-id')
        if (!confirm('Yakin ingin menghapus siaran notifikasi ini? Notifikasi akan dihapus dari seluruh penerima.')) return

        try {
          await api(`/admin/notifs/${id}`, { method: 'DELETE' })
          showToast('Notifikasi berhasil dihapus', 'success')
          await loadBroadcasts()
        } catch (err) {
          showToast(err.message || 'Gagal menghapus notifikasi', 'danger')
        }
      })
    })
  } catch (err) {
    loading.innerHTML = `<p style="color: var(--c-danger);">${err.message || 'Gagal memuat riwayat.'}</p>`
  }
}
