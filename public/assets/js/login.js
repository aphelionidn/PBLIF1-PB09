/**
 * Pinjam.in - Auth Screen Controller
 * Handles user login, validation, demo account filling, and redirects.
 */

import { api, isCampusEmail, showToast } from './api.js'
import { renderIcon } from './icons.js'

// Pre-seed demo accounts from data.ts
const DEMO_USERS = {
  mhs: { id: '3312601001', pw: 'pinjamin123', name: 'Budi Santoso', role: 'Mahasiswa' },
  dos: { id: '198501012010', pw: 'pinjamin123', name: 'Dr. Siti Rahma', role: 'Dosen' },
  adm: { id: '3312601048', pw: 'pinjamin123', name: 'Admin 3312601048', role: 'Admin' },
}

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect
  const existingUser = localStorage.getItem('pinjamin.user')
  const existingToken = localStorage.getItem('pinjamin.token')
  if (existingUser && existingToken) {
    try {
      const u = JSON.parse(existingUser)
      window.location.href = u.role === 'Admin' ? 'admin-items.html' : 'catalog.html'
      return
    } catch {
      // invalid stored user
    }
  }

  const form = document.getElementById('login-form')
  const idInput = document.getElementById('login-id')
  const pwInput = document.getElementById('login-pw')
  const idError = document.getElementById('id-error')
  const pwError = document.getElementById('pw-error')
  const errorBanner = document.getElementById('error-banner')
  const errorMessage = document.getElementById('error-message')
  const submitBtn = document.getElementById('submit-btn')
  const btnText = document.getElementById('btn-text')
  const togglePwBtn = document.getElementById('toggle-pw-btn')
  const eyeIcon = document.getElementById('eye-icon')

  // Render initial eye icon
  let showPw = false
  const updateEyeIcon = () => {
    eyeIcon.innerHTML = renderIcon(showPw ? 'eyeOff' : 'eye', { size: 18 })
  }
  updateEyeIcon()

  togglePwBtn.addEventListener('click', () => {
    showPw = !showPw
    pwInput.type = showPw ? 'text' : 'password'
    updateEyeIcon()
  })

  // Quick Demo fill buttons
  document.getElementById('demo-mhs').addEventListener('click', () => {
    idInput.value = DEMO_USERS.mhs.id
    pwInput.value = DEMO_USERS.mhs.pw
    clearErrors()
    submitLogin(DEMO_USERS.mhs.id, DEMO_USERS.mhs.pw)
  })

  document.getElementById('demo-dos').addEventListener('click', () => {
    idInput.value = DEMO_USERS.dos.id
    pwInput.value = DEMO_USERS.dos.pw
    clearErrors()
    submitLogin(DEMO_USERS.dos.id, DEMO_USERS.dos.pw)
  })

  document.getElementById('demo-adm').addEventListener('click', () => {
    idInput.value = DEMO_USERS.adm.id
    pwInput.value = DEMO_USERS.adm.pw
    clearErrors()
    submitLogin(DEMO_USERS.adm.id, DEMO_USERS.adm.pw)
  })

  const clearErrors = () => {
    idError.style.display = 'none'
    pwError.style.display = 'none'
    idInput.classList.remove('input-error')
    pwInput.classList.remove('input-error')
    errorBanner.style.display = 'none'
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    clearErrors()

    const id = idInput.value.trim()
    const pw = pwInput.value

    let hasError = false

    if (!id) {
      idError.textContent = 'Email atau NIM/NIP wajib diisi.'
      idError.style.display = 'flex'
      idInput.classList.add('input-error')
      hasError = true
    } else if (id.includes('@') && !isCampusEmail(id)) {
      idError.textContent = 'Gunakan email resmi @polibatam.ac.id.'
      idError.style.display = 'flex'
      idInput.classList.add('input-error')
      hasError = true
    }

    if (!pw) {
      pwError.textContent = 'Password wajib diisi.'
      pwError.style.display = 'flex'
      pwInput.classList.add('input-error')
      hasError = true
    } else if (pw.length < 6) {
      pwError.textContent = 'Password minimal 6 karakter.'
      pwError.style.display = 'flex'
      pwInput.classList.add('input-error')
      hasError = true
    }

    if (hasError) return

    submitLogin(id, pw)
  })

  async function submitLogin(id, password) {
    submitBtn.disabled = true
    btnText.innerHTML = '<span class="spinner"></span> Memproses…'
    errorBanner.style.display = 'none'

    try {
      let res
      try {
        res = await api('/auth/login', { body: { id, password } })
      } catch (err) {
        // If network issue or server cold-boot fails, check against seeded demo accounts as offline fallback
        const match = Object.values(DEMO_USERS).find(
          (u) => (u.id.toLowerCase() === id.toLowerCase() || id.toLowerCase().includes(u.id)) && password === u.pw
        )
        if (match) {
          res = {
            session: { access_token: 'demo-token-' + Date.now(), refresh_token: 'demo-refresh' },
            user: {
              id: 'u-' + match.id,
              nama: match.name,
              nim_nip: match.id,
              email: match.id + '@students.polibatam.ac.id',
              role: match.role,
              aktif: true,
            },
          }
        } else {
          throw err
        }
      }

      if (res && res.user && res.session) {
        localStorage.setItem('pinjamin.token', res.session.access_token)
        localStorage.setItem('pinjamin.session', JSON.stringify(res.session))
        localStorage.setItem('pinjamin.user', JSON.stringify(res.user))

        showToast(`Selamat datang, ${res.user.nama}!`, 'success')

        setTimeout(() => {
          if (res.user.role === 'Admin') {
            window.location.href = 'admin-items.html'
          } else {
            window.location.href = 'catalog.html'
          }
        }, 350)
      }
    } catch (error) {
      errorMessage.textContent = error.message || 'Gagal masuk. Periksa kembali kredensial kamu.'
      errorBanner.style.display = 'flex'
      showToast(error.message || 'Gagal masuk', 'danger')
    } finally {
      submitBtn.disabled = false
      btnText.textContent = 'Masuk'
    }
  }
})
