/**
 * Pinjam.in - Loan Queue & Approvals Controller
 * Handles booking approvals, rejections, extension decisions, and pickup handovers.
 */

import { api, showToast, TODAY, addDays, diffDays, fmtDate, fmtRange } from './api.js'
import { Auth } from './auth.js'
import { renderIcon } from './icons.js'

let currentUser = null
let currentMode = 'dosen' // 'dosen' | 'admin'
let activeTab = 'Menunggu'
let searchQuery = ''
let selectedLoan = null

let state = {
  items: [],
  users: [],
  loans: [],
}

const TABS = {
  dosen: ['Menunggu', 'Disetujui', 'Ditolak'],
  admin: ['Menunggu', 'Disetujui', 'Dipinjam', 'Terlambat', 'Semua'],
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth({ roles: ['Dosen', 'Admin'] })
  if (!currentUser) return

  // Set default mode based on user's actual role
  currentMode = currentUser.role === 'Admin' ? 'admin' : 'dosen'
  Auth.renderShell('queue', currentUser)

  updateModeUI()

  // Mode switcher listeners
  document.querySelectorAll('#role-mode-segmented .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentMode = btn.dataset.mode
      document.querySelectorAll('#role-mode-segmented .segmented-btn').forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      activeTab = 'Menunggu'
      updateModeUI()
      renderTabs()
      renderQueueTable()
    })
  })

  // Search input
  document.getElementById('queue-search').addEventListener('input', (e) => {
    searchQuery = e.target.value
    renderQueueTable()
  })

  // Close modals
  document.getElementById('close-queue-mobile-btn').addEventListener('click', () => {
    document.getElementById('queue-mobile-backdrop').style.display = 'none'
  })
  document.getElementById('queue-mobile-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'queue-mobile-backdrop') {
      document.getElementById('queue-mobile-backdrop').style.display = 'none'
    }
  })

  // Modal actions
  document.getElementById('close-approve-btn').addEventListener('click', closeApproveDialog)
  document.getElementById('abort-approve-btn').addEventListener('click', closeApproveDialog)
  document.getElementById('confirm-approve-btn').addEventListener('click', executeApprove)

  document.getElementById('close-reject-btn').addEventListener('click', closeRejectDialog)
  document.getElementById('abort-reject-btn').addEventListener('click', closeRejectDialog)
  document.getElementById('confirm-reject-btn').addEventListener('click', executeReject)

  document.getElementById('close-pickup-btn').addEventListener('click', closePickupDialog)
  document.getElementById('abort-pickup-btn').addEventListener('click', closePickupDialog)
  document.getElementById('confirm-pickup-btn').addEventListener('click', executePickup)

  await loadData()
})

function updateModeUI() {
  const title = document.getElementById('queue-title')
  const subtitle = document.getElementById('queue-subtitle')
  if (currentMode === 'dosen') {
    title.textContent = 'Persetujuan'
    subtitle.textContent = 'Tinjau booking yang menunggu persetujuan. Satu persetujuan sudah cukup.'
  } else {
    title.textContent = 'Kelola Pengajuan'
    subtitle.textContent = 'Setujui, tolak, dan konfirmasi penyerahan barang peminjaman.'
  }
}

async function loadData() {
  try {
    const data = await api('/state')
    state.items = data.items || []
    state.users = data.users || []
    state.loans = data.loans || []

    renderExtensionsBanner()
    renderTabs()
    renderQueueTable()
  } catch (err) {
    showToast('Gagal memuat antrean: ' + err.message, 'danger')
  }
}

function getUser(id) {
  return state.users.find((u) => u.id === id) || { nama: 'Pengguna', role: 'Mahasiswa' }
}

function getItemNames(loan) {
  return loan.items.map((i) => {
    const it = state.items.find((x) => x.id === i.itemId)
    return it ? `${it.nama} (×${i.qty})` : `Barang (×${i.qty})`
  }).join(', ')
}

