/**
 * Pinjam.in - Admin Activity Screen Controller
 * 1:1 match with React AdminActivity.tsx
 */

import { api, showToast, toList } from '../core/api.js'
import { Auth } from '../core/auth.js'

export const ACTION_LABEL = {
  seed: 'Seed data',
  login: 'Masuk',
  login_gagal: 'Gagal masuk',
  logout: 'Keluar',
  profil_diubah: 'Profil diubah',
  password_diubah: 'Password diubah',
  akun_dibuat: 'Akun dibuat',
  akun_diubah: 'Akun diubah',
  password_direset: 'Password direset',
  akun_dihapus: 'Akun dihapus',
  foto_diunggah: 'Foto diunggah',
  booking_dibuat: 'Booking dibuat',
  pengembalian: 'Pengembalian',
  barang_ditambah: 'Barang ditambah',
  barang_diubah: 'Barang diubah',
  barang_dihapus: 'Barang dihapus',
  kategori_diubah: 'Kategori diubah',
  aturan_diubah: 'Aturan diubah',
  perpanjangan_diminta: 'Perpanjangan diminta',
  perpanjangan_disetujui: 'Perpanjangan disetujui',
  perpanjangan_ditolak: 'Perpanjangan ditolak',
  notifikasi_global: 'Notifikasi global',
  notifikasi_dihapus: 'Notifikasi dihapus',
  tiket_dibuat: 'Tiket dibuat',
  tiket_dibalas: 'Tiket dibalas',
  tiket_ditutup: 'Tiket ditutup',
  tiket_dibuka: 'Tiket dibuka',
  tiket_dihapus: 'Tiket dihapus',
}

function actionLabel(a) {
  if (ACTION_LABEL[a]) return ACTION_LABEL[a]
  if (a.startsWith('status_')) return `Status: ${a.slice(7)}`
  return a
}

function getTone(a) {
  if (a === 'login_gagal') return 'pill-red'
  if (a === 'login' || a === 'logout') return 'pill-blue'
  if (a.startsWith('barang') || a.startsWith('kategori') || a.startsWith('aturan')) return 'pill-orange'
  if (a.startsWith('akun') || a === 'password_direset' || a === 'notifikasi_global' || a === 'notifikasi_dihapus' || a === 'foto_diunggah') return 'pill-green'
  if (a === 'tiket_dihapus' || a === 'akun_dihapus') return 'pill-red'
  if (a.startsWith('tiket')) return 'pill-blue'
  return 'pill-gray'
}

const PAGE_SIZE = 10
let currentPage = 1
let allRows = []
let allUsers = []

document.addEventListener('DOMContentLoaded', async () => {
  const admin = Auth.requireAuth({ roles: ['Admin'] })
  if (!admin) return

  Auth.renderShell('admin-activity', admin)

  document.getElementById('refresh-activity-btn')?.addEventListener('click', loadActivity)

  // Inputs
  const qInput = document.getElementById('filter-q')
  const userInput = document.getElementById('filter-user')
  const actionInput = document.getElementById('filter-action')
  const fromInput = document.getElementById('filter-from')
  const toInput = document.getElementById('filter-to')

  const onFilterChange = () => {
    currentPage = 1
    renderActivityTable()
  }

  qInput?.addEventListener('input', onFilterChange)
  userInput?.addEventListener('change', onFilterChange)
  actionInput?.addEventListener('change', onFilterChange)
  fromInput?.addEventListener('change', onFilterChange)
  toInput?.addEventListener('change', onFilterChange)

  document.getElementById('clear-filters-btn')?.addEventListener('click', () => {
    qInput.value = ''
    userInput.value = 'semua'
    actionInput.value = 'semua'
    fromInput.value = ''
    toInput.value = ''
    currentPage = 1
    renderActivityTable()
  })

  await loadActivity()
})

async function loadActivity() {
  const tbody = document.getElementById('activity-table-body')
  tbody.innerHTML = `
    <tr>
      <td colspan="4" style="text-align: center; padding: 3rem;">
        <div class="spinner" style="margin: 0 auto 0.5rem auto;"></div>
        <p style="color: var(--c-ink-2); font-size: 0.875rem;">Memuat log aktivitas…</p>
      </td>
    </tr>
  `

  try {
    const [actRes, stateRes] = await Promise.all([
      api('/admin/activity'),
      api('/state').catch(() => ({})),
    ])

    allRows = toList(actRes, 'activity', 'logs')
    allUsers = toList(stateRes && stateRes.users)

    populateDropdowns()
    renderActivityTable()
  } catch (err) {
    showToast(err.message || 'Gagal memuat log aktivitas', 'danger')
  }
}

