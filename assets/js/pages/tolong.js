/**
 * Pinjam.in - Tolong.in (Help Desk) Screen Controller
 * 1:1 match with React Tolong.tsx
 */

import { api, showToast } from '../core/api.js'
import { Auth } from '../core/auth.js'
import { renderIcon } from '../core/icons.js'

let currentUser = null
let allTickets = []
let activeTicketId = null
let currentFilter = 'semua'
let searchQuery = ''
let pollInterval = null

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = Auth.requireAuth()
  if (!currentUser) return

  Auth.renderShell('tolong', currentUser)

  const isStudentOrLecturer = currentUser.role !== 'Admin'
  const newTicketBtn = document.getElementById('new-ticket-btn')
  if (isStudentOrLecturer && newTicketBtn) {
    newTicketBtn.style.display = 'inline-flex'
  }

  // Bind new ticket modal
  const modal = document.getElementById('new-ticket-modal')
  const openModal = () => { modal.classList.add('is-open') }
  const closeModal = () => { modal.classList.remove('is-open') }

  newTicketBtn?.addEventListener('click', openModal)
  document.getElementById('close-new-modal-btn')?.addEventListener('click', closeModal)
  document.getElementById('cancel-new-modal-btn')?.addEventListener('click', closeModal)

  document.getElementById('new-ticket-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const subjInput = document.getElementById('ticket-subject-input')
    const msgInput = document.getElementById('ticket-msg-input')
    const submitBtn = document.getElementById('submit-ticket-btn')

    const subject = subjInput.value.trim()
    const message = msgInput.value.trim()

    if (subject.length < 3 || message.length < 3) {
      showToast('Subjek dan pesan minimal 3 karakter.', 'danger')
      return
    }

    submitBtn.disabled = true
    submitBtn.textContent = 'Mengirim…'

    try {
      await api('/chats', {
        method: 'POST',
        body: { subject, message },
      })
      showToast('Tiket bantuan berhasil dikirim ke Admin', 'success')
      subjInput.value = ''
      msgInput.value = ''
      closeModal()
      await loadTickets()
    } catch (err) {
      showToast(err.message || 'Gagal mengirim tiket', 'danger')
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = 'Kirim Tiket'
    }
  })

  // Search and filter chips
  document.getElementById('ticket-search')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim()
    renderTicketsList()
  })

  document.querySelectorAll('#ticket-filters .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#ticket-filters .chip').forEach((c) => c.classList.remove('is-active'))
      chip.classList.add('is-active')
      currentFilter = chip.getAttribute('data-status')
      renderTicketsList()
    })
  })

  // Send message in active chat
  const chatInput = document.getElementById('chat-input')
  const sendBtn = document.getElementById('send-msg-btn')

  const sendMessage = async () => {
    if (!activeTicketId) return
    const text = chatInput.value.trim()
    if (!text) return

    sendBtn.disabled = true
    try {
      await api(`/chats/${activeTicketId}/messages`, {
        method: 'POST',
        body: { text },
      })
      chatInput.value = ''
      await loadTickets(true)
    } catch (err) {
      showToast(err.message || 'Gagal mengirim pesan', 'danger')
    } finally {
      sendBtn.disabled = false
    }
  }

  sendBtn?.addEventListener('click', sendMessage)
  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  })

  // Toggle ticket status
  document.getElementById('toggle-status-btn')?.addEventListener('click', async () => {
    const ticket = allTickets.find((t) => t.id === activeTicketId)
    if (!ticket) return

    const nextStatus = ticket.status === 'Terbuka' ? 'Selesai' : 'Terbuka'
    try {
      await api(`/chats/${ticket.id}/status`, {
        method: 'POST',
        body: { status: nextStatus },
      })
      ticket.status = nextStatus
      showToast(nextStatus === 'Selesai' ? 'Tiket ditandai selesai' : 'Tiket dibuka kembali', 'success')
      renderActiveChat()
      renderTicketsList()
    } catch (err) {
      showToast(err.message || 'Gagal mengubah status', 'danger')
    }
  })

  // Mobile Back button
  document.getElementById('back-to-tickets-btn')?.addEventListener('click', () => {
    document.getElementById('tickets-panel').style.display = 'flex'
    document.getElementById('chat-panel').style.display = 'none'
  })

  await loadTickets()

  // Poll for updates every 6 seconds
  pollInterval = setInterval(() => {
    loadTickets(true)
  }, 6000)
})

window.addEventListener('beforeunload', () => {
  if (pollInterval) clearInterval(pollInterval)
})

async function loadTickets(silent = false) {
  const loadingEl = document.getElementById('tickets-loading')
  try {
    const state = await api('/state')
    allTickets = state.chats || []

    if (!silent && loadingEl) {
      loadingEl.style.display = 'none'
    }

    renderTicketsList()
    if (activeTicketId) {
      renderActiveChat()
    }
  } catch (error) {
    if (!silent && loadingEl) {
      loadingEl.innerHTML = `<p style="color: var(--c-danger);">${error.message || 'Gagal memuat tiket.'}</p>`
    }
  }
}

