/**
 * Pinjam.in - Admin Rules Screen Controller
 * 1:1 match with React AdminRules.tsx & config.ts
 */

import { api, showToast } from '../core/api.js'
import { Auth } from '../core/auth.js'
import { renderIcon } from '../core/icons.js'

export const DEFAULT_RULES = {
  maxDaysAheadForBooking: 7,
  maxLoanDurationDays: 3,
  pickupDeadlineDaysAfterStart: 1,
  maxActiveItemTypesPerUser: 3,
}

export const RULE_META = [
  {
    key: 'maxDaysAheadForBooking',
    label: 'Batas booking ke depan',
    unit: 'hari',
    min: 1,
    max: 30,
    help: 'Seberapa jauh ke depan pengguna boleh memesan jadwal barang.',
  },
  {
    key: 'maxLoanDurationDays',
    label: 'Durasi pinjam maksimal',
    unit: 'hari',
    min: 1,
    max: 14,
    help: 'Lama maksimal untuk satu transaksi peminjaman alat.',
  },
  {
    key: 'pickupDeadlineDaysAfterStart',
    label: 'Batas pengambilan barang',
    unit: 'hari',
    min: 0,
    max: 7,
    help: 'Setelah lewat waktu ini, booking yang belum diambil otomatis Kedaluwarsa.',
  },
  {
    key: 'maxActiveItemTypesPerUser',
    label: 'Jenis barang aktif per pengguna',
    unit: 'jenis',
    min: 1,
    max: 10,
    help: 'Membatasi variasi jenis barang aktif dan isi keranjang peminjaman.',
  },
]

export const getRulesText = (r) => [
  `Booking paling lambat ${r.maxDaysAheadForBooking} hari ke depan.`,
  `Durasi pinjam maksimal ${r.maxLoanDurationDays} hari.`,
  `Ambil barang paling lambat ${r.pickupDeadlineDaysAfterStart} hari setelah tanggal mulai, atau booking kedaluwarsa.`,
  `Maksimal ${r.maxActiveItemTypesPerUser} jenis barang aktif per pengguna.`,
]

let serverRules = { ...DEFAULT_RULES }
let draftRules = { ...DEFAULT_RULES }

document.addEventListener('DOMContentLoaded', async () => {
  const admin = Auth.requireAuth({ roles: ['Admin'] })
  if (!admin) return

  Auth.renderShell('admin-rules', admin)

  const saveBtn = document.getElementById('save-rules-btn')
  const cancelBtn = document.getElementById('cancel-rules-btn')
  const resetBtn = document.getElementById('reset-default-btn')

  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true
    saveBtn.textContent = 'Menyimpan…'
    try {
      await api('/rules', {
        method: 'PUT',
        body: draftRules,
      })
      serverRules = { ...draftRules }
      showToast('Aturan operasional berhasil disimpan', 'success')
      renderRules()
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan aturan', 'danger')
    } finally {
      saveBtn.textContent = 'Simpan Perubahan'
      updateButtonsState()
    }
  })

  cancelBtn.addEventListener('click', () => {
    draftRules = { ...serverRules }
    renderRules()
  })

  resetBtn.addEventListener('click', async () => {
    if (!confirm('Kembalikan semua aturan ke konfigurasi default sistem?')) return
    resetBtn.disabled = true
    try {
      await api('/rules', {
        method: 'PUT',
        body: DEFAULT_RULES,
      })
      serverRules = { ...DEFAULT_RULES }
      draftRules = { ...DEFAULT_RULES }
      showToast('Aturan dikembalikan ke default', 'success')
      renderRules()
    } catch (err) {
      showToast(err.message || 'Gagal mengembalikan default', 'danger')
    } finally {
      resetBtn.disabled = false
    }
  })

  await loadRules()
})

async function loadRules() {
  try {
    const state = await api('/state')
    if (state && state.rules) {
      serverRules = { ...DEFAULT_RULES, ...state.rules }
      draftRules = { ...serverRules }
    }
    renderRules()
  } catch (err) {
    showToast(err.message || 'Gagal memuat aturan', 'danger')
  }
}

function renderRules() {
  const listEl = document.getElementById('rules-list')
  const previewEl = document.getElementById('rules-preview-list')

  listEl.innerHTML = RULE_META.map((m) => {
    const val = draftRules[m.key]
    const changed = val !== serverRules[m.key]

    return `
      <div class="rule-item">
        <div style="flex: 1; min-width: 240px;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1rem; font-weight: 600; color: var(--c-ink);">${m.label}</span>
            ${changed ? '<span class="pill pill-orange" style="font-size: 0.6875rem;">Diubah</span>' : ''}
          </div>
          <p style="margin-top: 0.25rem; font-size: 0.8125rem; color: var(--c-ink-2); line-height: 1.4;">
            ${m.help} <span style="white-space: nowrap;">(rentang: ${m.min}–${m.max} ${m.unit})</span>
          </p>
        </div>

        <div class="stepper-wrap">
          <button type="button" class="step-btn" data-key="${m.key}" data-action="dec" ${val <= m.min ? 'disabled' : ''} title="Kurangi">
            ${renderIcon('minus', { size: 16 })}
          </button>
          <div class="step-value-box">
            <span class="step-num">${val}</span>
            <span class="step-unit">${m.unit}</span>
          </div>
          <button type="button" class="step-btn" data-key="${m.key}" data-action="inc" ${val >= m.max ? 'disabled' : ''} title="Tambah">
            ${renderIcon('plus', { size: 16 })}
          </button>
        </div>
      </div>
    `
  }).join('')

  // Bind steppers
  listEl.querySelectorAll('.step-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-key')
      const action = btn.getAttribute('data-action')
      const meta = RULE_META.find((x) => x.key === key)
      if (!meta) return

      if (action === 'dec' && draftRules[key] > meta.min) {
        draftRules[key]--
      } else if (action === 'inc' && draftRules[key] < meta.max) {
        draftRules[key]++
      }
      renderRules()
    })
  })

  // Render preview
  previewEl.innerHTML = getRulesText(draftRules).map((txt) => `<li>${txt}</li>`).join('')

  updateButtonsState()
}

function updateButtonsState() {
  const saveBtn = document.getElementById('save-rules-btn')
  const cancelBtn = document.getElementById('cancel-rules-btn')

  const dirty = RULE_META.some((m) => draftRules[m.key] !== serverRules[m.key])
  saveBtn.disabled = !dirty
  cancelBtn.disabled = !dirty
}