function getStatusBadge(status) {
  const map = {
    Menunggu: 'badge-menunggu',
    Disetujui: 'badge-disetujui',
    Dipinjam: 'badge-dipinjam',
    Dikembalikan: 'badge-dikembalikan',
    Terlambat: 'badge-terlambat',
    Ditolak: 'badge-ditolak',
    Dibatalkan: 'badge-dibatalkan',
  }
  return `<span class="badge ${map[status] || 'badge-dibatalkan'}"><span class="badge-dot"></span>${status}</span>`
}

// -----------------------------------------------------------------------------
// Extensions Banner
// -----------------------------------------------------------------------------
function renderExtensionsBanner() {
  const banner = document.getElementById('extensions-banner')
  const list = document.getElementById('ext-items-list')
  const badge = document.getElementById('ext-count-badge')

  const pendingExts = state.loans.filter((l) => l.extension?.state === 'Menunggu')
  if (pendingExts.length === 0) {
    banner.style.display = 'none'
    return
  }

  banner.style.display = 'block'
  badge.textContent = pendingExts.length

  list.innerHTML = pendingExts.map((l) => {
    const u = getUser(l.userId)
    const newEnd = addDays(l.end, l.extension.days)

    return `
      <div class="ext-item-row">
        <div style="flex: 1; min-width: 240px;">
          <p style="font-size: 0.875rem; font-weight: 600;">${u.nama} · ${getItemNames(l)}</p>
          <p style="font-size: 0.8125rem; color: var(--c-ink-2);">
            ${l.id} · +${l.extension.days} hari → <strong>${fmtDate(newEnd)}</strong> · "${l.extension.reason}"
          </p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button type="button" class="btn btn-secondary btn-sm" style="color: var(--c-danger);" onclick="window.decideExtension('${l.id}', false)">
            Tolak
          </button>
          <button type="button" class="btn btn-success btn-sm" onclick="window.decideExtension('${l.id}', true)">
            Setujui
          </button>
        </div>
      </div>
    `
  }).join('')
}

window.decideExtension = async function (loanId, ok) {
  try {
    await api(`/loans/${loanId}/extension/decide`, { body: { ok } })
    showToast(ok ? 'Perpanjangan disetujui' : 'Perpanjangan ditolak', ok ? 'success' : 'info')
    await loadData()
  } catch (err) {
    showToast(err.message, 'danger')
  }
}

// -----------------------------------------------------------------------------
// Tabs
// -----------------------------------------------------------------------------
function renderTabs() {
  const container = document.getElementById('queue-tabs')
  const tabs = TABS[currentMode]

  container.innerHTML = tabs.map((t) => {
    const count = getFilteredLoans(t, '').length
    return `
      <button type="button" class="segmented-btn ${activeTab === t ? 'is-active' : ''}" data-tab="${t}">
        ${t} <span class="segmented-count">${count}</span>
      </button>
    `
  }).join('')

  container.querySelectorAll('.segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab
      container.querySelectorAll('.segmented-btn').forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      renderQueueTable()
    })
  })
}

function getFilteredLoans(tab, query) {
  let list = currentMode === 'dosen' ? state.loans.filter((l) => TABS.dosen.includes(l.status)) : state.loans
  if (tab !== 'Semua') {
    list = list.filter((l) => l.status === tab)
  }
  if (query) {
    const q = query.toLowerCase()
    list = list.filter((l) => {
      const u = getUser(l.userId)
      return (
        l.id.toLowerCase().includes(q) ||
        getItemNames(l).toLowerCase().includes(q) ||
        u.nama.toLowerCase().includes(q)
      )
    })
  }
  return list
}

