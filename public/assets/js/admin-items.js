/**
 * Pinjam.in - Admin Items Management Controller
 * Handles inventory table, category filter, item CRUD with photo upload, and category management.
 */

import { api, showToast } from './api.js'
import { Auth } from './auth.js'
import { renderIcon } from './icons.js'

let currentUser = null
let state = {
  items: [],
  categories: [],
}

let activeCat = 'Semua'
let searchQuery = ''
let editingItem = null
let deletingItem = null
let editingCatOldName = null
let currentUploadedPhoto = null

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth({ roles: ['Admin'] })
  if (!currentUser) return

  Auth.renderShell('admin-items', currentUser)

  // Header buttons
  document.getElementById('add-item-btn').addEventListener('click', openAddItemModal)
  document.getElementById('manage-cats-btn').addEventListener('click', openCatsModal)

  // Search input
  document.getElementById('admin-items-search').addEventListener('input', (e) => {
    searchQuery = e.target.value
    renderItemsTable()
  })

  // Item form modal events
  document.getElementById('close-item-form-btn').addEventListener('click', closeItemForm)
  document.getElementById('abort-item-form-btn').addEventListener('click', closeItemForm)
  document.getElementById('save-item-form-btn').addEventListener('click', executeSaveItem)

  // Photo upload
  const fileInput = document.getElementById('photo-file-input')
  document.getElementById('upload-photo-btn').addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', handlePhotoPicked)
  document.getElementById('delete-photo-btn').addEventListener('click', () => {
    currentUploadedPhoto = null
    updatePhotoPreviewUI(null)
  })

  // Delete modal events
  document.getElementById('close-delete-dialog-btn').addEventListener('click', closeDeleteDialog)
  document.getElementById('abort-delete-btn').addEventListener('click', closeDeleteDialog)
  document.getElementById('confirm-delete-btn').addEventListener('click', executeDeleteItem)

  // Categories modal events
  document.getElementById('close-cats-modal-btn').addEventListener('click', closeCatsModal)
  document.getElementById('add-cat-btn').addEventListener('click', executeAddCategory)

  await loadData()
})

async function loadData() {
  try {
    const data = await api('/state')
    state.items = data.items || []
    state.categories = data.categories || []

    document.getElementById('items-stat-subtitle').textContent =
      `${state.items.length} jenis barang · ${state.categories.length} kategori`

    renderCategoryChips()
    renderItemsTable()
  } catch (err) {
    showToast('Gagal memuat barang: ' + err.message, 'danger')
  }
}

// -----------------------------------------------------------------------------
// Category Filter Chips
// -----------------------------------------------------------------------------
function renderCategoryChips() {
  const container = document.getElementById('admin-category-chips')
  const cats = ['Semua', ...state.categories]

  container.innerHTML = cats.map((c) => `
    <button type="button" class="chip ${activeCat === c ? 'is-active' : ''}" data-cat="${c}">${c}</button>
  `).join('')

  container.querySelectorAll('.chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat
      container.querySelectorAll('.chip').forEach((b) => b.classList.remove('is-active'))
      btn.classList.add('is-active')
      renderItemsTable()
    })
  })
}

