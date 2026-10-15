const icons = {
  box: '<svg viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  calendar: '<svg viewBox="0 0 24 24"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg>',
  bell: '<svg viewBox="0 0 24 24"><path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4zM10 20.5a2 2 0 0 0 4 0"/></svg>',
  user: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0"/></svg>',
  users: '<svg viewBox="0 0 24 24"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 11a4 4 0 0 0 0-8M22 21a7 7 0 0 0-4-6.3"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24"><path d="M9 3h6v3H9zM7 4.5H5V21h14V4.5h-2M9 12l2 2 4-4"/></svg>',
  return: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2M10 20.5h.01M17 20.5h.01"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z"/></svg>',
  monitor: '<svg viewBox="0 0 24 24"><path d="M3 5h18v11H3zM8 20h8M12 16v4"/></svg>',
  cable: '<svg viewBox="0 0 24 24"><path d="M7 3v5M11 3v5M5 8h8v4a4 4 0 0 1-8 0zM9 16v2a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V5"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M15 4l5 5L9 20H4v-5z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
}

const storage = {
  get(key, fallback = "") {
    try {
      return localStorage.getItem(key) ?? fallback
    } catch {
      return fallback
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Demo tetap berfungsi bila penyimpanan lokal diblokir browser.
    }
  },
}

function renderIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((element) => {
    element.innerHTML = icons[element.dataset.icon] || icons.box
  })
}

function normalize(value) {
  return String(value || "").trim().toLowerCase()
}

function applyFilter(scope) {
  if (!scope) return
  const active = scope.querySelector("[data-filter].active")
  const filter = active?.dataset.filter || "semua"
  const query = normalize(scope.querySelector("[data-filter-search]")?.value)
  let visible = 0

  scope.querySelectorAll("[data-filter-item]").forEach((item) => {
    const category = normalize(item.dataset.category)
    const favorite = item.querySelector("[data-favorite]")?.classList.contains("active")
    const categoryMatch = filter === "semua" || (filter === "favorit" ? favorite : category.includes(filter))
    const queryMatch = !query || normalize(item.textContent).includes(query)
    item.hidden = !(categoryMatch && queryMatch)
    if (!item.hidden) visible += 1
  })

  const empty = scope.querySelector("[data-filter-empty]")
  if (empty) empty.hidden = visible > 0
}

document.body.classList.toggle("dark", storage.get("pinjaminDemoDark") === "true")
document.body.classList.toggle("performance", storage.get("pinjaminDemoPerformance", "true") === "true")
renderIcons()

document.querySelectorAll("[data-filter-scope]").forEach((scope) => {
  scope.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      scope.querySelectorAll("[data-filter]").forEach((candidate) => candidate.classList.remove("active"))
      button.classList.add("active")
      applyFilter(scope)
    })
  })
  scope.querySelector("[data-filter-search]")?.addEventListener("input", () => applyFilter(scope))
  applyFilter(scope)
})

document.querySelectorAll("[data-favorite]").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault()
    button.classList.toggle("active")
    button.setAttribute("aria-label", button.classList.contains("active") ? "Hapus dari favorit" : "Tambah ke favorit")
    applyFilter(button.closest("[data-filter-scope]"))
    showToast(button.classList.contains("active") ? "Ditambahkan ke favorit" : "Dihapus dari favorit")
  })
})

document.querySelectorAll("[data-switch]").forEach((button) => {
  const key = button.dataset.switch
  if (key === "dark") button.classList.toggle("on", document.body.classList.contains("dark"))
  if (key === "performance") button.classList.toggle("on", document.body.classList.contains("performance"))
  button.setAttribute("aria-checked", String(button.classList.contains("on")))

  button.addEventListener("click", () => {
    button.classList.toggle("on")
    const enabled = button.classList.contains("on")
    button.setAttribute("aria-checked", String(enabled))
    if (key === "dark") {
      document.body.classList.toggle("dark", enabled)
      storage.set("pinjaminDemoDark", String(enabled))
    }
    if (key === "performance") {
      document.body.classList.toggle("performance", enabled)
      storage.set("pinjaminDemoPerformance", String(enabled))
    }
    if (key === "email") storage.set("pinjaminDemoEmail", String(enabled))
    showToast(`${button.getAttribute("aria-label")} ${enabled ? "diaktifkan" : "dinonaktifkan"}`)
  })
})

document.querySelector("[data-booking-submit]")?.addEventListener("click", () => {
  const start = document.querySelector("#start")?.value
  const end = document.querySelector("#end")?.value
  const purpose = document.querySelector("#purpose")?.value.trim()
  const quantity = document.querySelector("#qty")?.value
  if (!start || !end) return showToast("Pilih tanggal mulai dan kembali")
  if (end < start) return showToast("Tanggal kembali tidak boleh sebelum tanggal mulai")
  if (!purpose) return showToast("Isi keperluan peminjaman terlebih dahulu")
  storage.set("pinjaminDemoBooking", JSON.stringify({ start, end, purpose, quantity }))
  showToast("Booking demo berhasil diajukan")
})

document.querySelector("[data-cart-add]")?.addEventListener("click", () => {
  const count = Number(storage.get("pinjaminDemoCart", "0")) + 1
  storage.set("pinjaminDemoCart", String(count))
  showToast(`Proyektor ditambahkan ke keranjang (${count})`)
})

document.querySelectorAll("[data-cart-button]").forEach((button) => {
  button.addEventListener("click", () => {
    const count = Number(storage.get("pinjaminDemoCart", "0"))
    showToast(count ? `Keranjang demo berisi ${count} barang` : "Keranjang demo masih kosong")
  })
})

