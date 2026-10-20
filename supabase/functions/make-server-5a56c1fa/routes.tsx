import { Hono } from "npm:hono"
import { cors } from "npm:hono/cors"
import { logger } from "npm:hono/logger"
import { createClient } from "npm:@supabase/supabase-js@2"
import {
  COLLECTIONS,
  DEFAULT_RULES,
  OCCUPYING,
  addDays,
  availableRange,
  log,
  pushNotif,
  read,
  stamp,
  sweep,
  today,
  uid,
  write,
} from "./logic.tsx"

const app = new Hono()
const P = "/make-server-5a56c1fa"
const URL_ = Deno.env.get("SUPABASE_URL")!
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
const anonClient = () =>
  createClient(URL_, Deno.env.get("SUPABASE_ANON_KEY")!, {
    auth: { persistSession: false },
  })

// Bucket publik untuk foto (barang & profil). Database hanya menyimpan URL pendeknya.
const BUCKET = "pinjamin-photos"
let bucketReady = false
const ensureBucket = async () => {
  if (bucketReady) return
  const { error } = await admin.storage.createBucket(BUCKET, { public: true })
  if (error && !/already exists|already been created|duplicate/i.test(error.message))
    throw new Error(error.message)
  bucketReady = true
}

app.use("*", logger(console.log))
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
)

const isCampusEmail = (e: string) =>
  /^[^\s@]+@([a-z0-9-]+\.)*polibatam\.ac\.id$/i.test(e.trim())
const fail = (c: any, status: number, error: string) =>
  c.json({ error }, status)
const publicUser = (u: any) =>
  u && {
    id: u.id,
    legacyId: u.legacyId,
    nama: u.nama,
    nim_nip: u.nim_nip,
    email: u.email,
    role: u.role,
    aktif: u.aktif,
    hp: u.hp ?? "",
    kota: u.kota ?? "",
    foto: u.foto ?? "",
    lastSeen: u.lastSeen ?? "",
  }

// Tipe notifikasi global (Fase 4)
const NOTIF_TYPES = ["Peringatan", "Pesan", "Info"]
const BROADCAST_KIND: Record<string, string> = {
  Peringatan: "warning",
  Pesan: "info",
  Info: "info",
}

// Tolong.in (Fase 5): tiket bantuan ke Admin. Pengguna hanya melihat tiketnya sendiri.
const CHAT_STATUS = ["Terbuka", "Selesai"]
const visibleChats = (chats: any[], u: any) =>
  u.role === "Admin" ? chats : chats.filter((t) => t.userId === u.id)

// Kota (tingkat kota saja) dari IP, best-effort
const cityOf = async (c: any): Promise<string> => {
  const ip = (c.req.header("x-forwarded-for") ?? "").split(",")[0].trim()
  if (!ip) return "Tidak diketahui"
  try {
    const r = await fetch(`https://ipapi.co/${ip}/city/`, {
      signal: AbortSignal.timeout(1500),
    })
    const t = (await r.text()).trim()
    return r.ok && t && t.length < 60 && !t.startsWith("{")
      ? t
      : "Tidak diketahui"
  } catch {
    return "Tidak diketahui"
  }
}

/** Identitas dari token sesi Supabase. */
const actor = async (c: any) => {
  const token = c.req.header("Authorization")?.split(" ")[1]
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data?.user) return null
  const users = await read<any[]>("users", [])
  const u = users.find((x) => x.id === data.user.id)
  return u?.aktif ? u : null
}
const need = async (c: any, roles?: string[]) => {
  const u = await actor(c)
  if (!u)
    return { res: fail(c, 401, "Sesi tidak valid. Silakan masuk kembali.") }
  if (roles && !roles.includes(u.role))
    return { res: fail(c, 403, "Akses ditolak untuk peran kamu.") }
  return { u }
}

app.get(`${P}/health`, (c) => c.json({ status: "ok" }))

// ---------- Seed (hanya jika kosong) ----------
app.post(`${P}/seed`, async (c) => {
  try {
    if ((await read<any[]>("users", [])).length)
      return c.json({ seeded: false })
    const body = await c.req.json()
    const idMap: Record<string, string> = {}
    const users: any[] = []
    for (const u of body.users ?? []) {
      let { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: body.password ?? "pinjamin123",
        email_confirm: true,
        user_metadata: { nama: u.nama },
      })
      if (error) {
        // Sudah ada di Auth (seed sebelumnya) — pakai id yang ada
        const { data: list } = await admin.auth.admin.listUsers({
          perPage: 1000,
        })
        const ex = list?.users.find((x) => x.email === u.email)
        if (!ex) throw new Error(`Gagal membuat ${u.email}: ${error.message}`)
        data = ({ user: ex } as any)
      }
      idMap[u.id] = data!.user!.id
      users.push({ ...u, id: data!.user!.id, legacyId: u.id, hp: "", kota: "" })
    }
    const remap = (x?: string) => (x && idMap[x]) || x
    await Promise.all([
      write("users", users),
      write("items", body.items ?? []),
      write("categories", body.categories ?? []),
      write(
        "loans",
        (body.loans ?? []).map((l: any) => ({ ...l, userId: remap(l.userId) })),
      ),
      write(
        "notifs",
        (body.notifs ?? []).map((n: any) => ({
          ...n,
          userId: remap(n.userId),
          readBy: [],
        })),
      ),
      write("rules", DEFAULT_RULES),
    ])
    await log({
      actor: "Sistem",
      action: "seed",
      detail: `${users.length} akun dibuat`,
    })
    return c.json({ seeded: true })
  } catch (e) {
    console.error("seed error", e)
    return fail(c, 500, `Seed gagal: ${e instanceof Error ? e.message : e}`)
  }
})

