import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type React from "react"
import { DEFAULT_RULES, type Rules } from "./config"
import { api } from "./lib/api"
import { colorTone, photoColors } from "./lib/color"
import { readImage } from "./lib/image"
import { supabase } from "./lib/supabase"
import {
  CATEGORIES,
  ITEMS,
  LOANS,
  NOTIFS,
  TODAY,
  USERS,
  addDays,
  type ActivityEntry,
  type Broadcast,
  type ChatStatus,
  type ChatTicket,
  type Item,
  type Kondisi,
  type Loan,
  type LoanItem,
  type Notif,
  type NotifType,
  type Role,
  type Status,
  type User,
} from "./data"

export type Page = "catalog" | "item" | "myloans" | "approvals" | "notifs" | "tolong" | "profile" | "dashboard" | "admin-items" | "admin-loans" | "admin-returns" | "admin-users" | "admin-calendar" | "admin-rules" | "admin-activity" | "admin-notifs" | "admin-tolong"
export type Theme = "light" | "dark" | "system"
export type WallId = "default" | "aurora" | "sunset" | "ocean" | "forest" | "plain" | "custom" | "solid" | "gradient"
export interface Wallpaper {
  id: WallId
  image?: string
  blur: number
  /** Warna latar kustom: dasar untuk `solid`, warna pertama untuk `gradient`. */
  color?: string
  /** Warna kedua untuk latar `gradient`. */
  color2?: string
  /** Tema warna beranimasi (aksen + latar bergeser halus). */
  anim?: boolean
}
export interface CartLine {
  itemId: string
  qty: number
}
/** Status pemuatan data server. `loading` = belum ada data, `ready` = sinkron, `error` = gagal muat awal. */
export type DataStatus = "loading" | "ready" | "error"

const load = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k)
    return v ? { ...d, ...JSON.parse(v) } : d
  } catch {
    return d
  }
}
export interface Toast {
  id: number
  msg: string
  tone: "success" | "danger" | "info"
}

export const OCCUPYING: Status[] = ["Disetujui", "Dipinjam", "Terlambat"]

/** Baris pengguna seperti yang dikirim server (punya id Auth + legacyId dari seed). */
type ServerUser = Omit<User, "authId"> & { legacyId?: string }
interface StateResponse {
  users: ServerUser[]
  items: Item[]
  categories: string[]
  loans: Loan[]
  notifs: Notif[]
  chats?: ChatTicket[]
  rules: Rules
  today: string
  /** Hanya ada setelah endpoint server diperbarui; klien tetap aman bila absen. */
  me?: ServerUser
  cart?: CartLine[]
  cartDates?: { start: string; end: string } | null
  /** null/absen = server belum menyimpan favorit (atau server lama). */
  favorites?: string[] | null
}

const FAV_KEY = "pinjamin.favs"
const saveFavs = (m: Record<string, string[]>) => {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(m))
  } catch {
    /* kuota penuh — favorit tetap ada di memori sesi ini */
  }
}

const CART_KEY = "pinjamin.cart"
const sameData = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
const readLocalCart = (): {
  cart: CartLine[]
  cartDates: { start: string; end: string } | null
} => {
  try {
    const v = JSON.parse(localStorage.getItem(CART_KEY) || "null")
    if (v && Array.isArray(v.cart))
      return { cart: v.cart, cartDates: v.cartDates ?? null }
  } catch {
    /* localStorage kosong/rusak — pakai keranjang kosong */
  }
  return { cart: [], cartDates: null }
}