document.querySelector("[data-profile-save]")?.addEventListener("click", () => {
  const name = document.querySelector("#name")?.value.trim()
  const city = document.querySelector("#city")?.value.trim()
  if (!name) return showToast("Nama tidak boleh kosong")
  storage.set("pinjaminDemoProfile", JSON.stringify({ name, city }))
  const heading = document.querySelector(".profile-main h2")
  if (heading) heading.textContent = name
  showToast("Profil demo disimpan di browser")
})

function makeButton(label, className, attribute, value = "") {
  const button = document.createElement("button")
  button.className = className
  button.textContent = label
  button.setAttribute(attribute, value)
  return button
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("button")
  if (!target) return

  if (target.dataset.demoAction) showToast(target.dataset.demoAction)

  if (target.matches("[data-edit-row]")) {
    const row = target.closest("tr")
    const nameNode = row?.querySelector("strong")
    const stockNode = row?.children[2]
    const name = window.prompt("Nama barang", nameNode?.textContent || "")
    if (name === null) return
    const stock = window.prompt("Jumlah stok", stockNode?.textContent.replace(/\D/g, "") || "1")
    if (!name.trim() || stock === null || !/^\d+$/.test(stock.trim())) return showToast("Nama atau stok tidak valid")
    nameNode.textContent = name.trim()
    stockNode.textContent = `${Number(stock)} unit`
    showToast("Barang demo diperbarui")
  }

  if (target.matches("[data-delete-row]")) {
    const row = target.closest("tr")
    const scope = target.closest("[data-filter-scope]")
    const name = row?.querySelector("strong")?.textContent || "barang"
    if (window.confirm(`Hapus ${name} dari demo?`)) {
      row.remove()
      applyFilter(scope)
      showToast("Barang demo dihapus")
    }
  }

  if (target.matches("[data-add-item]")) {
    const name = window.prompt("Nama barang baru")
    if (!name?.trim()) return
    const category = window.prompt("Kategori", "Elektronik")
    if (!category?.trim()) return
    const stock = window.prompt("Jumlah stok", "1")
    if (stock === null || !/^\d+$/.test(stock.trim())) return showToast("Jumlah stok tidak valid")

    const row = document.createElement("tr")
    row.dataset.filterItem = ""
    row.dataset.category = normalize(category)
    const values = [name.trim(), category.trim(), `${Number(stock)} unit`]
    values.forEach((value, index) => {
      const cell = document.createElement("td")
      if (index === 0) {
        const strong = document.createElement("strong")
        strong.textContent = value
        cell.appendChild(strong)
      } else {
        cell.textContent = value
      }
      row.appendChild(cell)
    })
    const condition = document.createElement("td")
    condition.innerHTML = '<span class="pill">Baik</span>'
    row.appendChild(condition)
    const actionCell = document.createElement("td")
    const actions = document.createElement("div")
    actions.className = "actions"
    actions.append(makeButton("Edit", "btn secondary small", "data-edit-row"))
    actions.append(makeButton("Hapus", "btn danger small", "data-delete-row"))
    actionCell.appendChild(actions)
    row.appendChild(actionCell)
    document.querySelector("tbody")?.appendChild(row)
    applyFilter(target.closest("[data-filter-scope]"))
    showToast("Barang demo ditambahkan")
  }

  if (target.matches("[data-loan-status]")) {
    const row = target.closest("tr")
    const status = target.dataset.loanStatus
    const label = row?.querySelector("[data-status-label]")
    const actions = row?.querySelector(".actions")
    row.dataset.category = normalize(status)
    label.textContent = status
    label.className = `pill ${status === "Ditolak" ? "danger" : "info"}`
    if (status === "Disetujui") {
      actions.replaceChildren(makeButton("Konfirmasi Ambil", "btn small", "data-loan-status", "Dipinjam"))
    } else if (status === "Dipinjam") {
      actions.replaceChildren(makeButton("Detail", "btn secondary small", "data-demo-action", "Detail peminjaman dibuka"))
    } else {
      actions.textContent = "Selesai diproses"
    }
    applyFilter(target.closest("[data-filter-scope]"))
    showToast(`Status pengajuan menjadi ${status}`)
  }
})

const savedBooking = storage.get("pinjaminDemoBooking")
if (savedBooking && location.pathname.endsWith("loans.html")) {
  try {
    const booking = JSON.parse(savedBooking)
    const list = document.querySelector(".split .list")
    const row = document.createElement("article")
    row.className = "list-row"
    row.dataset.filterItem = ""
    row.dataset.category = "menunggu"
    const icon = document.createElement("span")
    icon.className = "stat-icon icon"
    icon.dataset.icon = "monitor"
    const main = document.createElement("div")
    main.className = "list-main"
    const title = document.createElement("strong")
    title.textContent = "PJ-DEMO · Proyektor Epson"
    const detail = document.createElement("small")
    detail.textContent = `${booking.start}–${booking.end} · ${booking.purpose}`
    main.append(title, detail)
    const status = document.createElement("span")
    status.className = "pill warning"
    status.textContent = "Menunggu"
    row.append(icon, main, status)
    list?.prepend(row)
    renderIcons(row)
    applyFilter(document.querySelector("[data-filter-scope]"))
  } catch {
    // Abaikan data demo lama yang tidak valid.
  }
}

let toastTimer
function showToast(message) {
  let toast = document.querySelector(".toast")
  if (!toast) {
    toast = document.createElement("div")
    toast.className = "toast"
    toast.setAttribute("role", "status")
    document.body.appendChild(toast)
  }
  toast.textContent = message
  toast.classList.add("show")
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200)
}