// ---------- Auth ----------
app.post(`${P}/auth/login`, async (c) => {
  try {
    const { id, password } = await c.req.json()
    const ident = String(id ?? "")
      .trim()
      .toLowerCase()
    const [users, kota] = await Promise.all([
      read<any[]>("users", []),
      cityOf(c),
    ])
    if (ident.includes("@") && !isCampusEmail(ident))
      return fail(c, 400, "Gunakan email @polibatam.ac.id.")
    const u = users.find(
      (x) => x.email === ident || x.nim_nip.toLowerCase() === ident,
    )
    if (!u) {
      await log({
        actor: ident || "-",
        action: "login_gagal",
        detail: `Akun tidak ditemukan · ${kota}`,
      })
      return fail(c, 401, "Email/NIM/NIP atau password salah.")
    }
    if (!u.aktif) {
      await log({
        userId: u.id,
        actor: u.nama,
        action: "login_gagal",
        detail: `Akun nonaktif · ${kota}`,
      })
      return fail(c, 403, "Akun ini sedang dinonaktifkan. Hubungi admin.")
    }
    const { data, error } = await anonClient().auth.signInWithPassword({
      email: u.email,
      password,
    })
    if (error || !data.session) {
      await log({
        userId: u.id,
        actor: u.nama,
        action: "login_gagal",
        detail: `Password salah · ${kota}`,
      })
      return fail(c, 401, "Email/NIM/NIP atau password salah.")
    }
    // Catat login terakhir + lokasi (best-effort) agar admin bisa melihat aktivitas terkini.
    const idx = users.findIndex((x) => x.id === u.id)
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        lastSeen: stamp(),
        kota: kota !== "Tidak diketahui" ? kota : (users[idx].kota ?? ""),
      }
      await write("users", users)
    }
    await log({ userId: u.id, actor: u.nama, action: "login", detail: kota })
    return c.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      user: publicUser(users[idx] ?? u),
    })
  } catch (e) {
    console.error("login error", e)
    return fail(c, 500, `Login gagal: ${e instanceof Error ? e.message : e}`)
  }
})

app.post(`${P}/auth/logout`, async (c) => {
  const u = await actor(c)
  if (u) await log({ userId: u.id, actor: u.nama, action: "logout" })
  return c.json({ ok: true })
})

app.get(`${P}/me`, async (c) => {
  const { u, res } = await need(c)
  return res ?? c.json({ user: publicUser(u), favorites: u.favorites ?? null })
})

app.put(`${P}/me`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const b = await c.req.json()
  const nama = String(b.nama ?? "").trim()
  if (nama.length < 3) return fail(c, 400, "Nama minimal 3 karakter.")
  const hp = String(b.hp ?? "").trim()
  if (hp && !/^\+?[0-9 ]{8,16}$/.test(hp))
    return fail(c, 400, "Nomor HP tidak valid.")
  const kota = String(b.kota ?? "")
    .trim()
    .slice(0, 40)
  const users = await read<any[]>("users", [])
  const i = users.findIndex((x) => x.id === u.id)
  // `foto` boleh dikosongkan ("") untuk menghapus foto profil.
  const foto =
    b.foto === undefined
      ? users[i].foto
      : String(b.foto ?? "").trim().slice(0, 600)
  users[i] = { ...users[i], nama, hp, kota, foto }
  await write("users", users)
  await log({ userId: u.id, actor: nama, action: "profil_diubah" })
  return c.json({ user: publicUser(users[i]) })
})

app.post(`${P}/me/password`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const { current, password } = await c.req.json()
  if (String(password ?? "").length < 6)
    return fail(c, 400, "Password baru minimal 6 karakter.")
  const { error: e1 } = await anonClient().auth.signInWithPassword({
    email: u.email,
    password: current,
  })
  if (e1) return fail(c, 400, "Password saat ini salah.")
  const { error } = await admin.auth.admin.updateUserById(u.id, { password })
  if (error) return fail(c, 500, `Gagal mengganti password: ${error.message}`)
  await log({ userId: u.id, actor: u.nama, action: "password_diubah" })
  return c.json({ ok: true })
})

// Keranjang belanja pengguna (disimpan di record user agar bertahan lintas perangkat).
app.put(`${P}/me/cart`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const b = await c.req.json()
  const users = await read<any[]>("users", [])
  const i = users.findIndex((x) => x.id === u.id)
  if (i < 0) return fail(c, 404, "Pengguna tidak ditemukan.")
  users[i] = {
    ...users[i],
    cart: Array.isArray(b.cart) ? b.cart : [],
    cartDates: b.cartDates ?? null,
  }
  await write("users", users)
  return c.json({ ok: true })
})

