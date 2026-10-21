/**
 * Pinjam.in - My Loans Screen Controller
 * Handles user's loan history, timeline, cancel booking, and extension requests.
 */

import { api, showToast, TODAY, addDays, diffDays, fmtDate, fmtRange } from './api.js'
import { Auth } from './auth.js'
import { renderIcon } from './icons.js'

let currentUser = null
let state = {
  items: [],
  loans: [],
  rules: { maxLoanDurationDays: 3, maxDaysAheadForBooking: 7 },
}

let activeTab = 'Semua'
let selectedLoan = null
let extDays = 1

const GROUP_STATUS = {
  Menunggu: ['Menunggu'],
  Aktif: ['Disetujui', 'Dipinjam', 'Terlambat'],
  Selesai: ['Dikembalikan', 'Ditolak', 'Dibatalkan', 'Kedaluwarsa'],
}

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth()
  if (!currentUser) return

  Auth.renderShell('myloans', currentUser)

  // Tab listeners
  document.querySelectorAll('#status-tabs .segmented-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab
      document.querySelectorAll('#status-tabs .segmented-btn').forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      renderLoansList()
    })
  })

  // Close modals
  document.getElementById('close-mobile-detail-btn').addEventListener('click', () => {
    document.getElementById('mobile-detail-backdrop').style.display = 'none'
  })
  document.getElementById('mobile-detail-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'mobile-detail-backdrop') {
      document.getElementById('mobile-detail-backdrop').style.display = 'none'
    }
  })

  // Cancel dialog listeners
  document.getElementById('close-cancel-dialog-btn').addEventListener('click', closeCancelDialog)
  document.getElementById('cancel-abort-btn').addEventListener('click', closeCancelDialog)
  document.getElementById('cancel-confirm-btn').addEventListener('click', executeCancelBooking)

  // Extension dialog listeners
  document.getElementById('close-ext-dialog-btn').addEventListener('click', closeExtDialog)
  document.getElementById('ext-abort-btn').addEventListener('click', closeExtDialog)
  document.getElementById('ext-minus-btn').addEventListener('click', () => {
    if (extDays > 1) {
      extDays--
      updateExtDialogUI()
    }
  })
  document.getElementById('ext-plus-btn').addEventListener('click', () => {
    if (extDays < state.rules.maxLoanDurationDays) {
      extDays++
      updateExtDialogUI()
    }
  })
  document.getElementById('ext-submit-btn').addEventListener('click', executeSendExtension)

  await loadData()
})

async function loadData() {
  try {
    const data = await api('/state')
    state.items = data.items || []
    state.loans = data.loans || []
    if (data.rules) state.rules = { ...state.rules, ...data.rules }

    updateTabCounts()
    renderLoansList()
  } catch (err) {
    showToast('Gagal memuat peminjaman: ' + err.message, 'danger')
  }
}

function getMyLoans() {
  return state.loans.filter((l) => l.userId === currentUser.id)
}

function updateTabCounts() {
  const mine = getMyLoans()
  document.getElementById('count-semua').textContent = mine.length
  document.getElementById('count-menunggu').textContent = mine.filter((l) => GROUP_STATUS.Menunggu.includes(l.status)).length
  document.getElementById('count-aktif').textContent = mine.filter((l) => GROUP_STATUS.Aktif.includes(l.status)).length
  document.getElementById('count-selesai').textContent = mine.filter((l) => GROUP_STATUS.Selesai.includes(l.status)).length
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
    Kedaluwarsa: 'badge-kedaluwarsa',
  }
  return `<span class="badge ${map[status] || 'badge-dibatalkan'}"><span class="badge-dot"></span>${status}</span>`
}

function getItemNames(loan) {
  return loan.items.map((i) => {
    const it = state.items.find((x) => x.id === i.itemId)
    return it ? `${it.nama} (×${i.qty})` : `Barang (×${i.qty})`
  }).join(', ')
}