// -----------------------------------------------------------------------------
// Queue Table / Cards
// -----------------------------------------------------------------------------
function renderQueueTable() {
  const tbody = document.getElementById('queue-tbody')
  const empty = document.getElementById('queue-empty')
  const tableWrap = document.getElementById('queue-table-wrap')
  const sidePanel = document.getElementById('queue-side-panel')

  const list = getFilteredLoans(activeTab, searchQuery)

  if (list.length === 0) {
    tbody.innerHTML = ''
    tableWrap.style.display = 'none'
    empty.style.display = 'flex'
    document.getElementById('queue-empty-desc').textContent =
      activeTab === 'Menunggu' ? 'Semua pengajuan peminjaman sudah diproses.' : `Belum ada peminjaman berstatus ${activeTab}.`
    sidePanel.style.display = 'none'
    return
  }

  empty.style.display = 'none'
  tableWrap.style.display = 'block'

  if (!selectedLoan || !list.some((l) => l.id === selectedLoan.id)) {
    selectedLoan = list[0]
  }

  tbody.innerHTML = list.map((l) => {
    const u = getUser(l.userId)
    const isSelected = selectedLoan && selectedLoan.id === l.id

    return `
      <tr class="is-clickable ${isSelected ? 'is-selected' : ''}" onclick="window.selectQueueLoan('${l.id}')">
        <td>
          <div style="display: flex; align-items: center; gap: 0.625rem;">
            <div class="avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">
              ${u.foto ? `<img src="${u.foto}">` : u.nama[0]}
            </div>
            <div>
              <p style="font-weight: 600; white-space: nowrap;">${u.nama}</p>
              <p style="font-size: 0.75rem; color: var(--c-ink-2);">${l.id} · ${u.role}</p>
            </div>
          </div>
        </td>
        <td>
          <p style="font-weight: 600; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getItemNames(l)}</p>
          <p style="font-size: 0.75rem; color: var(--c-ink-2); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">“${l.keperluan}”</p>
        </td>
        <td style="white-space: nowrap;">${fmtRange(l.start, l.end)}</td>
        <td>${getStatusBadge(l.status)}</td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: flex-end; gap: 0.375rem;">
            ${renderRowActions(l)}
          </div>
        </td>
      </tr>
    `
  }).join('')

  if (window.innerWidth >= 1280 && selectedLoan) {
    renderSidePanel(selectedLoan)
  }
}

function renderRowActions(l) {
  if (l.status === 'Menunggu') {
    return `
      <button type="button" class="btn btn-secondary btn-sm" style="color: var(--c-danger);" onclick="window.promptReject('${l.id}')">Tolak</button>
      <button type="button" class="btn btn-success btn-sm" onclick="window.promptApprove('${l.id}')">Setujui</button>
    `
  }
  if (currentMode === 'admin' && l.status === 'Disetujui') {
    return `
      <button type="button" class="btn btn-primary btn-sm" onclick="window.promptPickup('${l.id}')">Ambil</button>
    `
  }
  return '<span style="font-size: 0.75rem; color: var(--c-ink-2);">-</span>'
}

window.selectQueueLoan = function (loanId) {
  selectedLoan = state.loans.find((l) => l.id === loanId)
  if (!selectedLoan) return

  renderQueueTable()

  if (window.innerWidth >= 1280) {
    renderSidePanel(selectedLoan)
  } else {
    renderMobileModal(selectedLoan)
  }
}

function renderSidePanel(loan) {
  const panel = document.getElementById('queue-side-panel')
  panel.style.display = 'flex'
  document.getElementById('queue-panel-badge').innerHTML = getStatusBadge(loan.status)
  document.getElementById('queue-panel-body').innerHTML = renderLoanDetailHTML(loan)
  document.getElementById('queue-panel-footer').innerHTML = renderRowActions(loan)
}

function renderMobileModal(loan) {
  const backdrop = document.getElementById('queue-mobile-backdrop')
  document.getElementById('queue-mobile-body').innerHTML = renderLoanDetailHTML(loan)
  document.getElementById('queue-mobile-footer').innerHTML = renderRowActions(loan)
  backdrop.style.display = 'flex'
}