function renderTicketsList() {
  const listEl = document.getElementById('tickets-list')
  const emptyEl = document.getElementById('tickets-empty')

  const filtered = allTickets.filter((t) => {
    if (currentFilter !== 'semua' && t.status !== currentFilter) return false
    if (searchQuery) {
      const matchSubject = (t.subject || '').toLowerCase().includes(searchQuery)
      const matchBy = (t.by || '').toLowerCase().includes(searchQuery)
      const matchLast = (t.messages?.[t.messages.length - 1]?.text || '').toLowerCase().includes(searchQuery)
      return matchSubject || matchBy || matchLast
    }
    return true
  })

  if (filtered.length === 0) {
    emptyEl.style.display = 'block'
    listEl.innerHTML = ''
    return
  }

  emptyEl.style.display = 'none'

  listEl.innerHTML = filtered
    .map((t) => {
      const isSel = t.id === activeTicketId
      const lastMsg = t.messages?.[t.messages.length - 1]
      const unreadCount = (t.messages || []).filter(
        (m) => m.userId !== currentUser.id && !(m.readBy || []).includes(currentUser.id)
      ).length

      const isResolved = t.status === 'Selesai'
      const statusTone = isResolved ? 'pill-green' : 'pill-blue'

      return `
        <button type="button" class="ticket-item ${isSel ? 'is-selected' : ''}" data-ticket-id="${t.id}">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;">
            <span class="pill ${statusTone}" style="font-size: 0.6875rem;">${t.status}</span>
            <span style="font-size: 0.75rem; color: var(--c-ink-2);">${t.updatedAt ? t.updatedAt.slice(0, 10) : ''}</span>
          </div>
          <p style="font-size: 0.9375rem; font-weight: 600; color: var(--c-ink); margin: 0; line-height: 1.3;" class="truncate">${t.subject}</p>
          <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8125rem; color: var(--c-ink-2); margin-top: 0.25rem;">
            <span class="truncate">${lastMsg ? lastMsg.text : 'Belum ada pesan'}</span>
            ${unreadCount > 0 ? `<span class="icon-badge" style="position: static;">${unreadCount}</span>` : ''}
          </div>
        </button>
      `
    })
    .join('')

  listEl.querySelectorAll('.ticket-item').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activeTicketId = btn.getAttribute('data-ticket-id')
      renderTicketsList()
      renderActiveChat()

      // On mobile switch to chat panel
      if (window.innerWidth < 1024) {
        document.getElementById('tickets-panel').style.display = 'none'
        document.getElementById('chat-panel').style.display = 'flex'
      }

      // Mark ticket as read
      try {
        await api('/chats/read', { method: 'POST', body: { ticketIds: [activeTicketId] } })
        Auth.syncBadges()
      } catch {
        // ignore
      }
    })
  })
}

function renderActiveChat() {
  const emptyState = document.getElementById('chat-empty-state')
  const contentState = document.getElementById('active-chat-content')

  const ticket = allTickets.find((t) => t.id === activeTicketId)
  if (!ticket) {
    emptyState.style.display = 'block'
    contentState.style.display = 'none'
    return
  }

  emptyState.style.display = 'none'
  contentState.style.display = 'flex'

  document.getElementById('ticket-subject-title').textContent = ticket.subject
  const pill = document.getElementById('ticket-status-pill')
  pill.textContent = ticket.status
  pill.className = `pill ${ticket.status === 'Selesai' ? 'pill-green' : 'pill-blue'}`

  const authorEl = document.getElementById('ticket-author-info')
  authorEl.textContent = `oleh ${ticket.by || 'Pengguna'} (${ticket.role || 'Mahasiswa'})`

  const toggleBtn = document.getElementById('toggle-status-btn')
  toggleBtn.textContent = ticket.status === 'Terbuka' ? 'Tandai Selesai' : 'Buka Kembali'

  const stream = document.getElementById('messages-stream')
  stream.innerHTML = (ticket.messages || [])
    .map((m) => {
      const isMine = m.userId === currentUser.id
      return `
        <div class="msg-bubble ${isMine ? 'msg-mine' : 'msg-other'}">
          ${!isMine ? `<div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem; opacity: 0.85;">${m.by || 'Admin'}</div>` : ''}
          <div>${escapeHtml(m.text)}</div>
          <div style="font-size: 0.6875rem; margin-top: 0.25rem; text-align: right; opacity: 0.75;">
            ${m.at ? m.at.slice(11, 16) : ''}
          </div>
        </div>
      `
    })
    .join('')

  // Scroll to bottom
  setTimeout(() => {
    stream.scrollTop = stream.scrollHeight
  }, 50)
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>')
}