// Favorit barang pengguna (disimpan di record user, lintas perangkat).
const MAX_FAVORITES = 200
app.put(`${P}/me/favorites`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const b = await c.req.json().catch(() => null)
  if (
    !b ||
    !Array.isArray(b.favorites) ||
    b.favorites.length > MAX_FAVORITES ||
    !b.favorites.every((x: unknown) => typeof x === "string" && x.length > 0 && x.length <= 64)
  )
    return fail(c, 400, "Daftar favorit tidak valid.")
  const items = await read<any[]>("items", [])
  const valid = new Set(items.map((x) => x.id))
  // Buang duplikat dan barang yang sudah tidak ada.
  const favorites = [...new Set<string>(b.favorites)].filter((x) => valid.has(x))
  const users = await read<any[]>("users", [])
  const i = users.findIndex((x) => x.id === u.id)
  if (i < 0) return fail(c, 404, "Pengguna tidak ditemukan.")
  users[i] = { ...users[i], favorites }
  await write("users", users)
  return c.json({ ok: true, favorites })
})

// ---------- Admin: akun ----------
app.post(`${P}/admin/users`, async (c) => {
  const { u: me, res } = await need(c, ["Admin"])
  if (res) return res
  const b = await c.req.json()
  const users = await read<any[]>("users", [])
  const email = String(b.email ?? "")
    .trim()
    .toLowerCase()
  if (!isCampusEmail(email))
    return fail(c, 400, "Email harus domain polibatam.ac.id.")
  if (users.some((x) => x.email === email))
    return fail(c, 400, "Email sudah dipakai.")
  if (users.some((x) => x.nim_nip === b.nim_nip))
    return fail(c, 400, "NIM/NIP sudah dipakai.")
  if (String(b.password ?? "").length < 6)
    return fail(c, 400, "Password awal minimal 6 karakter.")
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: b.password,
    email_confirm: true,
    user_metadata: { nama: b.nama },
  })
  if (error) return fail(c, 400, `Gagal membuat akun: ${error.message}`)
  const nu = {
    id: data.user.id,
    nama: b.nama,
    nim_nip: b.nim_nip,
    email,
    role: b.role,
    aktif: true,
    hp: "",
    kota: "",
  }
  users.push(nu)
  await write("users", users)
  await log({
    userId: me.id,
    actor: me.nama,
    action: "akun_dibuat",
    target: nu.id,
    detail: `${nu.nama} (${nu.role})`,
  })
  return c.json({ user: publicUser(nu) })
})

app.put(`${P}/users/:id`, async (c) => {
  const { u: me, res } = await need(c, ["Admin"])
  if (res) return res
  const b = await c.req.json()
  const users = await read<any[]>("users", [])
  const i = users.findIndex(
    (x) => x.id === c.req.param("id") || x.legacyId === c.req.param("id"),
  )
  if (i < 0) return fail(c, 404, "Pengguna tidak ditemukan.")
  if (users[i].id === me.id && b.aktif === false)
    return fail(c, 400, "Tidak bisa menonaktifkan akun sendiri.")
  const email = b.email ? String(b.email).toLowerCase() : users[i].email
  if (!isCampusEmail(email))
    return fail(c, 400, "Email harus domain polibatam.ac.id.")
  if (email !== users[i].email) {
    const { error } = await admin.auth.admin.updateUserById(users[i].id, {
      email,
      email_confirm: true,
    })
    if (error) return fail(c, 400, `Gagal mengubah email: ${error.message}`)
  }
  const before = users[i]
  users[i] = {
    ...before,
    ...b,
    email,
    id: before.id,
    legacyId: before.legacyId,
  }
  await write("users", users)
  const changes: string[] = []
  if (before.role !== users[i].role)
    changes.push(`peran: ${before.role} → ${users[i].role}`)
  if (before.aktif !== users[i].aktif)
    changes.push(users[i].aktif ? "diaktifkan" : "dinonaktifkan")
  await log({
    userId: me.id,
    actor: me.nama,
    action: "akun_diubah",
    target: users[i].id,
    detail: `${users[i].nama}${
      changes.length ? " · " + changes.join(", ") : ""
    }`,
  })
  return c.json({ user: publicUser(users[i]) })
})

app.post(`${P}/admin/users/:id/password`, async (c) => {
  const { u: me, res } = await need(c, ["Admin"])
  if (res) return res
  const { password } = await c.req.json()
  if (String(password ?? "").length < 6)
    return fail(c, 400, "Password minimal 6 karakter.")
  const users = await read<any[]>("users", [])
  const t = users.find(
    (x) => x.id === c.req.param("id") || x.legacyId === c.req.param("id"),
  )
  if (!t) return fail(c, 404, "Pengguna tidak ditemukan.")
  const { error } = await admin.auth.admin.updateUserById(t.id, { password })
  if (error) return fail(c, 500, `Gagal reset password: ${error.message}`)
  await log({
    userId: me.id,
    actor: me.nama,
    action: "password_direset",
    target: t.id,
    detail: t.nama,
  })
  const notifs = await read<any[]>("notifs", [])
  pushNotif(notifs, {
    userId: t.id,
    kind: "info",
    title: "Password direset",
    message: `Password akun kamu direset oleh ${me.nama}. Segera ganti di Profil.`,
  })
  await write("notifs", notifs)
  return c.json({ ok: true })
})

