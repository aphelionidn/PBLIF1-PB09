/**
 * Pinjam.in - Profile Screen Controller
 * 1:1 match with React Profile.tsx
 */

import { api, showToast } from '../core/api.js'
import { Auth } from '../core/auth.js'
import { renderIcon } from '../core/icons.js'

let user = null

document.addEventListener('DOMContentLoaded', async () => {
  user = Auth.requireAuth()
  if (!user) return

  Auth.renderShell('profile', user)
  populateUserData(user)

  // Fetch latest profile from /me
  try {
    const fresh = await api('/me')
    if (fresh) {
      const u = fresh.user || fresh.me || fresh
      user = u
      localStorage.setItem('pinjamin.user', JSON.stringify(u))
      populateUserData(user)
      Auth.renderShell('profile', user)
    }
  } catch {
    // fallback to stored user
  }

  // Modals
  const editModal = document.getElementById('edit-profile-modal')
  const pwModal = document.getElementById('change-pw-modal')

  document.getElementById('open-edit-profile-btn')?.addEventListener('click', () => {
    document.getElementById('edit-nama').value = user.nama || ''
    document.getElementById('edit-hp').value = user.hp || ''
    document.getElementById('edit-kota').value = user.kota || ''
    editModal.classList.add('is-open')
  })
  document.getElementById('close-edit-modal-btn')?.addEventListener('click', () => editModal.classList.remove('is-open'))
  document.getElementById('cancel-edit-modal-btn')?.addEventListener('click', () => editModal.classList.remove('is-open'))

  document.getElementById('open-change-pw-btn')?.addEventListener('click', () => {
    document.getElementById('pw-current').value = ''
    document.getElementById('pw-new').value = ''
    document.getElementById('pw-confirm').value = ''
    pwModal.classList.add('is-open')
  })
  document.getElementById('close-pw-modal-btn')?.addEventListener('click', () => pwModal.classList.remove('is-open'))
  document.getElementById('cancel-pw-modal-btn')?.addEventListener('click', () => pwModal.classList.remove('is-open'))

  // Save profile
  document.getElementById('edit-profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const nama = document.getElementById('edit-nama').value.trim()
    const hp = document.getElementById('edit-hp').value.trim()
    const kota = document.getElementById('edit-kota').value.trim()
    const btn = document.getElementById('save-profile-btn')

    if (nama.length < 3) {
      showToast('Nama minimal 3 karakter.', 'danger')
      return
    }

    btn.disabled = true
    btn.textContent = 'Menyimpan…'

    try {
      const res = await api('/me', {
        method: 'PUT',
        body: { nama, hp, kota },
      })
      const u = (res && (res.user || res.me)) ? (res.user || res.me) : { ...user, nama, hp, kota }
      user = u
      localStorage.setItem('pinjamin.user', JSON.stringify(user))
      populateUserData(user)
      Auth.renderShell('profile', user)
      showToast('Profil berhasil diperbarui', 'success')
      editModal.classList.remove('is-open')
    } catch (err) {
      showToast(err.message || 'Gagal menyimpan profil', 'danger')
    } finally {
      btn.disabled = false
      btn.textContent = 'Simpan'
    }
  })

  // Change password
  document.getElementById('change-pw-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const currentPassword = document.getElementById('pw-current').value
    const newPassword = document.getElementById('pw-new').value
    const confirmPassword = document.getElementById('pw-confirm').value
    const btn = document.getElementById('save-pw-btn')

    if (newPassword.length < 6) {
      showToast('Password baru minimal 6 karakter.', 'danger')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'danger')
      return
    }

    btn.disabled = true
    btn.textContent = 'Menyimpan…'

    try {
      await api('/me/password', {
        method: 'POST',
        body: { current: currentPassword, password: newPassword },
      })
      showToast('Password berhasil diubah', 'success')
      pwModal.classList.remove('is-open')
    } catch (err) {
      showToast(err.message || 'Gagal mengganti password', 'danger')
    } finally {
      btn.disabled = false
      btn.textContent = 'Ganti Password'
    }
  })

  // Photo upload with canvas center-crop
  const fileInput = document.getElementById('avatar-file-input')
  const uploadBtn = document.getElementById('btn-upload-photo')
  const changeAvatarBtn = document.getElementById('change-avatar-btn')
  const removePhotoBtn = document.getElementById('btn-remove-photo')

  uploadBtn?.addEventListener('click', () => fileInput.click())
  changeAvatarBtn?.addEventListener('click', () => fileInput.click())

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    fileInput.value = ''

    uploadBtn.disabled = true
    showToast('Memproses foto…', 'info')

    try {
      const croppedBase64 = await centerCropImage(file, 240, 240)
      const res = await api('/photos', {
        method: 'POST',
        body: { dataUrl: croppedBase64, purpose: 'avatar' },
      }).catch(() => null)

      const photoUrl = (res && res.url) ? res.url : croppedBase64
      const resPut = await api('/me', {
        method: 'PUT',
        body: { foto: photoUrl },
      })
      const u = (resPut && (resPut.user || resPut.me)) ? (resPut.user || resPut.me) : { ...user, foto: photoUrl }
      user = u
      localStorage.setItem('pinjamin.user', JSON.stringify(user))
      populateUserData(user)
      Auth.renderShell('profile', user)
      showToast('Foto profil diperbarui', 'success')
    } catch (err) {
      showToast(err.message || 'Gagal mengunggah foto', 'danger')
    } finally {
      uploadBtn.disabled = false
    }
  })

  removePhotoBtn?.addEventListener('click', async () => {
    if (!confirm('Hapus foto profil?')) return
    try {
      const resPut = await api('/me', {
        method: 'PUT',
        body: { foto: '' },
      })
      const u = (resPut && (resPut.user || resPut.me)) ? (resPut.user || resPut.me) : { ...user, foto: '' }
      user = u
      localStorage.setItem('pinjamin.user', JSON.stringify(user))
      populateUserData(user)
      Auth.renderShell('profile', user)
      showToast('Foto profil dihapus', 'success')
    } catch (err) {
      showToast(err.message || 'Gagal menghapus foto', 'danger')
    }
  })

  // Appearance: theme mode, wallpaper, blur & glass panels
  initAppearanceSettings()

  // Logout button
  document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
    if (confirm('Yakin ingin keluar dari akun kamu?')) {
      Auth.logout()
    }
  })
})

