/**
 * Pinjam.in - Admin Dashboard Screen Controller
 * 1:1 match with React AdminDashboard.tsx
 */

import { api, fmtRange } from '../core/api.js'
import { Auth } from '../core/auth.js'
import { url } from '../core/routes.js'

const WEEKLY_DATA = [
  { label: 'M-7', value: 12 },
  { label: 'M-6', value: 18 },
  { label: 'M-5', value: 15 },
  { label: 'M-4', value: 24 },
  { label: 'M-3', value: 21 },
  { label: 'M-2', value: 28 },
  { label: 'M-1', value: 22 },
  { label: 'Ini', value: 31 },
]

document.addEventListener('DOMContentLoaded', async () => {
  const user = Auth.requireAuth({ roles: ['Admin'] })
  if (!user) return

  Auth.renderShell('admin-dashboard', user)

  await loadDashboardData()
})

async function loadDashboardData() {
  try {
    const state = await api('/state')
    const loans = state.loans || []
    const items = state.items || []
    const users = state.users || []

    // 1. KPI metrics
    const activeCount = loans.filter((l) => ['Dipinjam', 'Terlambat'].includes(l.status)).length
    const pendingCount = loans.filter((l) => l.status === 'Menunggu').length
    const overdueCount = loans.filter((l) => l.status === 'Terlambat').length
    const totalUnits = items.reduce((sum, i) => sum + (i.stok_total || 0), 0)

    document.getElementById('kpi-active').textContent = activeCount
    document.getElementById('kpi-pending').textContent = pendingCount
    document.getElementById('kpi-overdue').textContent = overdueCount
    document.getElementById('kpi-total-items').textContent = totalUnits
    document.getElementById('kpi-total-sub').textContent = `${items.length} jenis barang`

    // 2. Render 8-Week Bar Chart
    const chartEl = document.getElementById('weekly-chart')
    const maxVal = Math.max(...WEEKLY_DATA.map((w) => w.value))
    chartEl.innerHTML = WEEKLY_DATA.map((w, idx) => {
      const isCurrent = idx === WEEKLY_DATA.length - 1
      const pct = Math.round((w.value / maxVal) * 85)
      return `
        <div class="chart-bar-group">
          <span style="font-size: 0.75rem; font-weight: 600; color: var(--c-ink-2);">${w.value}</span>
          <div class="chart-bar ${isCurrent ? 'is-current' : ''}" style="height: ${pct}%;"></div>
          <span style="font-size: 0.6875rem; color: var(--c-ink-2); font-weight: 500;">${w.label}</span>
        </div>
      `
    }).join('')

    // 3. Top Most Borrowed
    const topContainer = document.getElementById('top-items-container')
    const borrowCounts = {}
    loans
      .filter((l) => !['Ditolak', 'Dibatalkan'].includes(l.status))
      .forEach((l) => {
        (l.items || []).forEach((it) => {
          borrowCounts[it.itemId] = (borrowCounts[it.itemId] || 0) + (it.qty || 1)
        })
      })

    const topItems = Object.entries(borrowCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    if (topItems.length === 0) {
      topContainer.innerHTML = '<p style="font-size: 0.875rem; color: var(--c-ink-2);">Belum ada riwayat peminjaman.</p>'
    } else {
      const maxBorrowed = topItems[0][1]
      topContainer.innerHTML = topItems.map(([id, count], idx) => {
        const itemObj = items.find((i) => i.id === id)
        const name = itemObj ? itemObj.nama : `Barang (${id})`
        const pct = Math.round((count / maxBorrowed) * 100)
        return `
          <div class="top-item-row">
            <span style="width: 20px; font-size: 0.8125rem; font-weight: 700; color: var(--c-ink-2);">${idx + 1}</span>
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; justify-content: space-between; font-size: 0.875rem; font-weight: 600; color: var(--c-ink);">
                <span class="truncate">${name}</span>
                <span style="color: var(--c-ink-2); font-weight: 500;">${count}×</span>
              </div>
              <div style="margin-top: 0.25rem; height: 6px; background: var(--c-surface-muted); border-radius: var(--radius-full); overflow: hidden;">
                <div style="height: 100%; width: ${pct}%; background: var(--c-primary); border-radius: var(--radius-full);"></div>
              </div>
            </div>
          </div>
        `
      }).join('')
    }

    // 4. Recent Pending Loans
    const pendingContainer = document.getElementById('pending-loans-container')
    const pendingLoans = loans.filter((l) => l.status === 'Menunggu').slice(0, 4)

    if (pendingLoans.length === 0) {
      pendingContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--c-ink-2);">
          <p style="font-size: 0.875rem;">Semua pengajuan sudah diproses.</p>
        </div>
      `
    } else {
      pendingContainer.innerHTML = `
        <div class="grid-md-2" style="gap: 0.75rem;">
          ${pendingLoans.map((l) => {
            const borrower = users.find((u) => u.id === l.userId)
            const borrowerName = borrower ? borrower.nama : (l.userNama || 'Peminjam')
            const itemNames = (l.items || []).map((x) => {
              const it = items.find((i) => i.id === x.itemId)
              return `${x.qty}× ${it ? it.nama : x.itemId}`
            }).join(', ')

            return `
              <a href="${url('queue')}" class="card" style="padding: 1rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; text-decoration: none; color: inherit; background: var(--c-surface-muted);">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 0.9375rem; font-weight: 600; color: var(--c-ink);" class="truncate">${itemNames}</div>
                  <div style="font-size: 0.8125rem; color: var(--c-ink-2); margin-top: 0.125rem;">
                    ${borrowerName} · ${fmtRange(l.start, l.end)}
                  </div>
                </div>
                <span class="badge badge-menunggu" style="flex-shrink: 0;">Menunggu</span>
              </a>
            `
          }).join('')}
        </div>
      `
    }
  } catch (err) {
    showToast(err.message || 'Gagal memuat data dashboard', 'danger')
  }
}