// Hapus akun: mencabut akun Auth + data pribadinya (notifikasi, tiket, peminjaman).
app.delete(`${P}/admin/users/:id`, async (c) => {
  const { u: me, res } = await need(c, ["Admin"])
  if (res) return res
  const id = c.req.param("id")
  const users = await read<any[]>("users", [])
  const i = users.findIndex((x) => x.id === id || x.legacyId === id)
  if (i < 0) return fail(c, 404, "Pengguna tidak ditemukan.")
  const target = users[i]
  if (target.id === me.id)
    return fail(c, 400, "Tidak bisa menghapus akun sendiri.")
  const admins = users.filter((x) => x.role === "Admin")
  if (target.role === "Admin" && admins.length <= 1)
    return fail(c, 400, "Minimal harus ada satu akun Admin.")
  const { error } = await admin.auth.admin.deleteUser(target.id)
  if (error && !/not found/i.test(error.message))
    return fail(c, 400, `Gagal menghapus akun: ${error.message}`)
  users.splice(i, 1)
  const [notifs, chats, loans] = await Promise.all([
    read<any[]>("notifs", []),
    read<any[]>("chats", []),
    read<any[]>("loans", []),
  ])
  await Promise.all([
    write("users", users),
    write("notifs", notifs.filter((n) => n.userId !== target.id)),
    write("chats", chats.filter((t) => t.userId !== target.id)),
    write("loans", loans.filter((l) => l.userId !== target.id)),
  ])
  await log({
    userId: me.id,
    actor: me.nama,
    action: "akun_dihapus",
    target: target.id,
    detail: `${target.nama} (${target.role})`,
  })
  return c.json({ ok: true })
})

// ---------- Foto: unggah ke Supabase Storage (URL publik disimpan di KV) ----------
app.post(`${P}/photos`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const b = await c.req.json()
  const kind = b.kind === "item" ? "item" : "avatar"
  if (kind === "item" && u.role !== "Admin")
    return fail(c, 403, "Hanya Admin yang bisa mengunggah foto barang.")
  const m = /^data:(image\/(png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    String(b.dataUrl ?? ""),
  )
  if (!m) return fail(c, 400, "Format gambar tidak didukung (PNG/JPEG/WebP).")
  const mime = m[1] === "image/jpg" ? "image/jpeg" : m[1]
  let bytes: Uint8Array
  try {
    bytes = Uint8Array.from(atob(m[3]), (ch) => ch.charCodeAt(0))
  } catch {
    return fail(c, 400, "Data gambar rusak.")
  }
  if (bytes.length < 64) return fail(c, 400, "Gambar terlalu kecil.")
  if (bytes.length > 3_000_000)
    return fail(c, 400, "Ukuran gambar maksimal 3 MB.")
  try {
    await ensureBucket()
  } catch (e) {
    return fail(c, 500, `Gagal menyiapkan penyimpanan: ${(e as Error).message}`)
  }
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"
  const path = `${kind}/${u.id}-${Date.now().toString(36)}.${ext}`
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: true })
  if (error) return fail(c, 500, `Gagal mengunggah foto: ${error.message}`)
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  await log({
    userId: u.id,
    actor: u.nama,
    action: "foto_diunggah",
    detail: kind === "item" ? "Foto barang" : "Foto profil",
  })
  return c.json({ url: data.publicUrl })
})

// ---------- State & peminjaman (Fase 1) ----------
app.get(`${P}/state`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  await sweep()
  const [users, items, categories, loans, notifs, rules, chats] =
    await Promise.all([
      read<any[]>("users", []),
      read("items", []),
      read("categories", []),
      read<any[]>("loans", []),
      read<any[]>("notifs", []),
      read("rules", DEFAULT_RULES),
      read<any[]>("chats", []),
    ])
  // Denyut kehadiran: perbarui `lastSeen` pengguna yang sedang aktif (maks. tiap 20 detik).
  const nowMs = Date.now()
  const hi = users.findIndex((x) => x.id === u.id)
  if (
    hi >= 0 &&
    (!users[hi].lastSeen || nowMs - Date.parse(users[hi].lastSeen) > 20000)
  ) {
    users[hi] = { ...users[hi], lastSeen: stamp() }
    await write("users", users)
  }
  const mine = notifs
    .filter((n) => n.userId === u.id || n.roles?.includes(u.role))
    .map((n) => ({ ...n, read: n.read || n.readBy?.includes(u.id) }))
  return c.json({
    users: users.map(publicUser),
    items,
    categories,
    loans:
      u.role === "Mahasiswa" ? loans.filter((l) => l.userId === u.id) : loans,
    notifs: mine,
    rules,
    chats: visibleChats(chats, u),
    today: today(),
    me: publicUser(users[hi] ?? u),
    cart: u.cart ?? [],
    cartDates: u.cartDates ?? null,
    // null = belum pernah disimpan di server (klien boleh memigrasikan favorit lokal).
    favorites: Array.isArray(u.favorites)
      ? u.favorites.filter((id: string) => items.some((x: any) => x.id === id))
      : null,
  })
})