// -----------------------------------------------------------------------------
// Items Table
// -----------------------------------------------------------------------------
function renderItemsTable() {
  const tbody = document.getElementById('items-tbody')
  const empty = document.getElementById('items-empty')

  const filtered = state.items.filter((item) => {
    const matchCat = activeCat === 'Semua' || item.kategori === activeCat
    const matchSearch = item.nama.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch
  })

  if (filtered.length === 0) {
    tbody.innerHTML = ''
    empty.style.display = 'flex'
    return
  }

  empty.style.display = 'none'

  tbody.innerHTML = filtered.map((it) => {
    const condTone = it.kondisi === 'Baik' ? 'green' : 'orange'

    return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <div class="item-thumb" style="width: 44px; height: 44px; border-radius: var(--radius-md);">
              ${it.foto ? `<img src="${it.foto}">` : renderIcon('box', { size: 20 })}
            </div>
            <span style="font-weight: 600;">${it.nama}</span>
          </div>
        </td>
        <td style="color: var(--c-ink-2); font-weight: 500;">${it.kategori}</td>
        <td style="font-weight: 600;">${it.stok_total} unit</td>
        <td><span class="pill pill-${condTone}">${it.kondisi}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; justify-content: flex-end; gap: 0.25rem;">
            <button type="button" class="icon-btn icon-btn-sm" onclick="window.editItem('${it.id}')" title="Edit ${it.nama}">
              ${renderIcon('edit', { size: 16 })}
            </button>
            <button type="button" class="icon-btn icon-btn-sm" style="color: var(--c-danger);" onclick="window.promptDelete('${it.id}')" title="Hapus ${it.nama}">
              ${renderIcon('trash', { size: 16 })}
            </button>
          </div>
        </td>
      </tr>
    `
  }).join('')
}

// -----------------------------------------------------------------------------
// Add / Edit Item Modal
// -----------------------------------------------------------------------------
function openAddItemModal() {
  editingItem = null
  currentUploadedPhoto = null

  document.getElementById('item-form-title').textContent = 'Tambah Barang'
  document.getElementById('item-name-input').value = ''
  document.getElementById('item-stock-input').value = '1'
  document.getElementById('item-cond-select').value = 'Baik'
  document.getElementById('item-desc-input').value = ''

  populateCatSelect()
  updatePhotoPreviewUI(null)
  clearFormErrors()

  document.getElementById('item-form-backdrop').style.display = 'flex'
}

window.editItem = function (itemId) {
  const item = state.items.find((i) => i.id === itemId)
  if (!item) return
  editingItem = item
  currentUploadedPhoto = item.foto || null

  document.getElementById('item-form-title').textContent = 'Edit Barang'
  document.getElementById('item-name-input').value = item.nama
  document.getElementById('item-stock-input').value = item.stok_total
  document.getElementById('item-cond-select').value = item.kondisi
  document.getElementById('item-desc-input').value = item.deskripsi

  populateCatSelect(item.kategori)
  updatePhotoPreviewUI(currentUploadedPhoto)
  clearFormErrors()

  document.getElementById('item-form-backdrop').style.display = 'flex'
}

function closeItemForm() {
  document.getElementById('item-form-backdrop').style.display = 'none'
  editingItem = null
  currentUploadedPhoto = null
}

function populateCatSelect(selectedCat) {
  const select = document.getElementById('item-cat-select')
  select.innerHTML = state.categories.map((c) => `
    <option value="${c}" ${c === selectedCat ? 'selected' : ''}>${c}</option>
  `).join('')
}

function clearFormErrors() {
  document.getElementById('err-nama').style.display = 'none'
  document.getElementById('err-cat').style.display = 'none'
  document.getElementById('err-stok').style.display = 'none'
  document.getElementById('err-desc').style.display = 'none'
}

function updatePhotoPreviewUI(photoUrl) {
  const preview = document.getElementById('form-photo-preview')
  const deleteBtn = document.getElementById('delete-photo-btn')
  const helper = document.getElementById('photo-helper')

  if (photoUrl) {
    preview.innerHTML = `<img src="${photoUrl}" alt="Preview">`
    deleteBtn.style.display = 'inline-block'
    helper.textContent = 'Foto sudah dipilih'
  } else {
    preview.innerHTML = renderIcon('box', { size: 24, stroke: 1.8 })
    deleteBtn.style.display = 'none'
    helper.textContent = 'Belum ada foto — placeholder kategori dipakai'
  }
}

async function handlePhotoPicked(e) {
  const file = e.target.files?.[0]
  if (!file) return

  const uploadBtn = document.getElementById('upload-photo-btn')
  uploadBtn.disabled = true
  uploadBtn.textContent = 'Mengunggah…'

  try {
    // Read and resize image via canvas
    const dataUrl = await resizeImage(file, 900, 0.82)
    // Try posting to /photos
    try {
      const res = await api('/photos', { body: { dataUrl, kind: 'item' } })
      currentUploadedPhoto = res.url || dataUrl
    } catch {
      // Fallback: direct dataUrl
      currentUploadedPhoto = dataUrl
    }
    updatePhotoPreviewUI(currentUploadedPhoto)
    showToast('Foto berhasil dimuat', 'success')
  } catch (err) {
    showToast('Gagal memproses foto: ' + err.message, 'danger')
  } finally {
    uploadBtn.disabled = false
    uploadBtn.textContent = 'Unggah'
    e.target.value = ''
  }
}

function resizeImage(file, maxDimension, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = readerEvent.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function executeSaveItem() {
  const name = document.getElementById('item-name-input').value.trim()
  const cat = document.getElementById('item-cat-select').value
  const stock = parseInt(document.getElementById('item-stock-input').value, 10)
  const cond = document.getElementById('item-cond-select').value
  const desc = document.getElementById('item-desc-input').value.trim()

  clearFormErrors()
  let hasErr = false

  if (name.length < 3) {
    const el = document.getElementById('err-nama')
    el.textContent = 'Nama barang minimal 3 karakter.'
    el.style.display = 'flex'
    hasErr = true
  }
  if (!cat) {
    const el = document.getElementById('err-cat')
    el.textContent = 'Pilih kategori barang.'
    el.style.display = 'flex'
    hasErr = true
  }
  if (isNaN(stock) || stock < 1) {
    const el = document.getElementById('err-stok')
    el.textContent = 'Stok total minimal 1 unit.'
    el.style.display = 'flex'
    hasErr = true
  }
  if (desc.length < 10) {
    const el = document.getElementById('err-desc')
    el.textContent = 'Deskripsi barang minimal 10 karakter.'
    el.style.display = 'flex'
    hasErr = true
  }

  if (hasErr) return

  const itemPayload = {
    id: editingItem ? editingItem.id : 'i' + Date.now(),
    nama: name,
    kategori: cat,
    stok_total: stock,
    kondisi: cond,
    deskripsi: desc,
    foto: currentUploadedPhoto || undefined,
  }

  const btn = document.getElementById('save-item-form-btn')
  btn.disabled = true
  btn.textContent = 'Menyimpan…'

  try {
    await api(`/items/${itemPayload.id}`, { method: 'PUT', body: itemPayload })
    showToast(editingItem ? 'Barang berhasil diperbarui' : 'Barang berhasil ditambahkan', 'success')
    closeItemForm()
    await loadData()
  } catch (err) {
    showToast(err.message, 'danger')
  } finally {
    btn.disabled = false
    btn.textContent = 'Simpan Barang'
  }
}

// -----------------------------------------------------------------------------
// Delete Item Dialog
// -----------------------------------------------------------------------------
window.promptDelete = function (itemId) {
  const item = state.items.find((i) => i.id === itemId)
  if (!item) return
  deletingItem = item
  document.getElementById('delete-item-name').textContent = item.nama
  document.getElementById('delete-dialog-backdrop').style.display = 'flex'
}

function closeDeleteDialog() {
  document.getElementById('delete-dialog-backdrop').style.display = 'none'
  deletingItem = null
}

async function executeDeleteItem() {
  if (!deletingItem) return
  const btn = document.getElementById('confirm-delete-btn')
  btn.disabled = true

  try {
    await api(`/items/${deletingItem.id}`, { method: 'DELETE' })
    showToast(`Barang "${deletingItem.nama}" dihapus`, 'info')
    closeDeleteDialog()
    await loadData()
  } catch (err) {
    showToast(err.message, 'danger')
  } finally {
    btn.disabled = false
  }
}

// -----------------------------------------------------------------------------
// Manage Categories Modal
// -----------------------------------------------------------------------------
function openCatsModal() {
  renderCatsList()
  document.getElementById('new-cat-input').value = ''
  document.getElementById('new-cat-error').style.display = 'none'
  document.getElementById('cats-modal-backdrop').style.display = 'flex'
}

function closeCatsModal() {
  document.getElementById('cats-modal-backdrop').style.display = 'none'
}

function renderCatsList() {
  const container = document.getElementById('cats-list-container')
  container.innerHTML = state.categories.map((c) => {
    const count = state.items.filter((i) => i.kategori === c).length
    return `
      <div class="glass card" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem;">
        <span style="font-weight: 600; font-size: 0.9375rem;">${c}</span>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-size: 0.75rem; color: var(--c-ink-2);">${count} barang</span>
          <button type="button" class="icon-btn icon-btn-sm" style="color: var(--c-danger);" onclick="window.deleteCategory('${c}')" title="Hapus kategori">
            ${renderIcon('trash', { size: 15 })}
          </button>
        </div>
      </div>
    `
  }).join('')
}

async function executeAddCategory() {
  const input = document.getElementById('new-cat-input')
  const errEl = document.getElementById('new-cat-error')
  errEl.style.display = 'none'

  const val = input.value.trim()
  if (!val) {
    errEl.textContent = 'Nama kategori wajib diisi.'
    errEl.style.display = 'block'
    return
  }
  if (state.categories.includes(val)) {
    errEl.textContent = 'Kategori sudah ada.'
    errEl.style.display = 'block'
    return
  }

  const nextCats = [...state.categories, val]
  try {
    await api('/categories', { method: 'PUT', body: { categories: nextCats } })
    state.categories = nextCats
    input.value = ''
    renderCatsList()
    renderCategoryChips()
    showToast('Kategori baru ditambahkan', 'success')
  } catch (err) {
    errEl.textContent = err.message
    errEl.style.display = 'block'
  }
}

window.deleteCategory = async function (catName) {
  const usedCount = state.items.filter((i) => i.kategori === catName).length
  if (usedCount > 0) {
    alert(`Kategori "${catName}" masih digunakan oleh ${usedCount} barang. Pindahkan barangnya terlebih dahulu.`)
    return
  }

  if (confirm(`Yakin ingin menghapus kategori "${catName}"?`)) {
    const nextCats = state.categories.filter((c) => c !== catName)
    try {
      await api('/categories', { method: 'PUT', body: { categories: nextCats } })
      state.categories = nextCats
      renderCatsList()
      renderCategoryChips()
      showToast('Kategori dihapus', 'info')
    } catch (err) {
      showToast(err.message, 'danger')
    }
  }
}