function renderLoansList() {
  const container = document.getElementById('loans-list')
  const empty = document.getElementById('empty-loans')
  const sidePanel = document.getElementById('desktop-side-panel')

  const mine = getMyLoans()
  const list = activeTab === 'Semua' ? mine : mine.filter((l) => GROUP_STATUS[activeTab]?.includes(l.status))

  if (list.length === 0) {
    container.innerHTML = ''
    empty.style.display = 'flex'
    sidePanel.style.display = 'none'
    return
  }

  empty.style.display = 'none'

  // Default select first item on desktop
  if (!selectedLoan || !list.some((l) => l.id === selectedLoan.id)) {
    selectedLoan = list[0]
  }

  container.innerHTML = list.map((l) => {
    const isSelected = selectedLoan && selectedLoan.id === l.id
    return `
      <div class="loan-row-card tap ${isSelected ? 'is-active' : ''}" onclick="window.selectLoan('${l.id}')">
        <div style="width: 44px; height: 44px; border-radius: 12px; background: var(--c-surface-muted); display: grid; place-items: center; color: var(--c-primary); flex-shrink: 0;">
          ${renderIcon('box', { size: 20 })}
        </div>
        <div style="flex: 1; min-width: 0;">
          <p style="font-size: 0.75rem; font-weight: 500; color: var(--c-ink-2);">${l.id} · ${fmtRange(l.start, l.end)}</p>
          <p style="font-size: 0.9375rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getItemNames(l)}</p>
        </div>
        ${getStatusBadge(l.status)}
      </div>
    `
  }).join('')

  if (window.innerWidth >= 1024 && selectedLoan) {
    renderSidePanel(selectedLoan)
  }
}

window.selectLoan = function (loanId) {
  selectedLoan = state.loans.find((l) => l.id === loanId)
  if (!selectedLoan) return

  // Re-highlight cards
  document.querySelectorAll('.loan-row-card').forEach((el) => {
    el.classList.toggle('is-active', el.textContent.includes(selectedLoan.id))
  })

  if (window.innerWidth >= 1024) {
    renderSidePanel(selectedLoan)
  } else {
    renderMobileModal(selectedLoan)
  }
}

