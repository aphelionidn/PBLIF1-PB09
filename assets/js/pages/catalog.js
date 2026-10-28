/**
 * Pinjam.in - Catalog Screen Controller
 * Handles item browsing, live search, categories, favorites, date-picker booking modal, and cart.
 */

import { api, showToast, TODAY, addDays, diffDays, fmtDate, fmtRange, fmtMonth } from '../core/api.js'
import { Auth } from '../core/auth.js'
import { renderIcon } from '../core/icons.js'
import { url } from '../core/routes.js'

// Domain State
let currentUser = null
let state = {
  items: [],
  categories: [],
  loans: [],
  rules: { maxLoanDurationDays: 3, maxDaysAheadForBooking: 7, maxActiveItemTypesPerUser: 3 },
  cart: [],
  cartDates: null,
  favs: [],
  recent: [],
}

let activeCat = 'Semua'
let searchQuery = ''
let selectedItem = null
let bookingDates = { start: null, end: null }
let bookingQty = 1
let pickerMonth = TODAY.slice(0, 7) // 'YYYY-MM'

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth()
  if (!currentUser) return

  Auth.renderShell('catalog', currentUser)

  // Greet user
  const hour = new Date().getHours()
  const greet = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam'
  document.getElementById('greeting-text').textContent = `${greet},`
  document.getElementById('user-display-name').textContent = currentUser.nama.split(',')[0]

  // Bind Cart button click to open cart drawer
  const bindCartOpener = (id) => {
    const el = document.getElementById(id)
    if (el) el.addEventListener('click', openCartDrawer)
  }
  bindCartOpener('cart-btn-desktop')
  bindCartOpener('cart-btn-mobile')

  // Search input listeners
  const searchInput = document.getElementById('catalog-search')
  const clearBtn = document.getElementById('search-clear-btn')
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value
    clearBtn.style.display = searchQuery ? 'grid' : 'none'
    renderCatalogGrid()
  })
  clearBtn.addEventListener('click', () => {
    searchInput.value = ''
    searchQuery = ''
    clearBtn.style.display = 'none'
    renderCatalogGrid()
  })

  // Reset filter button
  document.getElementById('reset-filter-btn').addEventListener('click', () => {
    searchInput.value = ''
    searchQuery = ''
    clearBtn.style.display = 'none'
    activeCat = 'Semua'
    updateCategoryChipsUI()
    renderCatalogGrid()
  })

  // Modal close buttons
  document.getElementById('close-modal-btn').addEventListener('click', closeItemModal)
  document.getElementById('item-modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'item-modal-backdrop') closeItemModal()
  })
  document.getElementById('close-cart-btn').addEventListener('click', closeCartDrawer)
  document.getElementById('cart-drawer-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'cart-drawer-backdrop') closeCartDrawer()
  })

  // Modal Quantity steppers
  document.getElementById('qty-minus-btn').addEventListener('click', () => {
    if (bookingQty > 1) {
      bookingQty--
      updateQtyUI()
    }
  })
  document.getElementById('qty-plus-btn').addEventListener('click', () => {
    const max = getMaxAllowedQty()
    if (bookingQty < max) {
      bookingQty++
      updateQtyUI()
    }
  })

  // Calendar month buttons
  document.getElementById('cal-prev-btn').addEventListener('click', () => {
    pickerMonth = shiftMonth(pickerMonth, -1)
    renderCalendar()
  })
  document.getElementById('cal-next-btn').addEventListener('click', () => {
    pickerMonth = shiftMonth(pickerMonth, 1)
    renderCalendar()
  })

  // Modal submit & add to cart
  document.getElementById('direct-submit-btn').addEventListener('click', submitDirectBooking)
  document.getElementById('add-cart-btn').addEventListener('click', handleAddToCart)
  document.getElementById('clear-cart-btn').addEventListener('click', clearCart)
  document.getElementById('checkout-cart-btn').addEventListener('click', submitCartCheckout)

  // Initial Load from Server
  await loadState()
})

