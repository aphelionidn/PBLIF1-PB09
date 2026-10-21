/**
 * Pinjam.in - Admin Returns Processing Controller
 * Handles physical inspection, condition checks, return notes, and status updates.
 */

import { api, showToast, TODAY, diffDays, fmtDate, fmtRange } from './api.js'
import { Auth } from './auth.js'
import { renderIcon } from './icons.js'

let currentUser = null
let state = {
  items: [],
  users: [],
  loans: [],
}

let selectedLoan = null
let itemConditions = {} // { [itemId]: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Hilang' }
const KONDISI = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang']

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth({ roles: ['Admin'] })
  if (!currentUser) return

  Auth.renderShell('admin-returns', currentUser)

  // Modal events
  document.getElementById('close-return-modal-btn').addEventListener('click', closeReturnModal)
  document.getElementById('abort-return-btn').addEventListener('click', closeReturnModal)
  document.getElementById('submit-return-btn').addEventListener('click', executeSubmitReturn)

  await loadData()
})

async function loadData() {
  try {
    const data = await api('/state')
    state.items = data.items || []
    state.users = data.users || []
    state.loans = data.loans || []

    renderReturnsTable()
  } catch (err) {
    showToast('Gagal memuat data pengembalian: ' + err.message, 'danger')
  }
}

function getUser(id) {
  return state.users.find((u) => u.id === id) || { nama: 'Peminjam', role: 'Mahasiswa' }
}

function getItemNames(loan) {
  return loan.items.map((i) => {
    const it = state.items.find((x) => x.id === i.itemId)
    return it ? `${it.nama} (×${i.qty})` : `Barang (×${i.qty})`
  }).join(', ')
}

function lateDays(l) {
  return Math.max(0, diffDays(l.end, TODAY))
}