function populateDropdowns() {
  const userSelect = document.getElementById('filter-user')
  const actionSelect = document.getElementById('filter-action')

  // Users dropdown
  userSelect.innerHTML = '<option value="semua">Semua Pengguna</option>' + allUsers.map((u) => {
    return `<option value="${u.id}">${u.nama} (${u.role})</option>`
  }).join('')

  // Action types dropdown
  const actionSet = new Set(allRows.map((r) => r.action))
  actionSelect.innerHTML = '<option value="semua">Semua Jenis</option>' + Array.from(actionSet).map((a) => {
    return `<option value="${a}">${actionLabel(a)}</option>`
  }).join('')
}

function renderActivityTable() {
  const tbody = document.getElementById('activity-table-body')
  const summaryBox = document.getElementById('filter-active-summary')
  const countText = document.getElementById('filtered-count-text')
  const paginationEl = document.getElementById('activity-pagination')

  const q = (document.getElementById('filter-q').value || '').toLowerCase().trim()
  const who = document.getElementById('filter-user').value
  const kind = document.getElementById('filter-action').value
  const from = document.getElementById('filter-from').value
  const to = document.getElementById('filter-to').value

  const isFiltered = q || who !== 'semua' || kind !== 'semua' || from || to
  summaryBox.style.display = isFiltered ? 'flex' : 'none'

  const filtered = allRows.filter((r) => {
    if (who !== 'semua' && r.userId !== who) return false
    if (kind !== 'semua' && r.action !== kind) return false
    const d = (r.at || '').slice(0, 10)
    if (from && d < from) return false
    if (to && d > to) return false
    if (q) {
      const matchActor = (r.actor || '').toLowerCase().includes(q)
      const matchLabel = actionLabel(r.action || '').toLowerCase().includes(q)
      const matchDetail = (r.detail || '').toLowerCase().includes(q)
      const matchTarget = (r.target || '').toLowerCase().includes(q)
      return matchActor || matchLabel || matchDetail || matchTarget
    }
    return true
  })

  countText.textContent = `${filtered.length} kejadian ditemukan`

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 3rem; color: var(--c-ink-2);">
          Tidak ada aktivitas yang sesuai dengan filter.
        </td>
      </tr>
    `
    paginationEl.innerHTML = ''
    return
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  if (currentPage > totalPages) currentPage = totalPages || 1

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pagedRows = filtered.slice(startIdx, startIdx + PAGE_SIZE)

  tbody.innerHTML = pagedRows.map((r) => {
    const userObj = allUsers.find((u) => u.id === r.userId)
    const actorName = userObj ? userObj.nama : (r.actor || 'Sistem')
    const actorRole = userObj ? userObj.role : ''
    const pillClass = getTone(r.action)

    return `
      <tr>
        <td style="font-size: 0.8125rem; color: var(--c-ink-2); white-space: nowrap;">
          <div style="font-weight: 600; color: var(--c-ink);">${r.at ? r.at.slice(0, 10) : ''}</div>
          <div>${r.at ? r.at.slice(11, 19) : ''}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: var(--c-ink);">${actorName}</div>
          ${actorRole ? `<div style="font-size: 0.75rem; color: var(--c-ink-2);">${actorRole}</div>` : ''}
        </td>
        <td>
          <span class="pill ${pillClass}">${actionLabel(r.action)}</span>
        </td>
        <td style="font-size: 0.875rem; color: var(--c-ink);">
          <div>${r.detail || '—'}</div>
          ${r.target ? `<div style="font-size: 0.75rem; color: var(--c-ink-2); margin-top: 0.25rem;">Target: ${r.target}</div>` : ''}
        </td>
      </tr>
    `
  }).join('')

  // Render pagination
  if (totalPages > 1) {
    paginationEl.innerHTML = `
      <p style="font-size: 0.8125rem; color: var(--c-ink-2);">
        Menampilkan ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filtered.length)} dari ${filtered.length} kejadian
      </p>
      <div style="display: flex; gap: 0.5rem;">
        <button type="button" class="btn btn-secondary btn-sm" id="prev-act-page" ${currentPage === 1 ? 'disabled' : ''}>
          Sebelumnya
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="next-act-page" ${currentPage === totalPages ? 'disabled' : ''}>
          Berikutnya
        </button>
      </div>
    `

    document.getElementById('prev-act-page')?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--
        renderActivityTable()
      }
    })
    document.getElementById('next-act-page')?.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++
        renderActivityTable()
      }
    })
  } else {
    paginationEl.innerHTML = ''
  }
}