app.post(`${P}/loans`, async (c) => {
  const { u, res } = await need(c, ["Mahasiswa", "Dosen"])
  if (res) return res
  const b = await c.req.json()
  const [loans, items, rules, notifs] = await Promise.all([
    read<any[]>("loans", []),
    read<any[]>("items", []),
    read("rules", DEFAULT_RULES),
    read<any[]>("notifs", []),
  ])
  const now = today()
  if (!b.items?.length) return fail(c, 400, "Pilih minimal satu barang.")
  if (!b.keperluan?.trim()) return fail(c, 400, "Keperluan wajib diisi.")
  if (b.start < now || b.start > addDays(now, rules.maxDaysAheadForBooking))
    return fail(
      c,
      400,
      `Tanggal mulai maksimal ${rules.maxDaysAheadForBooking} hari dari sekarang.`,
    )
  if (
    b.end < b.start ||
    b.end > addDays(b.start, rules.maxLoanDurationDays - 1)
  )
    return fail(c, 400, `Durasi maksimal ${rules.maxLoanDurationDays} hari.`)
  const activeTypes = new Set(
    loans
      .filter(
        (l) =>
          l.userId === u.id && ["Menunggu", ...OCCUPYING].includes(l.status),
      )
      .flatMap((l) => l.items.map((i: any) => i.itemId)),
  )
  b.items.forEach((i: any) => activeTypes.add(i.itemId))
  if (activeTypes.size > rules.maxActiveItemTypesPerUser)
    return fail(
      c,
      400,
      `Maksimal ${rules.maxActiveItemTypesPerUser} jenis barang aktif.`,
    )
  for (const i of b.items) {
    const left = availableRange(loans, items, i.itemId, b.start, b.end)
    if (i.qty < 1 || i.qty > left)
      return fail(
        c,
        409,
        `Stok ${items.find((x) => x.id === i.itemId)?.nama ?? i.itemId} tidak cukup (sisa ${left}).`,
      )
  }
  const id = "PJ-" + (1045 + loans.length)
  const loan = {
    id,
    userId: u.id,
    items: b.items.map((i: any) => ({ itemId: i.itemId, qty: i.qty })),
    start: b.start,
    end: b.end,
    keperluan: b.keperluan.trim(),
    status: "Menunggu",
    history: [{ status: "Menunggu", at: stamp(), by: u.nama }],
  }
  loans.unshift(loan)
  pushNotif(notifs, {
    roles: ["Dosen", "Admin"],
    kind: "booking",
    title: "Booking baru masuk",
    message: `${u.nama} mengajukan ${id}.`,
  })
  await Promise.all([write("loans", loans), write("notifs", notifs)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: "booking_dibuat",
    target: id,
  })
  return c.json({ loan })
})

const TRANSITIONS: Record<string, { from: string[]; roles: string[] }> = {
  Disetujui: { from: ["Menunggu"], roles: ["Dosen", "Admin"] },
  Ditolak: { from: ["Menunggu"], roles: ["Dosen", "Admin"] },
  Dipinjam: { from: ["Disetujui"], roles: ["Admin"] },
  Dibatalkan: {
    from: ["Menunggu", "Disetujui"],
    roles: ["Mahasiswa", "Dosen", "Admin"],
  },
}
app.post(`${P}/loans/:id/status`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const { status, note } = await c.req.json()
  const [loans, notifs] = await Promise.all([
    read<any[]>("loans", []),
    read<any[]>("notifs", []),
  ])
  const l = loans.find((x) => x.id === c.req.param("id"))
  const t = TRANSITIONS[status]
  if (!l) return fail(c, 404, "Peminjaman tidak ditemukan.")
  if (!t || !t.from.includes(l.status) || !t.roles.includes(u.role))
    return fail(c, 400, `Tidak bisa mengubah ${l.status} → ${status}.`)
  if (status === "Dibatalkan" && u.role !== "Admin" && l.userId !== u.id)
    return fail(c, 403, "Hanya peminjam yang bisa membatalkan.")
  if (status === "Ditolak" && !note?.trim())
    return fail(c, 400, "Alasan penolakan wajib diisi.")
  l.status = status
  if (note) l.note = note
  if (status === "Disetujui" || status === "Ditolak") l.approver = u.nama
  l.history.push({ status, at: stamp(), by: u.nama, note })
  if (status === "Disetujui")
    pushNotif(notifs, {
      userId: l.userId,
      kind: "approved",
      title: "Booking disetujui",
      message: `${l.id} disetujui oleh ${u.nama}.`,
    })
  if (status === "Ditolak")
    pushNotif(notifs, {
      userId: l.userId,
      kind: "rejected",
      title: "Booking ditolak",
      message: `${l.id} ditolak: ${note}`,
    })
  await Promise.all([write("loans", loans), write("notifs", notifs)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: `status_${status}`,
    target: l.id,
  })
  return c.json({ loan: l })
})

app.post(`${P}/loans/:id/return`, async (c) => {
  const { u, res } = await need(c, ["Admin"])
  if (res) return res
  const { conds, note } = await c.req.json()
  const [loans, items] = await Promise.all([
    read<any[]>("loans", []),
    read<any[]>("items", []),
  ])
  const l = loans.find((x) => x.id === c.req.param("id"))
  if (!l || !["Dipinjam", "Terlambat"].includes(l.status))
    return fail(c, 400, "Peminjaman tidak dalam status dipinjam.")
  l.status = "Dikembalikan"
  l.returnNote = note || undefined
  l.items = l.items.map((i: any) => ({
    ...i,
    kondisiKembali: conds?.[i.itemId] ?? "Baik",
  }))
  l.history.push({
    status: "Dikembalikan",
    at: stamp(),
    by: u.nama,
    note: note || undefined,
  })
  for (const li of l.items) {
    const it = items.find((x) => x.id === li.itemId)
    if (!it || li.kondisiKembali === "Baik") continue
    if (li.kondisiKembali === "Hilang")
      it.stok_total = Math.max(0, it.stok_total - li.qty)
    else it.kondisi = li.kondisiKembali
  }
  await Promise.all([write("loans", loans), write("items", items)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: "pengembalian",
    target: l.id,
  })
  return c.json({ loan: l })
})