function renderReturnsTable() {
  const tbody = document.getElementById('returns-tbody')
  const empty = document.getElementById('returns-empty')
  const subtitle = document.getElementById('returns-stat-subtitle')

  const activeLoans = state.loans
    .filter((l) => l.status === 'Dipinjam' || l.status === 'Terlambat')
    .sort((a, b) => (a.status === 'Terlambat' ? -1 : 1))

  subtitle.textContent = `${activeLoans.length} peminjaman sedang aktif dan belum dikembalikan`

  if (activeLoans.length === 0) {
    tbody.innerHTML = ''
    empty.style.display = 'flex'
    return
  }

  empty.style.display = 'none'

  tbody.innerHTML = activeLoans.map((l) => {
    const u = getUser(l.userId)
    const isLate = l.status === 'Terlambat'
    const daysLate = lateDays(l)

    const lateBadge = isLate
      ? `<span class="pill pill-red">Terlambat ${daysLate} hari</span>`
      : `<span class="pill pill-gray">Batas ${fmtDate(l.end)}</span>`

    const statusBadge = `<span class="badge ${isLate ? 'badge-terlambat' : 'badge-dipinjam'}"><span class="badge-dot"></span>${l.status}</span>`

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.625rem;">
            <div class="avatar" style="width: 34px; height: 34px; font-size: 0.8125rem;">
              ${u.foto ? `<img src="${u.foto}">` : u.nama[0]}
            </div>
            <div>
              <p style="font-weight: 600; white-space: nowrap;">${u.nama}</p>
              <p style="font-size: 0.75rem; color: var(--c-ink-2);">${l.id}</p>
            </div>
          </div>
        </td>
        <td style="font-weight: 500;">${getItemNames(l)}</td>
        <td style="white-space: nowrap;">${fmtRange(l.start, l.end)}</td>
        <td>${statusBadge}</td>
        <td>${lateBadge}</td>
        <td style="text-align: right;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="window.openReturnModal('${l.id}')">
            ${renderIcon('return', { size: 14 })}
            <span>Catat Pengembalian</span>
          </button>
        </td>
      </tr>
    `
  }).join('')
}

// -----------------------------------------------------------------------------
// Return Inspection Modal
// -----------------------------------------------------------------------------
window.openReturnModal = function (loanId) {
  selectedLoan = state.loans.find((l) => l.id === loanId)
  if (!selectedLoan) return

  const u = getUser(selectedLoan.userId)
  document.getElementById('ret-loan-code').textContent = selectedLoan.id
  document.getElementById('ret-borrower-name').textContent = u.nama

  const isLate = selectedLoan.status === 'Terlambat'
  const daysLate = lateDays(selectedLoan)
  document.getElementById('ret-late-status').innerHTML = isLate
    ? `<span class="pill pill-red">Terlambat ${daysLate} hari</span>`
    : `<span class="pill pill-gray">Batas ${fmtDate(selectedLoan.end)}</span>`

  // Initialize conditions for all items
  itemConditions = {}
  selectedLoan.items.forEach((i) => {
    const it = state.items.find((x) => x.id === i.itemId)
    itemConditions[i.itemId] = it?.kondisi || 'Baik'
  })

  document.getElementById('ret-note-input').value = ''
  document.getElementById('ret-note-error').style.display = 'none'

  renderReturnItemsInspection()
  document.getElementById('return-modal-backdrop').style.display = 'flex'
}

function renderReturnItemsInspection() {
  const container = document.getElementById('ret-items-list')

  container.innerHTML = selectedLoan.items.map((i) => {
    const it = state.items.find((x) => x.id === i.itemId)
    const selectedCond = itemConditions[i.itemId] || 'Baik'

    return `
      <div class="glass card" style="display: flex; flex-direction: column; gap: 0.75rem; padding: 0.875rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div class="item-thumb" style="width: 32px; height: 32px; border-radius: 6px;">
              ${it && it.foto ? `<img src="${it.foto}">` : renderIcon('box', { size: 16 })}
            </div>
            <strong style="font-size: 0.9375rem;">${it ? it.nama : 'Barang'}</strong>
          </div>
          <span style="font-weight: 700; font-size: 0.875rem;">${i.qty} unit</span>
        </div>

        <div class="cond-radios">
          ${KONDISI.map((k) => {
            const isChecked = selectedCond === k
            let cls = 'cond-btn'
            if (isChecked) {
              cls += k === 'Baik' ? ' is-baik' : ' is-damaged'
            }
            return `
              <button type="button" class="${cls}" onclick="window.pickCondition('${i.itemId}', '${k}')">
                ${k}
              </button>
            `
          }).join('')}
        </div>
      </div>
    `
  }).join('')
}

window.pickCondition = function (itemId, condition) {
  itemConditions[itemId] = condition
  renderReturnItemsInspection()
}

function closeReturnModal() {
  document.getElementById('return-modal-backdrop').style.display = 'none'
  selectedLoan = null
  itemConditions = {}
}

async function executeSubmitReturn() {
  if (!selectedLoan) return
  const noteInput = document.getElementById('ret-note-input')
  const errEl = document.getElementById('ret-note-error')
  errEl.style.display = 'none'

  const note = noteInput.value.trim()
  const hasDamagedOrLost = Object.values(itemConditions).some((c) => c !== 'Baik')

  if (hasDamagedOrLost && note.length < 5) {
    errEl.textContent = 'Catatan wajib diisi minimal 5 karakter jika ada barang yang rusak atau hilang.'
    errEl.style.display = 'block'
    return
  }

  const btn = document.getElementById('submit-return-btn')
  btn.disabled = true
  btn.textContent = 'Menyimpan…'

  try {
    await api(`/loans/${selectedLoan.id}/return`, {
      body: {
        conds: itemConditions,
        note: note,
      },
    })

    showToast(`Pengembalian ${selectedLoan.id} berhasil dicatat`, 'success')
    closeReturnModal()
    await loadData()
  } catch (err) {
    errEl.textContent = err.message
    errEl.style.display = 'block'
    showToast(err.message, 'danger')
  } finally {
    btn.disabled = false
    btn.textContent = 'Simpan & Tandai Kembali'
  }
}
