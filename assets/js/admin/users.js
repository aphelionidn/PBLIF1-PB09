/**
 * Pinjam.in - Admin Users Screen Controller
 * 1:1 match with React AdminUsers.tsx
 */

import { api, isCampusEmail, showToast, toList } from '../core/api.js'
import { Auth } from '../core/auth.js'
import { renderIcon } from '../core/icons.js'

let allUsers = []
let currentRoleFilter = 'Semua'
let searchQuery = ''

const ONLINE_MS = 120000 // 2 minutes heartbeat
const isOnline = (u) => !!u.lastSeen && Date.now() - Date.parse(u.lastSeen) < ONLINE_MS

document.addEventListener('DOMContentLoaded', async () => {
  const admin = Auth.requireAuth({ roles: ['Admin'] })
  if (!admin) return

  Auth.renderShell('admin-users', admin)

  // Filters & Search
  document.getElementById('user-search-input')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim()
    renderUsersTable()
  })

  document.querySelectorAll('#role-filter-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#role-filter-chips .chip').forEach((c) => c.classList.remove('is-active'))
      chip.classList.add('is-active')
      currentRoleFilter = chip.getAttribute('data-role')
      renderUsersTable()
    })
  })

  // Drawer events
  document.getElementById('close-drawer-btn')?.addEventListener('click', () => {
    document.getElementById('user-detail-drawer').classList.remove('is-open')
  })

  // Add user button & modal
  const userModal = document.getElementById('user-form-modal')
  document.getElementById('add-user-btn')?.addEventListener('click', () => {
    document.getElementById('user-modal-title').textContent = 'Tambah Pengguna'
    document.getElementById('form-user-id').value = ''
    document.getElementById('form-user-name').value = ''
    document.getElementById('form-user-nim').value = ''
    document.getElementById('form-user-email').value = ''
    document.getElementById('form-user-role').value = 'Mahasiswa'
    document.getElementById('form-user-pw').value = ''
    document.getElementById('form-user-pw').required = true
    userModal.classList.add('is-open')
  })

  document.getElementById('close-user-modal-btn')?.addEventListener('click', () => userModal.classList.remove('is-open'))
  document.getElementById('cancel-user-modal-btn')?.addEventListener('click', () => userModal.classList.remove('is-open'))

  // Submit Add / Edit User Form
  document.getElementById('user-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const id = document.getElementById('form-user-id').value
    const nama = document.getElementById('form-user-name').value.trim()
    const nim_nip = document.getElementById('form-user-nim').value.trim()
    const email = document.getElementById('form-user-email').value.trim()
    const role = document.getElementById('form-user-role').value
    const password = document.getElementById('form-user-pw').value
    const btn = document.getElementById('save-user-btn')

    if (nama.length < 3) {
      showToast('Nama minimal 3 karakter.', 'danger')
      return
    }
    if (!/^[A-Za-z0-9]{5,20}$/.test(nim_nip)) {
      showToast('NIM/NIP harus 5–20 karakter huruf atau angka.', 'danger')
      return
    }
    if (!isCampusEmail(email)) {
      showToast('Gunakan email resmi polibatam.ac.id.', 'danger')
      return
    }
    if (!id && password.length < 6) {
      showToast('Password awal minimal 6 karakter.', 'danger')
      return
    }

    btn.disabled = true
    btn.textContent = 'Menyimpan…'

    try {
      if (id) {
        // Edit user
        await api(`/users/${id}`, {
          method: 'PUT',
          body: { nama, nim_nip, email, role },
        })
        if (password && password.length >= 6) {
          await api(`/admin/users/${id}/password`, {
            method: 'POST',
            body: { password },
          })
        }
        showToast('Pengguna berhasil diperbarui', 'success')
      } else {
        // Create user
        await api('/admin/users', {
          method: 'POST',
          body: { nama, nim_nip, email, role, password },
        })
        showToast('Akun pengguna berhasil dibuat', 'success')
      }
      userModal.classList.remove('is-open')
      await loadUsers()
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan pengguna', 'danger')
    } finally {
      btn.disabled = false
      btn.textContent = 'Simpan Pengguna'
    }
  })

  // Reset Password Modal & Form
  const resetModal = document.getElementById('reset-pw-modal')
  document.getElementById('close-reset-modal-btn')?.addEventListener('click', () => resetModal.classList.remove('is-open'))
  document.getElementById('cancel-reset-modal-btn')?.addEventListener('click', () => resetModal.classList.remove('is-open'))

  document.getElementById('reset-pw-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const userId = document.getElementById('reset-user-id').value
    const password = document.getElementById('reset-new-pw').value
    const btn = document.getElementById('submit-reset-btn')

    if (password.length < 6) {
      showToast('Password minimal 6 karakter.', 'danger')
      return
    }

    btn.disabled = true
    btn.textContent = 'Memproses…'

    try {
      await api(`/admin/users/${userId}/password`, {
        method: 'POST',
        body: { password },
      })
      showToast('Password pengguna berhasil direset', 'success')
      resetModal.classList.remove('is-open')
    } catch (err) {
      showToast(err.message || 'Gagal mereset password', 'danger')
    } finally {
      btn.disabled = false
      btn.textContent = 'Reset Password'
    }
  })

  await loadUsers()
})