app.post(`${P}/loans/:id/extension`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const { days, reason } = await c.req.json()
  const [loans, notifs, items] = await Promise.all([
    read<any[]>("loans", []),
    read<any[]>("notifs", []),
    read<any[]>("items", []),
  ])
  const l = loans.find((x) => x.id === c.req.param("id"))
  if (!l || l.userId !== u.id || l.status !== "Dipinjam")
    return fail(c, 400, "Perpanjangan hanya untuk peminjaman aktif milikmu.")
  if (l.extension?.state === "Menunggu")
    return fail(c, 400, "Masih ada permintaan perpanjangan yang menunggu.")
  for (const i of l.items)
    if (
      availableRange(
        loans,
        items,
        i.itemId,
        addDays(l.end, 1),
        addDays(l.end, days),
        l.id,
      ) < i.qty
    )
      return fail(c, 409, "Stok tidak cukup untuk perpanjangan.")
  l.extension = { days, reason, state: "Menunggu" }
  pushNotif(notifs, {
    roles: ["Dosen", "Admin"],
    kind: "booking",
    title: "Permintaan perpanjangan",
    message: `${u.nama} meminta perpanjangan ${days} hari untuk ${l.id}.`,
  })
  await Promise.all([write("loans", loans), write("notifs", notifs)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: "perpanjangan_diminta",
    target: l.id,
  })
  return c.json({ loan: l })
})

app.post(`${P}/loans/:id/extension/decide`, async (c) => {
  const { u, res } = await need(c, ["Dosen", "Admin"])
  if (res) return res
  const { ok } = await c.req.json()
  const [loans, notifs] = await Promise.all([
    read<any[]>("loans", []),
    read<any[]>("notifs", []),
  ])
  const l = loans.find((x) => x.id === c.req.param("id"))
  if (!l?.extension || l.extension.state !== "Menunggu")
    return fail(c, 400, "Tidak ada perpanjangan yang menunggu.")
  if (ok) l.end = addDays(l.end, l.extension.days)
  l.extension = {
    ...l.extension,
    state: ok ? "Disetujui" : "Ditolak",
    by: u.nama,
  }
  l.history.push({
    status: l.status,
    at: stamp(),
    by: u.nama,
    note: ok
      ? `Perpanjangan disetujui, kembali ${l.end}.`
      : "Perpanjangan ditolak.",
  })
  pushNotif(notifs, {
    userId: l.userId,
    kind: ok ? "approved" : "rejected",
    title: ok ? "Perpanjangan disetujui" : "Perpanjangan ditolak",
    message: `${l.id}: ${ok ? "diperpanjang" : "ditolak"} oleh ${u.nama}.`,
  })
  await Promise.all([write("loans", loans), write("notifs", notifs)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: ok ? "perpanjangan_disetujui" : "perpanjangan_ditolak",
    target: l.id,
  })
  return c.json({ loan: l })
})

// ---------- Admin: katalog & aturan ----------
app.put(`${P}/items/:id`, async (c) => {
  const { u, res } = await need(c, ["Admin"])
  if (res) return res
  const it = await c.req.json()
  if (!it.nama?.trim() || !(it.stok_total >= 0))
    return fail(c, 400, "Nama dan stok wajib valid.")
  const items = await read<any[]>("items", [])
  const i = items.findIndex((x) => x.id === c.req.param("id"))
  const next = { ...it, id: c.req.param("id") }
  if (i < 0) items.push(next)
  else items[i] = next
  await write("items", items)
  await log({
    userId: u.id,
    actor: u.nama,
    action: i < 0 ? "barang_ditambah" : "barang_diubah",
    target: next.id,
    detail: next.nama,
  })
  return c.json({ item: next })
})
app.delete(`${P}/items/:id`, async (c) => {
  const { u, res } = await need(c, ["Admin"])
  if (res) return res
  const id = c.req.param("id")
  const loans = await read<any[]>("loans", [])
  if (
    loans.some(
      (l) =>
        ["Menunggu", ...OCCUPYING].includes(l.status) &&
        l.items.some((i: any) => i.itemId === id),
    )
  )
    return fail(c, 409, "Barang masih dipakai di peminjaman aktif.")
  await write(
    "items",
    (await read<any[]>("items", [])).filter((x) => x.id !== id),
  )
  // Pangkas barang yang dihapus dari daftar favorit semua pengguna.
  const allUsers = await read<any[]>("users", [])
  if (allUsers.some((x) => Array.isArray(x.favorites) && x.favorites.includes(id)))
    await write(
      "users",
      allUsers.map((x) =>
        Array.isArray(x.favorites)
          ? { ...x, favorites: x.favorites.filter((f: string) => f !== id) }
          : x,
      ),
    )
  await log({
    userId: u.id,
    actor: u.nama,
    action: "barang_dihapus",
    target: id,
  })
  return c.json({ ok: true })
})
app.put(`${P}/categories`, async (c) => {
  const { u, res } = await need(c, ["Admin"])
  if (res) return res
  const { categories, items } = await c.req.json()
  await write("categories", categories)
  if (items) await write("items", items)
  await log({ userId: u.id, actor: u.nama, action: "kategori_diubah" })
  return c.json({ ok: true })
})
app.put(`${P}/rules`, async (c) => {
  const { u, res } = await need(c, ["Admin"])
  if (res) return res
  const rules = { ...DEFAULT_RULES, ...(await c.req.json()) }
  await write("rules", rules)
  await log({ userId: u.id, actor: u.nama, action: "aturan_diubah" })
  return c.json({ rules })
})