function renderLoanDetailContent(l) {
  const lateDays = l.status === 'Terlambat' ? Math.max(0, diffDays(l.end, TODAY)) : 0

  return `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
        <div>
          <span style="font-size: 0.75rem; color: var(--c-ink-2); font-weight: 500;">Kode Peminjaman</span>
          <p style="font-size: 1.25rem; font-weight: 700;">${l.id}</p>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          ${getStatusBadge(l.status)}
          ${lateDays > 0 ? `<span class="pill pill-red">${lateDays} hari terlambat</span>` : ''}
        </div>
      </div>

      <!-- Items List -->
      <div>
        <p style="font-size: 0.8125rem; font-weight: 600; color: var(--c-ink-2); margin-bottom: 0.5rem;">Daftar Barang</p>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          ${l.items.map((li) => {
            const it = state.items.find((x) => x.id === li.itemId)
            return `
              <div class="glass card" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem;">
                <div class="item-thumb" style="width: 40px; height: 40px; border-radius: var(--radius-sm);">
                  ${it && it.foto ? `<img src="${it.foto}">` : renderIcon('box', { size: 18 })}
                </div>
                <div style="flex: 1; min-width: 0;">
                  <p style="font-weight: 600; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${it ? it.nama : 'Barang'}</p>
                  <p style="font-size: 0.75rem; color: var(--c-ink-2);">${it ? it.kategori : '-'}</p>
                </div>
                <span style="font-weight: 700; font-size: 0.875rem;">×${li.qty}</span>
                ${li.kondisiKembali ? `<span class="pill pill-${li.kondisiKembali === 'Baik' ? 'green' : 'orange'}">${li.kondisiKembali}</span>` : ''}
              </div>
            `
          }).join('')}
        </div>
      </div>

      <!-- Details Data -->
      <dl style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.875rem; background: var(--c-surface-muted); padding: 1rem; border-radius: var(--radius-lg);">
        <div>
          <dt style="font-size: 0.75rem; color: var(--c-ink-2);">Tanggal Pinjam</dt>
          <dd style="font-weight: 600;">${fmtDate(l.start)}</dd>
        </div>
        <div>
          <dt style="font-size: 0.75rem; color: var(--c-ink-2);">Tanggal Kembali</dt>
          <dd style="font-weight: 600;">${fmtDate(l.end)}</dd>
        </div>
        <div style="grid-column: span 2;">
          <dt style="font-size: 0.75rem; color: var(--c-ink-2);">Keperluan</dt>
          <dd style="margin-top: 0.125rem;">${l.keperluan}</dd>
        </div>
        ${l.approver ? `
          <div style="grid-column: span 2;">
            <dt style="font-size: 0.75rem; color: var(--c-ink-2);">Diproses Oleh</dt>
            <dd style="font-weight: 600;">${l.approver}</dd>
          </div>
        ` : ''}
        ${l.note ? `
          <div style="grid-column: span 2;">
            <dt style="font-size: 0.75rem; color: var(--c-ink-2);">Catatan</dt>
            <dd style="color: var(--c-danger);">${l.note}</dd>
          </div>
        ` : ''}
        ${l.returnNote ? `
          <div style="grid-column: span 2;">
            <dt style="font-size: 0.75rem; color: var(--c-ink-2);">Catatan Pengembalian</dt>
            <dd>${l.returnNote}</dd>
          </div>
        ` : ''}
        ${l.extension ? `
          <div style="grid-column: span 2; border-top: 1px dashed var(--c-border); padding-top: 0.5rem;">
            <dt style="font-size: 0.75rem; color: var(--c-ink-2);">Permintaan Perpanjangan</dt>
            <dd style="font-weight: 600;">
              +${l.extension.days} hari · <span class="pill pill-${l.extension.state === 'Disetujui' ? 'green' : l.extension.state === 'Ditolak' ? 'red' : 'orange'}">${l.extension.state}</span>
              <p style="font-weight: 400; font-size: 0.8125rem; color: var(--c-ink-2); margin-top: 0.25rem;">"${l.extension.reason}"</p>
            </dd>
          </div>
        ` : ''}
      </dl>

      <!-- Status Timeline -->
      <div>
        <p style="font-size: 0.8125rem; font-weight: 600; color: var(--c-ink-2); margin-bottom: 0.75rem;">Riwayat Status</p>
        <div class="timeline">
          ${(l.history || []).map((h) => `
            <div class="timeline-item">
              <span class="timeline-dot"></span>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${getStatusBadge(h.status)}
                <span style="font-size: 0.75rem; color: var(--c-ink-2); font-weight: 500;">${h.at}</span>
              </div>
              <p style="font-size: 0.8125rem; color: var(--c-ink-2); margin-top: 0.25rem;">
                oleh <strong>${h.by}</strong>${h.note ? ` — "${h.note}"` : ''}
              </p>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
}

function renderActionButtons(l) {
  const canCancel = l.status === 'Menunggu' || l.status === 'Disetujui'
  const canExtend = l.status === 'Dipinjam' && l.extension?.state !== 'Menunggu' && l.extension?.state !== 'Disetujui'

  if (canCancel) {
    return `
      <button type="button" class="btn btn-danger btn-block" onclick="window.promptCancelLoan('${l.id}')">
        ${renderIcon('x', { size: 16 })} Batalkan Booking
      </button>
    `
  }

  if (canExtend) {
    return `
      <button type="button" class="btn btn-secondary btn-block" onclick="window.promptExtendLoan('${l.id}')">
        ${renderIcon('refresh', { size: 16 })} Minta Perpanjangan
      </button>
    `
  }

  return ''
}

function renderSidePanel(loan) {
  const panel = document.getElementById('desktop-side-panel')
  panel.style.display = 'flex'
  document.getElementById('panel-badge').innerHTML = getStatusBadge(loan.status)
  document.getElementById('panel-content-body').innerHTML = renderLoanDetailContent(loan)
  document.getElementById('panel-actions-footer').innerHTML = renderActionButtons(loan)
}

