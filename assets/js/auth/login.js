/**
 * Pinjam.in - Auth Screen Controller
 * Strictly accepts identifier (email / NIM / NIP) and password, submitting to POST /auth/login.
 */

import { api, isCampusEmail, showToast } from '../core/api.js'
import { renderIcon } from '../core/icons.js'
import { url, homeFor } from '../core/routes.js'

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect based on role
  const existingUser = localStorage.getItem('pinjamin.user')
  const existingToken = localStorage.getItem('pinjamin.token')
  if (existingUser && existingToken) {
    try {
      const u = JSON.parse(existingUser)
      window.location.href = homeFor(u.role)
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

  // Render eye toggle icon
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

  const clearErrors = () => {
    idError.style.display = 'none'
    pwError.style.display = 'none'
    idInput.classList.remove('input-error')
    pwInput.classList.remove('input-error')
    errorBanner.style.display = 'none'
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    clearErrors()

    const id = idInput.value.trim()
    const password = pwInput.value

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

    if (!password) {
      pwError.textContent = 'Password wajib diisi.'
      pwError.style.display = 'flex'
      pwInput.classList.add('input-error')
      hasError = true
    } else if (password.length < 6) {
      pwError.textContent = 'Password minimal 6 karakter.'
      pwError.style.display = 'flex'
      pwInput.classList.add('input-error')
      hasError = true
    }

    if (hasError) return

    submitBtn.disabled = true
    btnText.innerHTML = '<span class="spinner"></span> Memproses…'
    errorBanner.style.display = 'none'

    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: { id, password },
      })

      if (res && res.user && res.session) {
        localStorage.setItem('pinjamin.token', res.session.access_token)
        localStorage.setItem('pinjamin.session', JSON.stringify(res.session))
        localStorage.setItem('pinjamin.user', JSON.stringify(res.user))

        showToast(`Selamat datang, ${res.user.nama}!`, 'success')

        setTimeout(() => {
          if (res.user.role === 'Admin') {
            window.location.href = url('adminDashboard')
          } else {
            window.location.href = url('catalog')
          }
        }, 300)
      } else {
        throw new Error('Format respons server tidak sesuai.')
      }
    } catch (error) {
      const msg = error.message || 'Gagal masuk. Periksa kembali kredensial kamu.'
      errorMessage.textContent = msg
      errorBanner.style.display = 'flex'
      showToast(msg, 'danger')
    } finally {
      submitBtn.disabled = false
      btnText.textContent = 'Masuk'
    }
  })
})
