/**
 * Pinjam.in - Admin Calendar Screen Controller
 * 1:1 match with React AdminCalendar.tsx
 */

import { api, addDays, fmtDate, fmtMonth, showToast } from '../core/api.js'
import { Auth } from '../core/auth.js'

const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const OCCUPYING = ['Disetujui', 'Dipinjam', 'Terlambat']

let allItems = []
let allLoans = []
let allUsers = []
let dayOffset = 0
const TODAY_STR = new Date().toISOString().slice(0, 10)

document.addEventListener('DOMContentLoaded', async () => {
  const admin = Auth.requireAuth({ roles: ['Admin'] })
  if (!admin) return

  Auth.renderShell('admin-calendar', admin)

  document.getElementById('prev-week-btn')?.addEventListener('click', () => {
    dayOffset -= 7
    renderCalendar()
  })
  document.getElementById('next-week-btn')?.addEventListener('click', () => {
    dayOffset += 7
    renderCalendar()
  })
  document.getElementById('today-btn')?.addEventListener('click', () => {
    dayOffset = 0
    renderCalendar()
  })

  // Modal close
  const modal = document.getElementById('cal-detail-modal')
  document.getElementById('close-cal-modal-btn')?.addEventListener('click', () => modal.classList.remove('is-open'))
  document.getElementById('ok-cal-modal-btn')?.addEventListener('click', () => modal.classList.remove('is-open'))

  await loadCalendarData()
})

async function loadCalendarData() {
  try {
    const state = await api('/state')
    allItems = state.items || []
    allLoans = state.loans || []
    allUsers = state.users || []
    renderCalendar()
  } catch (err) {
    showToast(err.message || 'Gagal memuat kalender', 'danger')
  }
}

function usedOn(itemId, dateStr) {
  let count = 0
  allLoans.forEach((l) => {
    if (!OCCUPYING.includes(l.status)) return
    if (dateStr >= l.start && dateStr <= (l.status === 'Terlambat' && l.end < TODAY_STR ? TODAY_STR : l.end)) {
      (l.items || []).forEach((it) => {
        if (it.itemId === itemId) {
          count += (it.qty || 1)
        }
      })
    }
  })
  return count
}

function getHeatClass(used, total) {
  if (total === 0 || used >= total) return 'heat-full'
  if (used === 0) return 'heat-empty'
  return used / total >= 0.5 ? 'heat-mid' : 'heat-low'
}

function renderCalendar() {
  const thead = document.getElementById('calendar-thead')
  const tbody = document.getElementById('calendar-tbody')
  const titleEl = document.getElementById('calendar-range-title')

  const startDate = addDays(TODAY_STR, dayOffset)
  const days = Array.from({ length: 14 }, (_, i) => addDays(startDate, i))

  const firstMonth = fmtMonth(days[0].slice(0, 7))
  const lastMonth = fmtMonth(days[13].slice(0, 7))
  titleEl.textContent = firstMonth === lastMonth ? firstMonth : `${firstMonth} – ${lastMonth}`

  // Render Header
  thead.innerHTML = `
    <tr>
      <th style="text-align: left; padding: 0.5rem; min-width: 180px; font-size: 0.8125rem; font-weight: 600; color: var(--c-ink-2);">
        Barang
      </th>
      ${days.map((d) => {
        const dt = new Date(d + 'T00:00:00')
        const isToday = d === TODAY_STR
        return `
          <th style="min-width: 52px; text-align: center; padding: 0.375rem; border-radius: var(--radius-md); ${isToday ? 'background: var(--c-primary); color: var(--c-on);' : 'color: var(--c-ink-2);'}">
            <div style="font-size: 0.6875rem; font-weight: 500;">${DOW[dt.getDay()]}</div>
            <div style="font-size: 0.9375rem; font-weight: 700;">${dt.getDate()}</div>
          </th>
        `
      }).join('')}
    </tr>
  `

  // Render Rows
  tbody.innerHTML = allItems.map((item) => {
    return `
      <tr>
        <td style="padding: 0.5rem; font-weight: 600; font-size: 0.875rem; color: var(--c-ink); border-radius: var(--radius-md); background: var(--c-surface-muted);">
          <div class="truncate" title="${item.nama}">${item.nama}</div>
          <div style="font-size: 0.6875rem; color: var(--c-ink-2); font-weight: 500;">Total: ${item.stok_total} unit</div>
        </td>
        ${days.map((d) => {
          const used = usedOn(item.id, d)
          const heatCls = getHeatClass(used, item.stok_total)
          return `
            <td style="padding: 0;">
              <button type="button" class="cal-cell ${heatCls}" data-item-id="${item.id}" data-date="${d}">
                ${used}/${item.stok_total}
              </button>
            </td>
          `
        }).join('')}
      </tr>
    `
  }).join('')

  // Bind cell clicks to open modal
  tbody.querySelectorAll('.cal-cell').forEach((btn) => {
    btn.addEventListener('click', () => {
      const itemId = btn.getAttribute('data-item-id')
      const dateStr = btn.getAttribute('data-date')
      openDayDetail(itemId, dateStr)
    })
  })
}

function openDayDetail(itemId, dateStr) {
  const item = allItems.find((i) => i.id === itemId)
  const itemTitle = item ? item.nama : itemId
  const modal = document.getElementById('cal-detail-modal')
  document.getElementById('cal-detail-title').textContent = `${itemTitle} · ${fmtDate(dateStr)}`

  const listEl = document.getElementById('cal-detail-list')

  const matchingLoans = allLoans.filter((l) => {
    if (!OCCUPYING.includes(l.status)) return false
    const end = (l.status === 'Terlambat' && l.end < TODAY_STR) ? TODAY_STR : l.end
    return dateStr >= l.start && dateStr <= end && (l.items || []).some((x) => x.itemId === itemId)
  })

  if (matchingLoans.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 2rem 1rem; color: var(--c-ink-2);">
        <p style="font-size: 0.9375rem; font-weight: 600; color: var(--c-success);">Semua unit tersedia</p>
        <p style="font-size: 0.8125rem; margin-top: 0.25rem;">Tidak ada peminjaman aktif pada tanggal ini.</p>
      </div>
    `
  } else {
    listEl.innerHTML = matchingLoans.map((l) => {
      const borrower = allUsers.find((u) => u.id === l.userId)
      const borrowerName = borrower ? borrower.nama : (l.userNama || 'Peminjam')
      const itemQty = (l.items.find((x) => x.itemId === itemId) || {}).qty || 1

      return `
        <div style="padding: 0.875rem; background: var(--c-surface-muted); border-radius: var(--radius-lg); display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;">
          <div>
            <div style="font-size: 0.9375rem; font-weight: 600; color: var(--c-ink);">${borrowerName}</div>
            <div style="font-size: 0.8125rem; color: var(--c-ink-2); margin-top: 0.125rem;">
              ${l.start} s.d. ${l.end} · ${itemQty} unit
            </div>
          </div>
          <span class="badge badge-disetujui">${l.status}</span>
        </div>
      `
    }).join('')
  }

  modal.classList.add('is-open')
}