function populateUserData(u) {
  document.getElementById('user-name-title').textContent = u.nama || 'Pengguna'
  const rolePill = document.getElementById('user-role-pill')
  rolePill.textContent = u.role || 'Mahasiswa'

  document.getElementById('meta-nim').textContent = u.nim_nip || '-'
  document.getElementById('meta-email').textContent = u.email || '-'
  document.getElementById('meta-role').textContent = u.role || '-'
  document.getElementById('meta-hp').textContent = u.hp || '—'
  document.getElementById('meta-kota').textContent = u.kota || '—'

  const avatarBox = document.getElementById('profile-avatar-box')
  const removeBtn = document.getElementById('btn-remove-photo')

  if (u.foto) {
    avatarBox.innerHTML = `<img src="${u.foto}" alt="${u.nama}">`
    removeBtn.style.display = 'inline-flex'
  } else {
    const initials = (u.nama || 'U').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    avatarBox.textContent = initials
    removeBtn.style.display = 'none'
  }
}

/**
 * Center-crop image into a square with HTML5 Canvas and compress to JPEG Base64
 */
function centerCropImage(file, targetW, targetH) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = targetW
        canvas.height = targetH
        const ctx = canvas.getContext('2d')

        const s = Math.min(img.width, img.height)
        const sx = (img.width - s) / 2
        const sy = (img.height - s) / 2

        ctx.drawImage(img, sx, sy, s, s, 0, 0, targetW, targetH)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

/* --------------------------------------------------------------------------
   Appearance settings (Tampilan Aplikasi)
   -------------------------------------------------------------------------- */