function useStoreValue() {
  // Data domain — semuanya berasal dari server (GET /state), bukan data lokal.
  const [users, setUsers] = useState<User[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [chats, setChats] = useState<ChatTicket[]>([])
  const [meId, setMeId] = useState<string | null>(null)
  const [serverToday, setServerToday] = useState<string | null>(null)
  const [dataStatus, setDataStatus] = useState<DataStatus>("loading")
  const [dataError, setDataError] = useState<string | null>(null)
  const loadedOnce = useRef(false)
  const refreshing = useRef(false)

  const [page, setPage] = useState<Page>("catalog")
  const [param, setParam] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [simError, setSimError] = useState(false)
  const [rules, setRulesState] = useState<Rules>(DEFAULT_RULES)
  const [simDays, setSimDays] = useState(0)
  const [theme, setThemeState] = useState<Theme>(
    () => localStorage.getItem("pinjamin.theme") as Theme || "light",
  )
  const [performanceMode, setPerformanceModeState] = useState(
    () => localStorage.getItem("pinjamin.performance") === "true",
  )
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartDates, setCartDates] = useState<{
    start: string
    end: string
  } | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [recent, setRecent] = useState<string[]>([])
  const [wallpaper, setWallState] = useState<Wallpaper>(() =>
    load("pinjamin.wall", { id: "default", blur: 8 } as Wallpaper),
  )
  const setWallpaper = (w: Wallpaper) => {
    setWallState(w)
    try {
      localStorage.setItem("pinjamin.wall", JSON.stringify(w))
      return true
    } catch {
      return false // kuota localStorage penuh — tetap dipakai untuk sesi ini
    }
  }
  useEffect(() => {
    const el = document.documentElement
    if (wallpaper.id === "default") delete el.dataset.wall
    else el.dataset.wall = wallpaper.id
    el.classList.toggle("theme-anim", !!wallpaper.anim)
    if (wallpaper.id === "custom" && wallpaper.image)
      photoColors(wallpaper.image).then(([a, b]) => {
        el.style.setProperty("--wall-a", a)
        el.style.setProperty("--wall-b", b)
      })
    if (wallpaper.id === "solid" || wallpaper.id === "gradient") {
      const a = wallpaper.color ?? "#0A84FF"
      const b = wallpaper.color2 ?? "#8E7CFF"
      el.style.setProperty("--wall-bg", wallpaper.id === "solid" ? a : `linear-gradient(135deg, ${a}, ${b})`)
      el.style.setProperty("--wall-a", a)
      el.style.setProperty("--wall-b", wallpaper.id === "solid" ? a : b)
      const dark = colorTone(a) === "dark" || (wallpaper.id === "gradient" && colorTone(b) === "dark")
      el.dataset.wallTone = dark ? "dark" : "light"
    } else {
      el.style.removeProperty("--wall-bg")
      delete el.dataset.wallTone
    }
  }, [`${wallpaper.id}|${wallpaper.image ?? ""}|${wallpaper.color ?? ""}|${wallpaper.color2 ?? ""}|${wallpaper.anim ? 1 : 0}`])
  const [favMap, setFavMap] = useState<Record<string, string[]>>(() =>
    load("pinjamin.favs", {}),
  )
  const favMapRef = useRef(favMap)
  const today = addDays(serverToday ?? TODAY, simDays)

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem("pinjamin.theme", t)
  }
  const setPerformanceMode = (enabled: boolean) => {
    document.documentElement.classList.toggle("performance-mode", enabled)
    setPerformanceModeState(enabled)
    localStorage.setItem("pinjamin.performance", String(enabled))
  }
  useEffect(() => {
    document.documentElement.classList.toggle("performance-mode", performanceMode)
  }, [performanceMode])
  // Terapkan tema + nuansa waktu ke <html>
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () =>
      document.documentElement.classList.toggle(
        "dark",
        theme === "dark" || (theme === "system" && mq.matches),
      )
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [theme])
  useEffect(() => {
    const tod = () => {
      const h = new Date().getHours()
      document.documentElement.dataset.tod =
        h < 10 ? "pagi" : h < 15 ? "siang" : h < 19 ? "sore" : "malam"
    }
    tod()
    const t = setInterval(tod, 60000)
    return () => clearInterval(t)
  }, [])

  const me = users.find((u) => u.id === meId) ?? null
  const userById = useCallback(
    (id: string) => users.find((u) => u.id === id),
    [users],
  )
  const itemById = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items],
  )

  const toast = useCallback((msg: string, tone: Toast["tone"] = "success") => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, msg, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800)
  }, [])

  const nav = useCallback((p: Page, prm: string | null = null) => {
    setPage(p)
    setParam(prm)
    window.scrollTo({ top: 0 })
  }, [])

  // ---------- Sinkronisasi state server ----------
  const [authStatus, setAuthStatus] = useState<"loading" | "out" | "in">(
    "loading",
  )
  const [serverError, setServerError] = useState<string | null>(null)

  const applyState = useCallback((s: StateResponse, first: boolean) => {
    const nextUsers = (s.users as User[]) ?? []
    const nextItems = s.items ?? []
    const nextCategories = s.categories ?? []
    const nextLoans = s.loans ?? []
    const nextNotifs = s.notifs ?? []
    const nextChats = s.chats ?? []
    setUsers((prev) => sameData(prev, nextUsers) ? prev : nextUsers)
    setItems((prev) => sameData(prev, nextItems) ? prev : nextItems)
    setCategories((prev) => sameData(prev, nextCategories) ? prev : nextCategories)
    setLoans((prev) => sameData(prev, nextLoans) ? prev : nextLoans)
    setNotifs((prev) => sameData(prev, nextNotifs) ? prev : nextNotifs)
    setChats((prev) => sameData(prev, nextChats) ? prev : nextChats)
    if (s.rules) {
      const nextRules = { ...DEFAULT_RULES, ...s.rules }
      setRulesState((prev) => sameData(prev, nextRules) ? prev : nextRules)
    }
    if (s.me?.id) setMeId(s.me.id)
    if (s.today) setServerToday(s.today)
    if (first) {
      if (s.cart) setCart(s.cart)
      if (s.cartDates !== undefined) setCartDates(s.cartDates ?? null)
      const uid = s.me?.id
      if (uid) {
        if (Array.isArray(s.favorites)) {
          // Server adalah sumber kebenaran; cache lokal mengikuti.
          const next = { ...favMapRef.current, [uid]: s.favorites }
          favMapRef.current = next
          setFavMap(next)
          saveFavs(next)
        } else if (s.favorites === null) {
          // Migrasi sekali: favorit lama di perangkat → server.
          const local = favMapRef.current[uid]
          if (local?.length)
            api("/me/favorites", {
              method: "PUT",
              body: { favorites: local },
              quiet404: true,
            }).catch(() => {})
        }
      }
    }
  }, [])

  /** Ambil seluruh state dari server. Aman dipanggil berulang (polling). */
  const refresh = useCallback(async (): Promise<boolean> => {
    if (refreshing.current) return false
    refreshing.current = true
    try {
      const s = await api<StateResponse>("/state")
      const first = !loadedOnce.current
      applyState(s, first)
      loadedOnce.current = true
      setDataStatus("ready")
      setDataError(null)
      return true
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 401) {
        // Sesi kedaluwarsa → kembali ke halaman masuk.
        await supabase.auth.signOut().catch(() => {})
        setMeId(null)
        setAuthStatus("out")
        return false
      }
      setDataError(err.message)
      if (!loadedOnce.current) setDataStatus("error")
      return false
    } finally {
      refreshing.current = false
    }
  }, [applyState])

  const boot = useCallback(async () => {
    setAuthStatus("loading")
    setServerError(null)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) {
        setAuthStatus("out")
        // Seed tetap tersedia untuk database baru, tetapi tidak menahan halaman masuk.
        api("/seed", {
          body: {
            users: USERS,
            items: ITEMS,
            categories: CATEGORIES,
            loans: LOANS,
            notifs: NOTIFS,
          },
        }).catch(() => {})
        return
      }
      setAuthStatus("in")
      await refresh()
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 401) await supabase.auth.signOut()
      else setServerError(err.message)
      setAuthStatus("out")
    }
  }, [refresh])
  useEffect(() => {
    boot()
  }, [boot])

  // Polling tetap menjaga presence, tetapi tidak bekerja saat tab tersembunyi.
  useEffect(() => {
    if (authStatus !== "in") return
    const updateVisible = () => {
      if (document.visibilityState === "visible") refresh()
    }
    const t = setInterval(updateVisible, 15000)
    const onFocus = updateVisible
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", updateVisible)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", updateVisible)
    }
  }, [authStatus, refresh])

  const login = async (id: string, password: string) => {
    const { session, user } = await api<{
      session: { access_token: string; refresh_token: string }
      user: ServerUser
    }>("/auth/login", { body: { id, password } })
    const { error } = await supabase.auth.setSession(session)
    if (error) throw new Error("Gagal menyimpan sesi. Coba lagi.")
    setMeId(user.id)
    loadedOnce.current = false
    setDataStatus("loading")
    setDataError(null)
    const local = readLocalCart()
    setCart(local.cart)
    setCartDates(local.cartDates)
    setRecent([])
    setAuthStatus("in")
    refresh()
    nav(user.role === "Admin" ? "dashboard" : "catalog")
  }
  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {})
    await supabase.auth.signOut()
    setMeId(null)
    setAuthStatus("out")
    setUsers([])
    setItems([])
    setCategories([])
    setLoans([])
    setNotifs([])
    setChats([])
    loadedOnce.current = false
    setDataStatus("loading")
    setDataError(null)
    setCart([])
    setCartDates(null)
    setRecent([])
  }
  const updateProfile = async (f: { nama: string; hp: string; kota: string; foto?: string }) => {
    await api("/me", { method: "PUT", body: f })
    await refresh()
  }
  /** Perkecil di perangkat lalu unggah foto ke Supabase Storage; mengembalikan URL publik. */
  const uploadPhoto = async (file: File, kind: "avatar" | "item"): Promise<string | null> => {
    try {
      const dataUrl = await readImage(file, kind === "avatar" ? 320 : 900, 0.82, kind === "avatar")
      const { url } = await api<{ url: string }>("/photos", { body: { dataUrl, kind } })
      return url
    } catch (e) {
      toast((e as Error).message, "danger")
      return null
    }
  }
  const changePassword = (current: string, password: string) =>
    api("/me/password", { body: { current, password } })
  const resetPassword = (u: User, password: string) =>
    api(`/admin/users/${u.authId ?? u.id}/password`, { body: { password } })

  // ---------- Admin: aktivitas & notifikasi global (Fase 4) ----------
  /** Ambil log aktivitas sistem (khusus Admin). */
  const fetchActivity = useCallback(async (): Promise<ActivityEntry[]> => {
    const { activity } = await api<{ activity: ActivityEntry[] }>(
      "/admin/activity",
    )
    return activity ?? []
  }, [])
  /** Ambil riwayat notifikasi global terkirim (khusus Admin). */
  const fetchBroadcasts = useCallback(async (): Promise<Broadcast[]> => {
    const { broadcasts } = await api<{ broadcasts: Broadcast[] }>(
      "/admin/notifs",
    )
    return broadcasts ?? []
  }, [])
  /** Kirim notifikasi global ke pengguna (khusus Admin). */
  const sendBroadcast = async (b: {
    type: NotifType
    title: string
    message: string
    audience: string
    recipientIds?: string[]
  }) => {
    try {
      await api("/admin/notifs", { body: b })
      await refresh()
      return true
    } catch (e) {
      toast((e as Error).message, "danger")
      return false
    }
  }

  // ---------- Tolong.in: tiket bantuan (Fase 5) ----------
  /** Jumlah pesan belum dibaca di tiket yang terlihat oleh pengguna aktif. */
  const unreadChats = useMemo(
    () =>
      me
        ? chats.reduce(
            (s, t) =>
              s +
              t.messages.filter(
                (m) => m.userId !== me.id && !m.readBy?.includes(me.id),
              ).length,
            0,
          )
        : 0,
    [chats, me],
  )
  /** Buat tiket Tolong.in baru (Mahasiswa/Dosen) dengan pesan pertama. */
  const createTicket = async (subject: string, message: string) => {
    try {
      await api("/chats", { body: { subject, message } })
      await refresh()
      return true
    } catch (e) {
      toast((e as Error).message, "danger")
      return false
    }
  }
  /** Kirim pesan pada sebuah tiket (pemilik atau Admin). */
  const sendChat = async (id: string, text: string) => {
    try {
      await api(`/chats/${id}/messages`, { body: { text } })
      await refresh()
      return true
    } catch (e) {
      toast((e as Error).message, "danger")
      return false
    }
  }
  /** Ubah status tiket: Terbuka ⇄ Selesai. */
  const setChatStatus = async (id: string, status: ChatStatus) => {
    try {
      await api(`/chats/${id}/status`, { body: { status } })
      await refresh()
      return true
    } catch (e) {
      toast((e as Error).message, "danger")
      return false
    }
  }
  /** Tandai pesan orang lain di tiket ini sudah dibaca (optimistis + server). */
  const markChatRead = (ids: string[]) => {
    if (!me || !ids.length) return
    setChats((cs) =>
      cs.map((t) =>
        ids.includes(t.id)
          ? {
              ...t,
              messages: t.messages.map((m) =>
                m.userId !== me.id && !m.readBy?.includes(me.id)
                  ? { ...m, readBy: [...(m.readBy ?? []), me.id] }
                  : m,
              ),
            }
          : t,
      ),
    )
    api("/chats/read", { body: { ids } }).catch(() => {})
  }

  /** Jalankan mutasi lalu tarik ulang state server; galat ditampilkan sebagai toast. */
  const runMutation = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      await refresh()
      return true
    } catch (e) {
      toast((e as Error).message, "danger")
      return false
    }
  }

  /** Simpan aturan ke server (khusus Admin); state lokal diperbarui lewat refresh(). */
  const setRules = async (r: Rules) =>
    runMutation(() => api("/rules", { method: "PUT", body: r }))

  // Jumlah unit terpakai pada satu tanggal
  const usedOn = useCallback(
    (itemId: string, date: string, excludeId?: string) =>
      loans
        .filter((l) => l.id !== excludeId && OCCUPYING.includes(l.status))
        .filter((l) => {
          const end = l.status === "Terlambat" && l.end < today ? today : l.end
          return l.start <= date && date <= end
        })
        .reduce(
          (s, l) =>
            s +
            l.items
              .filter((i) => i.itemId === itemId)
              .reduce((a, i) => a + i.qty, 0),
          0,
        ),
    [loans, today],
  )
  const availableOn = useCallback(
    (itemId: string, date: string) =>
      Math.max(0, (itemById(itemId)?.stok_total ?? 0) - usedOn(itemId, date)),
    [itemById, usedOn],
  )
  const availableRange = useCallback(
    (itemId: string, start: string, end: string) => {
      let min = Infinity
      for (let d = start; d <= end; d = addDays(d, 1))
        min = Math.min(min, availableOn(itemId, d))
      return min === Infinity ? 0 : min
    },
    [availableOn],
  )

  const itemNames = (l: { items: LoanItem[] }) =>
    l.items.map((i) => itemById(i.itemId)?.nama).join(", ")

  // ---------- Mutasi peminjaman (server) ----------
  const requestExtension = async (id: string, days: number, reason: string) =>
    runMutation(() => api(`/loans/${id}/extension`, { body: { days, reason } }))
  const decideExtension = async (id: string, ok: boolean) =>
    runMutation(() => api(`/loans/${id}/extension/decide`, { body: { ok } }))

  // Favorit (per pengguna, preferensi perangkat — tidak masuk lingkup data server)
  // Disimpan di server (PUT /me/favorites) dengan cache localStorage; update optimistis.
  const favs = (meId && favMap[meId]) || []
  const favsRemote = useRef(true)
  const toggleFav = (itemId: string) => {
    if (!meId) return
    const prev = favMapRef.current[meId] || []
    const list = prev.includes(itemId)
      ? prev.filter((x) => x !== itemId)
      : [...prev, itemId]
    const apply = (l: string[]) => {
      const next = { ...favMapRef.current, [meId]: l }
      favMapRef.current = next
      setFavMap(next)
      saveFavs(next)
    }
    apply(list)
    if (!favsRemote.current) return
    api("/me/favorites", { method: "PUT", body: { favorites: list }, quiet404: true }).catch(
      (e: Error & { status?: number }) => {
        if (e.status === 404) {
          // Server lama belum punya rute ini — tetap simpan lokal saja.
          favsRemote.current = false
          return
        }
        // Gagal menyimpan: kembalikan ke kondisi sebelumnya.
        apply(prev)
        toast("Gagal menyimpan favorit. Coba lagi.", "danger")
      },
    )
  }

  // ---------- Keranjang (server bila tersedia, fallback localStorage) ----------
  const cartRemote = useRef(true)
  const persistCart = (
    c: CartLine[],
    d: { start: string; end: string } | null,
  ) => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify({ cart: c, cartDates: d }))
    } catch {
      /* kuota penuh — sesi ini tetap jalan */
    }
    if (!cartRemote.current) return
    api("/me/cart", { method: "PUT", body: { cart: c, cartDates: d } }).catch(
      () => {
        cartRemote.current = false
      },
    )
  }
  const addToCart = (
    itemId: string,
    qty: number,
    dates?: { start: string; end: string },
  ) => {
    const next = cart.some((x) => x.itemId === itemId)
      ? cart.map((x) => (x.itemId === itemId ? { ...x, qty } : x))
      : [...cart, { itemId, qty }]
    const nd = dates ?? cartDates
    setCart(next)
    setCartDates(nd)
    persistCart(next, nd)
  }
  const setCartQty = (itemId: string, qty: number) => {
    const next = cart.map((x) => (x.itemId === itemId ? { ...x, qty } : x))
    setCart(next)
    persistCart(next, cartDates)
  }
  const removeFromCart = (itemId: string) => {
    const next = cart.filter((x) => x.itemId !== itemId)
    setCart(next)
    persistCart(next, cartDates)
  }
  const clearCart = () => {
    setCart([])
    setCartDates(null)
    persistCart([], null)
  }
  const viewItem = (id: string) =>
    setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 6))

  const createLoan = async (data: {
    items: LoanItem[]
    start: string
    end: string
    keperluan: string
  }): Promise<Loan | null> => {
    if (!me) return null
    try {
      const { loan } = await api<{ loan: Loan }>("/loans", { body: data })
      await refresh()
      return loan
    } catch (e) {
      toast((e as Error).message, "danger")
      return null
    }
  }

  const setStatus = async (id: string, status: Status, note?: string) =>
    runMutation(() => api(`/loans/${id}/status`, { body: { status, note } }))

  const recordReturn = async (
    id: string,
    conds: Record<string, Kondisi>,
    note: string,
  ) => runMutation(() => api(`/loans/${id}/return`, { body: { conds, note } }))

  const saveItem = async (it: Item) =>
    runMutation(() => api(`/items/${it.id}`, { method: "PUT", body: it }))
  const deleteItem = async (id: string) =>
    runMutation(() => api(`/items/${id}`, { method: "DELETE" }))
  const putCategories = (cats: string[], itemsNext?: Item[]) =>
    api("/categories", {
      method: "PUT",
      body: { categories: cats, items: itemsNext },
    })
  const addCategory = async (c: string) =>
    runMutation(() => putCategories([...categories, c]))
  const renameCategory = async (o: string, n: string) =>
    runMutation(() =>
      putCategories(
        categories.map((c) => (c === o ? n : c)),
        items.map((i) => (i.kategori === o ? { ...i, kategori: n } : i)),
      ),
    )
  const deleteCategory = async (c: string) =>
    runMutation(() => putCategories(categories.filter((x) => x !== c)))

  /** Simpan akun ke server (buat baru butuh password awal), lalu tarik ulang state. */
  const saveUser = async (u: User, password?: string) => {
    const body = {
      nama: u.nama,
      nim_nip: u.nim_nip,
      email: u.email,
      role: u.role,
      aktif: u.aktif,
    }
    if (u.id) await api(`/users/${u.authId ?? u.id}`, { method: "PUT", body })
    else await api("/admin/users", { body: { ...body, password } })
    await refresh()
  }
  const toggleUser = (u: User) => saveUser({ ...u, aktif: !u.aktif })

  const myNotifs = useMemo(
    () =>
      me
        ? notifs.filter((n) => n.userId === me.id || n.roles?.includes(me.role))
        : [],
    [notifs, me],
  )
  const markRead = (id: string) => {
    setNotifs((ns) => ns.map((n) => (n.id === id ? { ...n, read: true } : n)))
    api("/notifs/read", { body: { ids: [id] } }).catch(() => {})
  }
  const markAllRead = () => {
    const ids = myNotifs.map((n) => n.id)
    if (!ids.length) return
    setNotifs((ns) =>
      ns.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)),
    )
    api("/notifs/read", { body: { ids } }).catch(() => {})
  }

  return {
    wallpaper,
    setWallpaper,
    requestExtension,
    decideExtension,
    favs,
    toggleFav,
    rules,
    setRules,
    simDays,
    setSimDays,
    today,
    theme,
    setTheme,
    performanceMode,
    setPerformanceMode,
    cart,
    cartDates,
    setCartDates,
    cartOpen,
    setCartOpen,
    addToCart,
    setCartQty,
    removeFromCart,
    clearCart,
    recent,
    viewItem,
    users,
    items,
    categories,
    loans,
    myNotifs,
    me,
    role: (me?.role ?? "Mahasiswa") as Role,
    page,
    param,
    toasts,
    simError,
    setSimError,
    userById,
    itemById,
    toast,
    nav,
    login,
    logout,
    authStatus,
    serverError,
    boot,
    updateProfile,
    uploadPhoto,
    changePassword,
    resetPassword,
    availableOn,
    availableRange,
    usedOn,
    itemNames,
    createLoan,
    setStatus,
    recordReturn,
    saveItem,
    deleteItem,
    addCategory,
    renameCategory,
    deleteCategory,
    saveUser,
    toggleUser,
    markRead,
    markAllRead,
    fetchActivity,
    fetchBroadcasts,
    sendBroadcast,
    chats,
    unreadChats,
    createTicket,
    sendChat,
    setChatStatus,
    markChatRead,
    dataStatus,
    dataError,
    refresh,
  }
}

type Store = ReturnType<typeof useStoreValue>
// Satu context tetap dipakai lintas hot reload agar provider lama tetap cocok
const g = globalThis as { __pinjaminCtx?: React.Context<Store | null> }
const Ctx = (g.__pinjaminCtx ??= createContext<Store | null>(null))
export function StoreProvider({ children }: { children: ReactNode }) {
  const v = useStoreValue()
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>
}
export { api } from "./lib/api"
export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error("StoreProvider missing")
  return v
}