async function loadUsers() {
  try {
    const state = await api('/state')
    allUsers = state.users || []
    renderUsersTable()
  } catch (err) {
    showToast(err.message || 'Gagal memuat pengguna', 'danger')
  }
}

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body')
  const subtitle = document.getElementById('users-subtitle')

  const activeCount = allUsers.filter((u) => u.aktif).length
  const onlineCount = allUsers.filter(isOnline).length
  subtitle.textContent = `${activeCount} aktif · ${onlineCount} online sekarang`

  const filtered = allUsers.filter((u) => {
    if (currentRoleFilter !== 'Semua' && u.role !== currentRoleFilter) return false
    if (searchQuery) {
      const matchName = (u.nama || '').toLowerCase().includes(searchQuery)
      const matchNim = (u.nim_nip || '').toLowerCase().includes(searchQuery)
      const matchEmail = (u.email || '').toLowerCase().includes(searchQuery)
      return matchName || matchNim || matchEmail
    }
    return true
  })

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--c-ink-2);">
          Tidak ada pengguna yang cocok dengan pencarian atau filter.
        </td>
      </tr>
    `
    return
  }

  tbody.innerHTML = filtered
    .map((u) => {
      const online = isOnline(u)
      const initials = (u.nama || 'U').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()

      return `
        <tr style="${u.aktif ? '' : 'opacity: 0.65;'}">
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="avatar" style="width: 32px; height: 32px; font-size: 0.8125rem;">
                ${u.foto ? `<img src="${u.foto}" alt="${u.nama}">` : initials}
              </div>
              <span style="font-weight: 600; color: var(--c-ink);">${u.nama}</span>
            </div>
          </td>
          <td style="font-family: var(--font-mono); font-size: 0.875rem;">${u.nim_nip}</td>
          <td style="font-size: 0.875rem;">${u.email}</td>
          <td><span class="pill pill-blue">${u.role}</span></td>
          <td>
            <div style="display: flex; flex-direction: column; gap: 0.25rem;">
              <span class="pill ${u.aktif ? 'pill-green' : 'pill-red'}" style="width: fit-content; font-size: 0.6875rem;">
                ${u.aktif ? 'Aktif' : 'Nonaktif'}
              </span>
              <span class="presence-badge">
                <span class="presence-dot ${online ? 'is-online' : ''}"></span>
                <span style="font-size: 0.75rem; color: var(--c-ink-2);">${online ? 'Online' : 'Offline'}</span>
              </span>
            </div>
          </td>
          <td style="font-size: 0.8125rem; color: var(--c-ink-2);">
            ${u.lastSeen ? u.lastSeen.slice(0, 16).replace('T', ' ') : '—'}
          </td>
          <td style="font-size: 0.875rem;">${u.kota || '—'}</td>
          <td>
            <div class="table-actions-cell">
              <button type="button" class="icon-btn icon-btn-sm" data-action="view" data-user-id="${u.id}" title="Detail & Log">
                ${renderIcon('eye', { size: 16 })}
              </button>
              <button type="button" class="icon-btn icon-btn-sm" data-action="edit" data-user-id="${u.id}" title="Edit Data">
                ${renderIcon('edit', { size: 16 })}
              </button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="reset" data-user-id="${u.id}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                Reset PW
              </button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="toggle" data-user-id="${u.id}" style="font-size: 0.75rem; padding: 0.25rem 0.5rem; color: ${u.aktif ? 'var(--c-danger)' : 'var(--c-success)'};">
                ${u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          </td>
        </tr>
      `
    })
    .join('')

  // Bind row action buttons
  tbody.querySelectorAll('[data-action="view"]').forEach((b) => {
    b.addEventListener('click', () => openUserDetail(b.getAttribute('data-user-id')))
  })
  tbody.querySelectorAll('[data-action="edit"]').forEach((b) => {
    b.addEventListener('click', () => openEditUser(b.getAttribute('data-user-id')))
  })
  tbody.querySelectorAll('[data-action="reset"]').forEach((b) => {
    b.addEventListener('click', () => openResetPw(b.getAttribute('data-user-id')))
  })
  tbody.querySelectorAll('[data-action="toggle"]').forEach((b) => {
    b.addEventListener('click', () => toggleUserStatus(b.getAttribute('data-user-id')))
  })
}

async function openUserDetail(userId) {
  const u = allUsers.find((x) => x.id === userId)
  if (!u) return

  const drawer = document.getElementById('user-detail-drawer')
  document.getElementById('drawer-name').textContent = u.nama
  document.getElementById('drawer-email-role').textContent = `${u.email} · ${u.role}`

  const initials = (u.nama || 'U').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  document.getElementById('drawer-avatar').innerHTML = u.foto ? `<img src="${u.foto}" alt="${u.nama}">` : initials

  const logsContainer = document.getElementById('drawer-logs')
  logsContainer.innerHTML = '<p style="font-size: 0.875rem; color: var(--c-ink-2);">Memuat riwayat…</p>'

  drawer.classList.add('is-open')

  try {
    const allActivity = await api('/admin/activity')
    const userLogs = toList(allActivity, 'activity', 'logs').filter((a) => a.userId === u.id).slice(0, 15)

    if (userLogs.length === 0) {
      logsContainer.innerHTML = '<p style="font-size: 0.875rem; color: var(--c-ink-2);">Belum ada riwayat aktivitas tercatat.</p>'
    } else {
      logsContainer.innerHTML = userLogs.map((log) => `
        <div style="padding: 0.625rem 0.75rem; background: var(--c-surface-muted); border-radius: var(--radius-md); font-size: 0.8125rem;">
          <div style="display: flex; justify-content: space-between; font-weight: 600; color: var(--c-ink);">
            <span>${log.action}</span>
            <span style="font-size: 0.75rem; color: var(--c-ink-2);">${log.at ? log.at.slice(0, 16).replace('T', ' ') : ''}</span>
          </div>
          <div style="color: var(--c-ink-2); margin-top: 0.25rem;">${log.detail || '—'}</div>
        </div>
      `).join('')
    }
  } catch {
    logsContainer.innerHTML = '<p style="font-size: 0.875rem; color: var(--c-ink-2);">Gagal memuat log aktivitas.</p>'
  }
}

function openEditUser(userId) {
  const u = allUsers.find((x) => x.id === userId)
  if (!u) return

  const modal = document.getElementById('user-form-modal')
  document.getElementById('user-modal-title').textContent = 'Edit Data Pengguna'
  document.getElementById('form-user-id').value = u.id
  document.getElementById('form-user-name').value = u.nama || ''
  document.getElementById('form-user-nim').value = u.nim_nip || ''
  document.getElementById('form-user-email').value = u.email || ''
  document.getElementById('form-user-role').value = u.role || 'Mahasiswa'
  document.getElementById('form-user-pw').value = ''
  document.getElementById('form-user-pw').required = false

  modal.classList.add('is-open')
}

function openResetPw(userId) {
  const u = allUsers.find((x) => x.id === userId)
  if (!u) return

  const modal = document.getElementById('reset-pw-modal')
  document.getElementById('reset-user-id').value = u.id
  document.getElementById('reset-new-pw').value = ''
  document.getElementById('reset-target-desc').textContent = `Masukkan password baru untuk ${u.nama} (${u.nim_nip}).`

  modal.classList.add('is-open')
}

async function toggleUserStatus(userId) {
  const u = allUsers.find((x) => x.id === userId)
  if (!u) return

  const action = u.aktif ? 'menonaktifkan' : 'mengaktifkan kembali'
  if (!confirm(`Yakin ingin ${action} akun ${u.nama}?`)) return

  try {
    await api(`/users/${u.id}`, {
      method: 'PUT',
      body: { aktif: !u.aktif },
    })
    u.aktif = !u.aktif
    renderUsersTable()
    showToast(`Akun ${u.nama} berhasil ${u.aktif ? 'diaktifkan' : 'dinonaktifkan'}`, 'success')
  } catch (err) {
    showToast(err.message || 'Gagal mengubah status akun', 'danger')
  }
}