function initAppearanceSettings() {
  const Theme = window.Theme
  if (!Theme) return

  const $ = (id) => document.getElementById(id)
  const themeBtns = document.querySelectorAll('#theme-segmented .segmented-btn')
  const wallOptions = document.querySelectorAll('#wallpaper-picker .wallpaper-option')
  const colorModeBtns = document.querySelectorAll('#wall-color-mode .segmented-btn')
  const fileInput = $('wallpaper-file-input')
  const colorA = $('wall-color-a')
  const colorB = $('wall-color-b')
  const blurRange = $('wall-blur-range')
  const glassToggle = $('wall-glass-toggle')

  // Static icons inside the picker
  document.querySelectorAll('#wallpaper-picker [data-icon]').forEach((el) => {
    const isCheck = el.classList.contains('wallpaper-check')
    el.insertAdjacentHTML('afterbegin', renderIcon(el.dataset.icon, { size: isCheck ? 11 : 18, stroke: isCheck ? 3 : 2 }))
  })

  const isColorWall = (id) => id === 'solid' || id === 'gradient'

  function sync() {
    const theme = Theme.getTheme()
    themeBtns.forEach((b) => {
      const on = b.dataset.theme === theme
      b.classList.toggle('is-active', on)
      b.setAttribute('aria-checked', String(on))
    })

    const w = Theme.getWallpaper()
    const selected = isColorWall(w.id) ? 'color' : w.id
    wallOptions.forEach((o) => {
      const on = o.dataset.wall === selected
      o.classList.toggle('is-active', on)
      o.setAttribute('aria-checked', String(on))
    })

    // Color tile + panel
    const mode = w.id === 'solid' ? 'solid' : 'gradient'
    const a = w.color || '#0A84FF'
    const b = w.color2 || '#8E7CFF'
    $('wall-color-thumb').style.background = w.id === 'solid' ? a : `linear-gradient(135deg, ${a}, ${b})`
    colorA.value = a
    colorB.value = b
    $('wall-color-a-hex').textContent = a
    $('wall-color-b-hex').textContent = b
    $('wall-color-b-field').style.display = mode === 'solid' ? 'none' : ''
    colorModeBtns.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.mode === mode))
    $('wall-color-panel').hidden = selected !== 'color'

    // Image tile + panel
    const img = Theme.getWallpaperImage()
    const imageThumb = $('wall-image-thumb')
    if (img) {
      imageThumb.style.backgroundImage = `url("${img}")`
      imageThumb.querySelector('.wallpaper-upload-icon')?.remove()
      $('wall-image-preview').style.backgroundImage = `url("${img}")`
    } else {
      imageThumb.style.backgroundImage = ''
      if (!imageThumb.querySelector('.wallpaper-upload-icon')) {
        imageThumb.insertAdjacentHTML('afterbegin', `<span class="wallpaper-upload-icon">${renderIcon('plus', { size: 18 })}</span>`)
      }
    }
    $('wall-image-panel').hidden = selected !== 'image'

    // Effects only make sense on top of a wallpaper
    const hasWall = w.id !== 'default'
    blurRange.value = String(w.blur)
    blurRange.disabled = !hasWall
    blurRange.style.setProperty('--fill', `${(w.blur / 24) * 100}%`)
    $('wall-blur-value').textContent = `${w.blur} px`
    glassToggle.checked = w.glass
    glassToggle.disabled = !hasWall
    $('wall-effects').classList.toggle('effects-disabled', !hasWall)
    $('wall-effects-hint').style.display = hasWall ? 'none' : ''
  }

  // Theme mode
  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => Theme.setTheme(btn.dataset.theme))
  })

  // Wallpaper tiles
  wallOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      const id = opt.dataset.wall
      if (id === 'color') {
        const w = Theme.getWallpaper()
        if (!isColorWall(w.id)) Theme.setWallpaper({ id: w.lastColorMode || 'gradient' })
        return
      }
      if (id === 'image') {
        if (Theme.getWallpaperImage()) Theme.setWallpaper({ id: 'image' })
        else fileInput.click()
        return
      }
      Theme.setWallpaper({ id })
    })
  })

  // Solid / gradient
  colorModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => Theme.setWallpaper({ id: btn.dataset.mode, lastColorMode: btn.dataset.mode }))
  })
  colorA.addEventListener('input', () => Theme.setWallpaper({ color: colorA.value.toUpperCase() }))
  colorB.addEventListener('input', () => Theme.setWallpaper({ color2: colorB.value.toUpperCase() }))

  // Photo upload
  $('wall-image-replace').addEventListener('click', () => fileInput.click())
  $('wall-image-remove').addEventListener('click', () => {
    Theme.removeWallpaperImage()
    showToast('Foto latar dihapus', 'info')
  })
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0]
    fileInput.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar', 'danger')
      return
    }
    try {
      const { dataUrl, tone } = await prepareWallpaperImage(file)
      if (!Theme.setWallpaperImage(dataUrl)) {
        showToast('Penyimpanan browser penuh. Coba foto yang lebih kecil.', 'danger')
        return
      }
      Theme.setWallpaper({ id: 'image', tone })
      showToast('Foto latar diterapkan', 'success')
    } catch {
      showToast('Gagal memproses gambar', 'danger')
    }
  })

  // Blur (live) & glass
  blurRange.addEventListener('input', () => {
    const blur = Number(blurRange.value)
    blurRange.style.setProperty('--fill', `${(blur / 24) * 100}%`)
    $('wall-blur-value').textContent = `${blur} px`
    Theme.setWallpaper({ blur })
  })
  glassToggle.addEventListener('change', () => Theme.setWallpaper({ glass: glassToggle.checked }))

  window.addEventListener('pinjamin:themechange', sync)
  sync()
}

/**
 * Downscale an uploaded photo for localStorage and detect whether it's mostly dark or light.
 */
function prepareWallpaperImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.onload = () => {
      URL.revokeObjectURL(url)
      const encode = (maxSide, quality) => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        return canvas.toDataURL('image/jpeg', quality)
      }

      // Keep the stored string comfortably within localStorage limits (~2 MB).
      let dataUrl = encode(1920, 0.82)
      if (dataUrl.length > 2_000_000) dataUrl = encode(1440, 0.72)
      if (dataUrl.length > 2_000_000) dataUrl = encode(1080, 0.65)

      const sample = document.createElement('canvas')
      sample.width = 24
      sample.height = 24
      const ctx = sample.getContext('2d')
      ctx.drawImage(img, 0, 0, 24, 24)
      const px = ctx.getImageData(0, 0, 24, 24).data
      let sum = 0
      for (let i = 0; i < px.length; i += 4) sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]
      const avg = sum / (px.length / 4) / 255

      resolve({ dataUrl, tone: avg < 0.45 ? 'dark' : 'light' })
    }
    img.src = url
  })
}