app.post(`${P}/notifs/read`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const { ids } = await c.req.json()
  const notifs = await read<any[]>("notifs", [])
  for (const n of notifs)
    if (!ids || ids.includes(n.id))
      if (
        (n.userId === u.id || n.roles?.includes(u.role)) &&
        !n.readBy?.includes(u.id)
      )
        (n.readBy ??= []).push(u.id)
  await write("notifs", notifs)
  return c.json({ ok: true })
})

// ---------- Tolong.in: tiket bantuan ke Admin (Fase 5) ----------
/** Cari tiket + pastikan pengguna boleh mengaksesnya (pemilik atau Admin). */
const findTicket = (chats: any[], u: any, id: string) => {
  const i = chats.findIndex((t) => t.id === id)
  if (i < 0) return { t: null, ok: false }
  const t = chats[i]
  return { t, ok: u.role === "Admin" || t.userId === u.id }
}

app.post(`${P}/chats`, async (c) => {
  const { u, res } = await need(c, ["Mahasiswa", "Dosen"])
  if (res) return res
  const b = await c.req.json()
  const subject = String(b.subject ?? "").trim()
  const message = String(b.message ?? "").trim()
  if (subject.length < 3) return fail(c, 400, "Subjek minimal 3 karakter.")
  if (message.length < 3) return fail(c, 400, "Pesan minimal 3 karakter.")
  const [chats, notifs] = await Promise.all([
    read<any[]>("chats", []),
    read<any[]>("notifs", []),
  ])
  const now = stamp()
  const ticket = {
    id: uid("tk"),
    subject,
    userId: u.id,
    by: u.nama,
    role: u.role,
    status: "Terbuka",
    at: now,
    updatedAt: now,
    messages: [
      {
        id: uid("m"),
        userId: u.id,
        by: u.nama,
        role: u.role,
        text: message,
        at: now,
        readBy: [u.id],
      },
    ],
  }
  chats.unshift(ticket)
  pushNotif(notifs, {
    roles: ["Admin"],
    kind: "info",
    title: "Tiket Tolong.in baru",
    message: `${u.nama}: ${subject}`,
  })
  await Promise.all([write("chats", chats), write("notifs", notifs)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: "tiket_dibuat",
    target: ticket.id,
    detail: subject,
  })
  return c.json({ ticket })
})

app.post(`${P}/chats/:id/messages`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const b = await c.req.json()
  const text = String(b.text ?? "").trim()
  if (!text) return fail(c, 400, "Pesan tidak boleh kosong.")
  const [chats, notifs] = await Promise.all([
    read<any[]>("chats", []),
    read<any[]>("notifs", []),
  ])
  const { t, ok } = findTicket(chats, u, c.req.param("id"))
  if (!t) return fail(c, 404, "Tiket tidak ditemukan.")
  if (!ok) return fail(c, 403, "Kamu tidak punya akses ke tiket ini.")
  const now = stamp()
  t.messages.push({
    id: uid("m"),
    userId: u.id,
    by: u.nama,
    role: u.role,
    text,
    at: now,
    readBy: [u.id],
  })
  t.updatedAt = now
  pushNotif(notifs, {
    ...(u.role === "Admin" ? { userId: t.userId } : { roles: ["Admin"] }),
    kind: "info",
    title: u.role === "Admin" ? "Balasan Tolong.in" : "Pesan Tolong.in baru",
    message: `${u.nama}: ${text.slice(0, 60)}`,
  })
  await Promise.all([write("chats", chats), write("notifs", notifs)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: "tiket_dibalas",
    target: t.id,
    detail: text.slice(0, 80),
  })
  return c.json({ ticket: t })
})

app.post(`${P}/chats/:id/status`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const b = await c.req.json()
  const status = String(b.status ?? "")
  if (!CHAT_STATUS.includes(status))
    return fail(c, 400, "Status tiket tidak valid.")
  const [chats, notifs] = await Promise.all([
    read<any[]>("chats", []),
    read<any[]>("notifs", []),
  ])
  const { t, ok } = findTicket(chats, u, c.req.param("id"))
  if (!t) return fail(c, 404, "Tiket tidak ditemukan.")
  if (!ok) return fail(c, 403, "Kamu tidak punya akses ke tiket ini.")
  t.status = status
  t.updatedAt = stamp()
  if (status === "Selesai") {
    t.closedAt = stamp()
    t.closedBy = u.nama
  } else {
    delete t.closedAt
    delete t.closedBy
  }
  pushNotif(notifs, {
    ...(u.role === "Admin" ? { userId: t.userId } : { roles: ["Admin"] }),
    kind: "info",
    title: status === "Selesai" ? "Tiket ditutup" : "Tiket dibuka kembali",
    message: t.subject,
  })
  await Promise.all([write("chats", chats), write("notifs", notifs)])
  await log({
    userId: u.id,
    actor: u.nama,
    action: status === "Selesai" ? "tiket_ditutup" : "tiket_dibuka",
    target: t.id,
    detail: t.subject,
  })
  return c.json({ ticket: t })
})