function renderLoanDetailHTML(l) {
  const u = getUser(l.userId)
  return `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div class="card" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--c-surface-muted);">
        <div class="avatar">${u.nama[0]}</div>
        <div>
          <p style="font-weight: 600; font-size: 0.9375rem;">${u.nama}</p>
          <p style="font-size: 0.75rem; color: var(--c-ink-2);">${u.role} · ${u.nim_nip || '-'}</p>
        </div>
      </div>

      <div>
        <p style="font-size: 0.8125rem; font-weight: 600; color: var(--c-ink-2); margin-bottom: 0.5rem;">Barang yang Diajukan</p>
        <div style="display: flex; flex-direction: column; gap: 0.375rem;">
          ${l.items.map((i) => {
            const it = state.items.find((x) => x.id === i.itemId)
            return `
              <div class="glass card" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem;">
                <span style="font-weight: 600; font-size: 0.875rem; flex: 1;">${it ? it.nama : 'Barang'}</span>
                <span style="font-weight: 700; font-size: 0.875rem;">×${i.qty} unit</span>
              </div>
            `
          }).join('')}
        </div>
      </div>

      <dl style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.8125rem;">
        <div><dt style="color: var(--c-ink-2);">Tanggal Pinjam</dt><dd style="font-weight: 600;">${fmtDate(l.start)}</dd></div>
        <div><dt style="color: var(--c-ink-2);">Tanggal Kembali</dt><dd style="font-weight: 600;">${fmtDate(l.end)}</dd></div>
        <div style="grid-column: span 2;"><dt style="color: var(--c-ink-2);">Keperluan</dt><dd>${l.keperluan}</dd></div>
      </dl>
    </div>
  `
}

// -----------------------------------------------------------------------------
// Action Prompts & Modals
// -----------------------------------------------------------------------------
window.promptApprove = function (loanId) {
  selectedLoan = state.loans.find((l) => l.id === loanId)
  if (!selectedLoan) return
  const u = getUser(selectedLoan.userId)
  document.getElementById('approve-loan-code').textContent = selectedLoan.id
  document.getElementById('approve-borrower-name').textContent = u.nama
  document.getElementById('approve-dialog-backdrop').style.display = 'flex'
}

function closeApproveDialog() {
  document.getElementById('approve-dialog-backdrop').style.display = 'none'
}

async function executeApprove() {
  if (!selectedLoan) return
  const btn = document.getElementById('confirm-approve-btn')
  btn.disabled = true

  try {
    await api(`/loans/${selectedLoan.id}/status`, { body: { status: 'Disetujui' } })
    showToast(`${selectedLoan.id} berhasil disetujui`, 'success')
    closeApproveDialog()
    document.getElementById('queue-mobile-backdrop').style.display = 'none'
    await loadData()
  } catch (err) {
    showToast(err.message, 'danger')
  } finally {
    btn.disabled = false
  }
}

window.promptReject = function (loanId) {
  selectedLoan = state.loans.find((l) => l.id === loanId)
  if (!selectedLoan) return
  document.getElementById('reject-loan-code').textContent = selectedLoan.id
  document.getElementById('reject-note').value = ''
  document.getElementById('reject-dialog-backdrop').style.display = 'flex'
}

function closeRejectDialog() {
  document.getElementById('reject-dialog-backdrop').style.display = 'none'
}

async function executeReject() {
  if (!selectedLoan) return
  const note = document.getElementById('reject-note').value.trim()
  const btn = document.getElementById('confirm-reject-btn')
  btn.disabled = true

  try {
    await api(`/loans/${selectedLoan.id}/status`, {
      body: { status: 'Ditolak', note: note || undefined },
    })
    showToast(`${selectedLoan.id} ditolak`, 'info')
    closeRejectDialog()
    document.getElementById('queue-mobile-backdrop').style.display = 'none'
    await loadData()
  } catch (err) {
    showToast(err.message, 'danger')
  } finally {
    btn.disabled = false
  }
}

window.promptPickup = function (loanId) {
  selectedLoan = state.loans.find((l) => l.id === loanId)
  if (!selectedLoan) return
  const u = getUser(selectedLoan.userId)
  document.getElementById('pickup-borrower-name').textContent = u.nama
  document.getElementById('pickup-dialog-backdrop').style.display = 'flex'
}

function closePickupDialog() {
  document.getElementById('pickup-dialog-backdrop').style.display = 'none'
}

async function executePickup() {
  if (!selectedLoan) return
  const btn = document.getElementById('confirm-pickup-btn')
  btn.disabled = true

  try {
    await api(`/loans/${selectedLoan.id}/status`, { body: { status: 'Dipinjam' } })
    showToast('Pengambilan barang dikonfirmasi', 'success')
    closePickupDialog()
    document.getElementById('queue-mobile-backdrop').style.display = 'none'
    await loadData()
  } catch (err) {
    showToast(err.message, 'danger')
  } finally {
    btn.disabled = false
  }
}