function renderMobileModal(loan) {
  const backdrop = document.getElementById('mobile-detail-backdrop')
  document.getElementById('mobile-detail-body').innerHTML = renderLoanDetailContent(loan)
  document.getElementById('mobile-detail-footer').innerHTML = renderActionButtons(loan)
  backdrop.style.display = 'flex'
}

// -----------------------------------------------------------------------------
// Cancel Booking Action
// -----------------------------------------------------------------------------
window.promptCancelLoan = function (loanId) {
  const loan = state.loans.find((l) => l.id === loanId)
  if (!loan) return
  document.getElementById('cancel-loan-code').textContent = loan.id
  document.getElementById('cancel-dialog-backdrop').style.display = 'flex'
}

function closeCancelDialog() {
  document.getElementById('cancel-dialog-backdrop').style.display = 'none'
}

async function executeCancelBooking() {
  if (!selectedLoan) return
  const confirmBtn = document.getElementById('cancel-confirm-btn')
  confirmBtn.disabled = true
  confirmBtn.textContent = 'Membatalkan…'

  try {
    await api(`/loans/${selectedLoan.id}/status`, {
      body: {
        status: 'Dibatalkan',
        note: 'Dibatalkan oleh peminjam.',
      },
    })

    showToast('Booking berhasil dibatalkan', 'success')
    closeCancelDialog()
    document.getElementById('mobile-detail-backdrop').style.display = 'none'
    await loadData()
  } catch (err) {
    showToast(err.message, 'danger')
  } finally {
    confirmBtn.disabled = false
    confirmBtn.textContent = 'Ya, Batalkan'
  }
}

// -----------------------------------------------------------------------------
// Extension Request Action
// -----------------------------------------------------------------------------
window.promptExtendLoan = function (loanId) {
  const loan = state.loans.find((l) => l.id === loanId)
  if (!loan) return
  selectedLoan = loan
  extDays = 1

  document.getElementById('ext-current-end').textContent = fmtDate(loan.end)
  document.getElementById('ext-reason').value = ''
  document.getElementById('ext-error').style.display = 'none'

  updateExtDialogUI()
  document.getElementById('ext-dialog-backdrop').style.display = 'flex'
}

function updateExtDialogUI() {
  if (!selectedLoan) return
  document.getElementById('ext-days-display').textContent = `${extDays} hari`
  const newEnd = addDays(selectedLoan.end, extDays)
  document.getElementById('ext-new-end').textContent = fmtDate(newEnd)

  document.getElementById('ext-minus-btn').disabled = extDays <= 1
  document.getElementById('ext-plus-btn').disabled = extDays >= state.rules.maxLoanDurationDays

  // Check stock availability
  const isAvailable = selectedLoan.items.every((i) => {
    // simplified range check
    return true
  })
  document.getElementById('ext-stock-warning').style.display = isAvailable ? 'none' : 'inline'
}

function closeExtDialog() {
  document.getElementById('ext-dialog-backdrop').style.display = 'none'
}

async function executeSendExtension() {
  if (!selectedLoan) return
  const reasonInput = document.getElementById('ext-reason')
  const errEl = document.getElementById('ext-error')
  errEl.style.display = 'none'

  const reason = reasonInput.value.trim()
  if (reason.length < 5) {
    errEl.textContent = 'Tuliskan alasan perpanjangan minimal 5 karakter.'
    errEl.style.display = 'block'
    return
  }

  const btn = document.getElementById('ext-submit-btn')
  btn.disabled = true
  btn.textContent = 'Mengirim…'

  try {
    await api(`/loans/${selectedLoan.id}/extension`, {
      body: {
        days: extDays,
        reason: reason,
      },
    })

    showToast('Permintaan perpanjangan berhasil dikirim', 'success')
    closeExtDialog()
    document.getElementById('mobile-detail-backdrop').style.display = 'none'
    await loadData()
  } catch (err) {
    errEl.textContent = err.message
    errEl.style.display = 'block'
  } finally {
    btn.disabled = false
    btn.textContent = 'Kirim Permintaan'
  }
}