app.delete(`${P}/chats/:id`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const chats = await read<any[]>("chats", [])
  const { t, ok } = findTicket(chats, u, c.req.param("id"))
  if (!t) return fail(c, 404, "Tiket tidak ditemukan.")
  if (!ok) return fail(c, 403, "Kamu tidak punya akses ke tiket ini.")
  await write(
    "chats",
    chats.filter((x) => x.id !== c.req.param("id")),
  )
  await log({
    userId: u.id,
    actor: u.nama,
    action: "tiket_dihapus",
    target: t.id,
    detail: t.subject,
  })
  return c.json({ ok: true })
})

app.post(`${P}/chats/read`, async (c) => {
  const { u, res } = await need(c)
  if (res) return res
  const { ids } = await c.req.json()
  const chats = await read<any[]>("chats", [])
  for (const t of visibleChats(chats, u)) {
    if (!ids?.includes(t.id)) continue
    for (const m of t.messages)
      if (m.userId !== u.id && !m.readBy?.includes(u.id))
        (m.readBy ??= []).push(u.id)
  }
  await write("chats", chats)
  return c.json({ ok: true })
})

app.get(`${P}/admin/activity`, async (c) => {
  const { res } = await need(c, ["Admin"])
  return res ?? c.json({ activity: await read("activity", []) })
})

// ---------- Admin: kirim notifikasi global (Fase 4) ----------
app.post(`${P}/admin/notifs`, async (c) => {
  const { u: me, res } = await need(c, ["Admin"])
  if (res) return res
  const b = await c.req.json()
  const type = String(b.type ?? "")
  const title = String(b.title ?? "").trim()
  const message = String(b.message ?? "").trim()
  const audience = String(b.audience ?? "semua")
  if (!NOTIF_TYPES.includes(type))
    return fail(c, 400, "Tipe notifikasi tidak valid.")
  if (title.length < 3) return fail(c, 400, "Judul minimal 3 karakter.")
  if (message.length < 3) return fail(c, 400, "Pesan minimal 3 karakter.")
  const users = await read<any[]>("users", [])
  const recipientsFromIds = Array.isArray(b.recipientIds)
    ? b.recipientIds.filter(Boolean)
    : null
  const targets = users.filter((x) => {
    if (recipientsFromIds?.length) return recipientsFromIds.includes(x.id)
    return x.aktif && (audience === "semua" || x.role === audience)
  })
  if (!targets.length)
    return fail(c, 400, "Tidak ada penerima untuk audiens tersebut.")
  const [notifs, broadcasts] = await Promise.all([
    read<any[]>("notifs", []),
    read<any[]>("broadcasts", []),
  ])
  const bc = {
    id:
      "bc-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    type,
    title,
    message,
    audience,
    recipientIds: targets.map((t) => t.id),
    at: stamp(),
    by: me.nama,
    byId: me.id,
  }
  for (const t of targets)
    pushNotif(notifs, {
      userId: t.id,
      kind: BROADCAST_KIND[type] ?? "info",
      title,
      message,
      broadcastId: bc.id,
      notifType: type,
    })
  broadcasts.unshift(bc)
  await Promise.all([write("notifs", notifs), write("broadcasts", broadcasts)])
  await log({
    userId: me.id,
    actor: me.nama,
    action: "notifikasi_global",
    detail: `${type} → ${targets.length} penerima`,
  })
  return c.json({ broadcast: { ...bc, recipients: targets.length, read: 0 } })
})

app.get(`${P}/admin/notifs`, async (c) => {
  const { u: me, res } = await need(c, ["Admin"])
  if (res) return res
  const [broadcasts, notifs] = await Promise.all([
    read<any[]>("broadcasts", []),
    read<any[]>("notifs", []),
  ])
  const out = broadcasts.map((b) => ({
    ...b,
    recipients: b.recipientIds?.length ?? 0,
    read: notifs.filter(
      (n) => n.broadcastId === b.id && n.readBy?.includes(n.userId),
    ).length,
    canDelete: b.byId === me.id,
  }))
  return c.json({ broadcasts: out })
})

app.delete(`${P}/admin/notifs/:id`, async (c) => {
  const { u: me, res } = await need(c, ["Admin"])
  if (res) return res
  const [broadcasts, notifs] = await Promise.all([
    read<any[]>("broadcasts", []),
    read<any[]>("notifs", []),
  ])
  const idx = broadcasts.findIndex((b) => b.id === c.req.param("id"))
  if (idx < 0) return fail(c, 404, "Notifikasi tidak ditemukan.")
  if (broadcasts[idx].byId !== me.id)
    return fail(
      c,
      403,
      "Hanya admin yang mengirim notifikasi ini yang bisa menghapusnya.",
    )
  const removed = broadcasts[idx]
  broadcasts.splice(idx, 1)
  const remaining = notifs.filter((n) => !(n.broadcastId === c.req.param("id")))
  await Promise.all([
    write("broadcasts", broadcasts),
    write("notifs", remaining),
  ])
  await log({
    userId: me.id,
    actor: me.nama,
    action: "notifikasi_dihapus",
    target: c.req.param("id"),
    detail: removed.title,
  })
  return c.json({ ok: true })
})

app.get(`${P}/admin/dump`, async (c) => {
  const { res } = await need(c, ["Admin"])
  if (res) return res
  const out: Record<string, unknown> = {}
  for (const k of COLLECTIONS) out[k] = await read(k, null)
  return c.json(out)
})

Deno.serve(app.fetch)