async function loadState() {
  try {
    const data = await api('/state')
    state.items = data.items || []
    state.categories = data.categories || []
    state.loans = data.loans || []
    if (data.rules) state.rules = { ...state.rules, ...data.rules }
    if (data.cart) state.cart = data.cart
    if (data.cartDates) state.cartDates = data.cartDates

    // Load favorites
    const favKey = 'pinjamin.favs'
    try {
      const localFavMap = JSON.parse(localStorage.getItem(favKey) || '{}')
      state.favs = localFavMap[currentUser.id] || []
    } catch {
      state.favs = []
    }
    if (Array.isArray(data.favorites)) {
      state.favs = data.favorites
    }

    renderCategoryChips()
    renderForYou()
    renderCatalogGrid()
    updateCartBadges()
  } catch (error) {
    showToast('Gagal menyinkronkan data server: ' + error.message, 'danger')
  }
}

// -----------------------------------------------------------------------------
// Stock Availability Calculations
// -----------------------------------------------------------------------------
const OCCUPYING = ['Disetujui', 'Dipinjam', 'Terlambat']

function usedOn(itemId, date, excludeLoanId) {
  return state.loans
    .filter((l) => l.id !== excludeLoanId && OCCUPYING.includes(l.status))
    .filter((l) => {
      const end = l.status === 'Terlambat' && l.end < TODAY ? TODAY : l.end
      return l.start <= date && date <= end
    })
    .reduce((sum, l) => {
      const it = l.items.find((i) => i.itemId === itemId)
      return sum + (it ? it.qty : 0)
    }, 0)
}

function availableOn(itemId, date) {
  const item = state.items.find((i) => i.id === itemId)
  if (!item) return 0
  return Math.max(0, item.stok_total - usedOn(itemId, date))
}

function availableRange(itemId, start, end) {
  let min = Infinity
  for (let d = start; d <= end; d = addDays(d, 1)) {
    min = Math.min(min, availableOn(itemId, d))
  }
  return min === Infinity ? 0 : min
}

// -----------------------------------------------------------------------------
// For You / Active Loan Banner
// -----------------------------------------------------------------------------
function renderForYou() {
  if (currentUser.role === 'Admin') return
  const foryouSection = document.getElementById('foryou-section')
  const activeContainer = document.getElementById('active-loan-container')

  const mine = state.loans.filter((l) => l.userId === currentUser.id)
  const active = mine
    .filter((l) => ['Dipinjam', 'Terlambat', 'Disetujui'].includes(l.status))
    .sort((a, b) => a.end.localeCompare(b.end))[0]

  if (!active) {
    activeContainer.innerHTML = ''
    foryouSection.style.display = 'none'
    return
  }

  foryouSection.style.display = 'grid'
  const left = diffDays(TODAY, active.status === 'Disetujui' ? active.start : active.end)
  const toneBg = active.status === 'Terlambat' ? 'var(--c-danger)' : left <= 0 ? 'var(--c-warning)' : 'var(--c-primary)'

  const statusLabel = active.status === 'Disetujui' ? 'Siap diambil' : active.status === 'Terlambat' ? 'Segera kembalikan' : 'Sedang dipinjam'
  const itemNames = active.items.map((i) => {
    const it = state.items.find((x) => x.id === i.itemId)
    return it ? it.nama : 'Barang'
  }).join(', ')

  activeContainer.innerHTML = `
    <button type="button" class="active-loan-banner tap" style="background: ${toneBg};" onclick="location.href='${url('myLoans')}'">
      <p style="font-size: 0.8125rem; font-weight: 600; opacity: 0.9;">${statusLabel} · ${active.id}</p>
      <div style="margin-top: 0.5rem; display: flex; align-items: flex-end; gap: 0.5rem;">
        <span style="font-size: 2.75rem; font-weight: 800; line-height: 1;">${Math.abs(left)}</span>
        <span style="font-size: 0.9375rem; font-weight: 600; padding-bottom: 0.25rem;">
          ${left === 0 ? 'hari ini' : active.status === 'Terlambat' || left < 0 ? 'hari terlambat' : 'hari lagi'}
        </span>
      </div>
      <p style="margin-top: 0.5rem; font-size: 0.875rem; opacity: 0.95; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${itemNames} · s.d. ${fmtDate(active.end)}
      </p>
    </button>
  `

  // Render quick chips
  const favList = document.getElementById('fav-chips-list')
  const favRow = document.getElementById('fav-chips-row')
  const favItems = state.favs.map((id) => state.items.find((i) => i.id === id)).filter(Boolean)
  if (favItems.length > 0) {
    favRow.style.display = 'block'
    favList.innerHTML = favItems.map((it) => `
      <div class="mini-chip tap" onclick="window.openItemModal('${it.id}')">
        <span style="width: 20px; height: 20px; border-radius: 50%; background: var(--c-surface); display: grid; place-items: center;">${renderIcon('box', { size: 12 })}</span>
        <span>${it.nama}</span>
      </div>
    `).join('')
  }
}

// -----------------------------------------------------------------------------
// Category Chips
// -----------------------------------------------------------------------------
function renderCategoryChips() {
  const container = document.getElementById('category-chips')
  const cats = ['Semua', ...(currentUser.role !== 'Admin' ? ['Favorit'] : []), ...state.categories]

  container.innerHTML = cats.map((c) => `
    <button type="button" class="chip ${activeCat === c ? 'is-active' : ''}" data-cat="${c}">${c}</button>
  `).join('')

  container.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat
      updateCategoryChipsUI()
      renderCatalogGrid()
    })
  })
}

function updateCategoryChipsUI() {
  document.querySelectorAll('#category-chips .chip').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.cat === activeCat)
  })
}

// -----------------------------------------------------------------------------
// Catalog Grid & Cards
// -----------------------------------------------------------------------------
function renderCatalogGrid() {
  const grid = document.getElementById('items-grid')
  const empty = document.getElementById('empty-state')

  const filtered = state.items.filter((item) => {
    const matchCat =
      activeCat === 'Semua' ||
      (activeCat === 'Favorit' ? state.favs.includes(item.id) : item.kategori === activeCat)
    const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  if (filtered.length === 0) {
    grid.innerHTML = ''
    empty.style.display = 'flex'
    document.getElementById('empty-desc').textContent =
      activeCat === 'Favorit' && !searchQuery
        ? 'Ketuk ikon hati pada kartu barang untuk menyimpannya di sini.'
        : `Tidak ada hasil untuk "${searchQuery}"${activeCat !== 'Semua' ? ` di kategori ${activeCat}` : ''}.`
    return
  }

  empty.style.display = 'none'

  grid.innerHTML = filtered.map((item) => {
    const avail = availableOn(item.id, TODAY)
    const isFav = state.favs.includes(item.id)
    const statusPill =
      avail === 0
        ? '<span class="pill pill-red">Habis hari ini</span>'
        : avail <= 1
        ? '<span class="pill pill-orange">Hampir habis</span>'
        : '<span class="pill pill-green">Tersedia</span>'

    return `
      <div class="item-card tap" onclick="window.openItemModal('${item.id}')">
        <div class="item-thumb item-thumb-card">
          ${item.foto ? `<img src="${item.foto}" alt="${item.nama}" loading="lazy">` : renderIcon('box', { size: 36, stroke: 1.5 })}
        </div>
        <div class="item-card-body">
          <p class="item-card-cat">${item.kategori}</p>
          <p class="item-card-title">${item.nama}</p>
          <div class="item-card-footer">
            ${statusPill}
            <span style="font-size: 0.8125rem; font-weight: 600; color: var(--c-ink-2);">
              <b style="color: var(--c-ink);">${avail}</b>/${item.stok_total} unit
            </span>
          </div>
        </div>
        ${currentUser.role !== 'Admin' ? `
          <button type="button" class="fav-btn ${isFav ? 'is-active' : ''}" style="position: absolute; top: 8px; right: 8px;"
            onclick="event.stopPropagation(); window.toggleFavorite('${item.id}')" title="${isFav ? 'Hapus favorit' : 'Tambah favorit'}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z"/></svg>
          </button>
        ` : ''}
      </div>
    `
  }).join('')
}

// -----------------------------------------------------------------------------
// Favorite Toggle
// -----------------------------------------------------------------------------
window.toggleFavorite = async function (itemId) {
  const isFav = state.favs.includes(itemId)
  if (isFav) {
    state.favs = state.favs.filter((id) => id !== itemId)
  } else {
    state.favs.push(itemId)
  }

  // Update localStorage
  const favKey = 'pinjamin.favs'
  try {
    const map = JSON.parse(localStorage.getItem(favKey) || '{}')
    map[currentUser.id] = state.favs
    localStorage.setItem(favKey, JSON.stringify(map))
  } catch {}

  showToast(isFav ? 'Dihapus dari favorit' : 'Ditambahkan ke favorit', isFav ? 'info' : 'success')
  renderCatalogGrid()
  renderForYou()

  // Sync to server
  try {
    await api('/me/favorites', { method: 'PUT', body: { favorites: state.favs } })
  } catch {}
}

// -----------------------------------------------------------------------------
// Item Detail Modal & Calendar Date Picker
// -----------------------------------------------------------------------------
window.openItemModal = function (itemId) {
  selectedItem = state.items.find((i) => i.id === itemId)
  if (!selectedItem) return

  bookingDates = { start: null, end: null }
  bookingQty = 1
  pickerMonth = TODAY.slice(0, 7)

  document.getElementById('modal-item-name').textContent = selectedItem.nama
  document.getElementById('modal-item-cat').textContent = selectedItem.kategori
  document.getElementById('modal-item-cond').textContent = `Kondisi: ${selectedItem.kondisi}`
  document.getElementById('modal-item-desc').textContent = selectedItem.deskripsi
  document.getElementById('modal-item-total').textContent = `${selectedItem.stok_total} unit`

  const availToday = availableOn(selectedItem.id, TODAY)
  document.getElementById('modal-avail-label').textContent = 'Tersedia hari ini'
  document.getElementById('modal-item-avail').textContent = `${availToday} unit`

  const thumbBox = document.getElementById('modal-item-thumb')
  thumbBox.innerHTML = selectedItem.foto
    ? `<img src="${selectedItem.foto}" alt="${selectedItem.nama}">`
    : renderIcon('box', { size: 54, stroke: 1.5 })

  document.getElementById('booking-purpose').value = ''
  document.getElementById('date-error').style.display = 'none'
  document.getElementById('qty-error').style.display = 'none'
  document.getElementById('purpose-error').style.display = 'none'

  renderCalendar()
  updateQtyUI()

  document.getElementById('item-modal-backdrop').style.display = 'flex'
}

function closeItemModal() {
  document.getElementById('item-modal-backdrop').style.display = 'none'
  selectedItem = null
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function renderCalendar() {
  if (!selectedItem) return
  const [y, m] = pickerMonth.split('-').map(Number)
  document.getElementById('cal-month-title').textContent = fmtMonth(pickerMonth)

  const firstDay = new Date(y, m - 1, 1).getDay()
  const daysInMonth = new Date(y, m, 0).getDate()
  const grid = document.getElementById('cal-grid')

  const lastAllowedDate = addDays(TODAY, state.rules.maxDaysAheadForBooking + state.rules.maxLoanDurationDays)

  let html = ''
  for (let i = 0; i < firstDay; i++) {
    html += '<span></span>'
  }

  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const dStr = `${pickerMonth}-${String(dayNum).padStart(2, '0')}`
    const isPast = dStr < TODAY
    const isTooFar = dStr > lastAllowedDate
    const avail = availableOn(selectedItem.id, dStr)
    const isFull = avail === 0

    let isSelected = bookingDates.start && (dStr === bookingDates.start || dStr === bookingDates.end)
    let inRange = bookingDates.start && bookingDates.end && dStr >= bookingDates.start && dStr <= bookingDates.end
    let disabled = isPast || isTooFar

    // If selecting range end, cannot pick if range exceeds max duration
    if (bookingDates.start && !bookingDates.end && !disabled) {
      if (dStr >= bookingDates.start && diffDays(bookingDates.start, dStr) >= state.rules.maxLoanDurationDays) {
        disabled = true
      }
    }

    let classNames = ['calendar-day-btn']
    if (isSelected) classNames.push('is-selected')
    else if (inRange) classNames.push('in-range')
    if (disabled) classNames.push('is-disabled')
    if (isFull) classNames.push('is-full')

    html += `
      <button type="button" class="${classNames.join(' ')}" ${disabled ? 'disabled' : ''} onclick="window.pickCalendarDate('${dStr}')">
        <span>${dayNum}</span>
        ${dStr === TODAY ? '<span class="calendar-today-dot"></span>' : ''}
      </button>
    `
  }

  grid.innerHTML = html

  // Update prompt label
  const label = document.getElementById('picker-prompt-label')
  if (!bookingDates.start || bookingDates.end) {
    label.textContent = 'Pilih tanggal mulai peminjaman'
  } else {
    label.textContent = `Mulai: ${fmtDate(bookingDates.start)} → Pilih tanggal selesai`
  }
}

window.pickCalendarDate = function (dateStr) {
  if (!bookingDates.start || bookingDates.end || dateStr < bookingDates.start) {
    bookingDates.start = dateStr
    bookingDates.end = null
  } else {
    bookingDates.end = dateStr
  }

  // Calculate range stock
  const end = bookingDates.end || bookingDates.start
  const rangeAvail = availableRange(selectedItem.id, bookingDates.start, end)
  document.getElementById('modal-avail-label').textContent = `Tersedia (${fmtRange(bookingDates.start, end)})`
  document.getElementById('modal-item-avail').textContent = `${rangeAvail} unit`

  bookingQty = 1
  updateQtyUI()
  renderCalendar()
}

function getMaxAllowedQty() {
  if (!selectedItem) return 1
  if (bookingDates.start) {
    const end = bookingDates.end || bookingDates.start
    return availableRange(selectedItem.id, bookingDates.start, end)
  }
  return availableOn(selectedItem.id, TODAY)
}

function updateQtyUI() {
  const max = getMaxAllowedQty()
  document.getElementById('qty-display').textContent = bookingQty
  document.getElementById('qty-minus-btn').disabled = bookingQty <= 1
  document.getElementById('qty-plus-btn').disabled = bookingQty >= max
  document.getElementById('qty-helper').textContent = `Maksimal ${max} unit`
}

// -----------------------------------------------------------------------------
// Direct Booking Submission
// -----------------------------------------------------------------------------
async function submitDirectBooking() {
  if (!selectedItem) return
  const dateErr = document.getElementById('date-error')
  const qtyErr = document.getElementById('qty-error')
  const purpErr = document.getElementById('purpose-error')

  dateErr.style.display = 'none'
  qtyErr.style.display = 'none'
  purpErr.style.display = 'none'

  if (!bookingDates.start) {
    dateErr.textContent = 'Pilih tanggal mulai dan selesai peminjaman pada kalender.'
    dateErr.style.display = 'flex'
    return
  }

  const end = bookingDates.end || bookingDates.start
  const max = availableRange(selectedItem.id, bookingDates.start, end)
  if (max === 0) {
    dateErr.textContent = 'Stok habis untuk rentang tanggal yang dipilih.'
    dateErr.style.display = 'flex'
    return
  }

  if (bookingQty > max) {
    qtyErr.textContent = `Jumlah melebihi stok yang tersedia (${max} unit).`
    qtyErr.style.display = 'flex'
    return
  }

  const purpose = document.getElementById('booking-purpose').value.trim()
  if (purpose.length < 10) {
    purpErr.textContent = 'Jelaskan keperluan peminjaman minimal 10 karakter.'
    purpErr.style.display = 'flex'
    return
  }

  const submitBtn = document.getElementById('direct-submit-btn')
  submitBtn.disabled = true
  submitBtn.textContent = 'Memproses…'

  try {
    const res = await api('/loans', {
      body: {
        items: [{ itemId: selectedItem.id, qty: bookingQty }],
        start: bookingDates.start,
        end: end,
        keperluan: purpose,
      },
    })

    showToast('Booking berhasil diajukan!', 'success')
    closeItemModal()
    await loadState()

    setTimeout(() => {
      window.location.href = url('myLoans')
    }, 400)
  } catch (error) {
    showToast(error.message, 'danger')
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Ajukan Sekarang'
  }
}

// -----------------------------------------------------------------------------
// Cart Drawer Implementation
// -----------------------------------------------------------------------------
function handleAddToCart() {
  if (!selectedItem) return
  const dateErr = document.getElementById('date-error')
  dateErr.style.display = 'none'

  if (!bookingDates.start) {
    dateErr.textContent = 'Pilih tanggal dulu pada kalender agar stok bisa dicadangkan.'
    dateErr.style.display = 'flex'
    return
  }

  const end = bookingDates.end || bookingDates.start

  // If cart already has a date range, require match
  if (state.cartDates && state.cart.length > 0) {
    if (state.cartDates.start !== bookingDates.start || state.cartDates.end !== end) {
      alert(`Keranjang memakai tanggal ${fmtRange(state.cartDates.start, state.cartDates.end)}. Satu peminjaman = satu rentang tanggal yang sama.`)
      return
    }
  }

  state.cartDates = { start: bookingDates.start, end: end }

  const existing = state.cart.find((c) => c.itemId === selectedItem.id)
  if (existing) {
    existing.qty = bookingQty
  } else {
    state.cart.push({ itemId: selectedItem.id, qty: bookingQty })
  }

  // Persist cart
  persistCart()
  showToast('Ditambahkan ke keranjang', 'success')
  closeItemModal()
  openCartDrawer()
}

function persistCart() {
  try {
    localStorage.setItem('pinjamin.cart', JSON.stringify({ cart: state.cart, cartDates: state.cartDates }))
  } catch {}
  updateCartBadges()
  api('/me/cart', { method: 'PUT', body: { cart: state.cart, cartDates: state.cartDates } }).catch(() => {})
}

function updateCartBadges() {
  const count = state.cart.length
  const badgeDesktop = document.getElementById('cart-badge-desktop')
  const badgeMobile = document.getElementById('cart-badge-mobile')

  if (badgeDesktop) {
    badgeDesktop.textContent = count
    badgeDesktop.style.display = count > 0 ? 'inline-block' : 'none'
  }
  if (badgeMobile) {
    badgeMobile.textContent = count
    badgeMobile.style.display = count > 0 ? 'grid' : 'none'
  }
}

function openCartDrawer() {
  const backdrop = document.getElementById('cart-drawer-backdrop')
  const title = document.getElementById('cart-drawer-title')
  const empty = document.getElementById('cart-empty-state')
  const content = document.getElementById('cart-content-wrap')
  const footer = document.getElementById('cart-drawer-footer')
  const list = document.getElementById('cart-items-list')

  title.textContent = `Keranjang (${state.cart.length})`

  if (state.cart.length === 0 || !state.cartDates) {
    empty.style.display = 'flex'
    content.style.display = 'none'
    footer.style.display = 'none'
  } else {
    empty.style.display = 'none'
    content.style.display = 'flex'
    footer.style.display = 'flex'

    document.getElementById('cart-date-banner').textContent = `📅 Periode: ${fmtRange(state.cartDates.start, state.cartDates.end)}`

    list.innerHTML = state.cart.map((line) => {
      const it = state.items.find((x) => x.id === line.itemId)
      if (!it) return ''
      const max = availableRange(it.id, state.cartDates.start, state.cartDates.end)

      return `
        <li class="glass card" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem;">
          <div class="item-thumb" style="width: 44px; height: 44px; border-radius: var(--radius-md);">
            ${it.foto ? `<img src="${it.foto}">` : renderIcon('box', { size: 20 })}
          </div>
          <div style="flex: 1; min-width: 0;">
            <p style="font-weight: 600; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${it.nama}</p>
            <p style="font-size: 0.75rem; color: var(--c-ink-2);">Tersedia ${max} unit</p>
          </div>
          <div style="display: flex; align-items: center; gap: 0.375rem;">
            <button type="button" class="btn btn-secondary icon-btn-sm" onclick="window.changeCartQty('${it.id}', ${line.qty - 1})">−</button>
            <span style="min-width: 20px; text-align: center; font-weight: 700; font-size: 0.9375rem;">${line.qty}</span>
            <button type="button" class="btn btn-secondary icon-btn-sm" ${line.qty >= max ? 'disabled' : ''} onclick="window.changeCartQty('${it.id}', ${line.qty + 1})">+</button>
          </div>
          <button type="button" class="icon-btn icon-btn-sm" style="color: var(--c-danger);" onclick="window.removeCartItem('${it.id}')" title="Hapus">✕</button>
        </li>
      `
    }).join('')
  }

  backdrop.style.display = 'flex'
}

function closeCartDrawer() {
  document.getElementById('cart-drawer-backdrop').style.display = 'none'
}

window.changeCartQty = function (itemId, nextQty) {
  if (nextQty <= 0) {
    window.removeCartItem(itemId)
    return
  }
  const item = state.cart.find((c) => c.itemId === itemId)
  if (item) {
    item.qty = nextQty
    persistCart()
    openCartDrawer()
  }
}

window.removeCartItem = function (itemId) {
  state.cart = state.cart.filter((c) => c.itemId !== itemId)
  if (state.cart.length === 0) state.cartDates = null
  persistCart()
  openCartDrawer()
}

function clearCart() {
  if (confirm('Kosongkan semua barang di keranjang?')) {
    state.cart = []
    state.cartDates = null
    persistCart()
    openCartDrawer()
  }
}

async function submitCartCheckout() {
  if (state.cart.length === 0 || !state.cartDates) return
  const purpInput = document.getElementById('cart-purpose')
  const purpErr = document.getElementById('cart-purpose-error')
  purpErr.style.display = 'none'

  const purpose = purpInput.value.trim()
  if (purpose.length < 10) {
    purpErr.textContent = 'Jelaskan keperluan peminjaman minimal 10 karakter.'
    purpErr.style.display = 'flex'
    return
  }

  const btn = document.getElementById('checkout-cart-btn')
  btn.disabled = true
  btn.textContent = 'Memproses…'

  try {
    await api('/loans', {
      body: {
        items: state.cart,
        start: state.cartDates.start,
        end: state.cartDates.end,
        keperluan: purpose,
      },
    })

    showToast('Booking berhasil diajukan!', 'success')
    state.cart = []
    state.cartDates = null
    persistCart()
    closeCartDrawer()
    setTimeout(() => {
      window.location.href = url('myLoans')
    }, 400)
  } catch (error) {
    showToast(error.message, 'danger')
  } finally {
    btn.disabled = false
    btn.textContent = 'Ajukan Booking Sekarang'
  }
}
