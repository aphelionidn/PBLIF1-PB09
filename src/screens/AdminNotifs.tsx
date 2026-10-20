import { useEffect, useState } from 'react'
import { Button, Confirm, Empty, Field, Glass, Icon, Input, PageHeader, Pill, SearchBox, Skeleton, inputCls } from '../components/ui'
import { fmtDateTime, type Broadcast, type NotifType, type User } from '../data'
import { useStore } from '../store'
import { api } from '../lib/api'

const TYPES: NotifType[] = ['Peringatan', 'Pesan', 'Info']
const META: Record<NotifType, { icon: string; tone: 'red' | 'blue' | 'gray'; desc: string }> = {
  Peringatan: { icon: 'alert', tone: 'red', desc: 'Hal penting yang butuh perhatian segera.' },
  Pesan: { icon: 'mail', tone: 'blue', desc: 'Pesan biasa untuk pengguna.' },
  Info: { icon: 'info', tone: 'gray', desc: 'Informasi umum tanpa tindakan.' },
}
const audienceLabel = (a: string) => (a === 'semua' ? 'Semua pengguna' : a)

export default function AdminNotifs() {
  const { fetchBroadcasts, sendBroadcast, users, toast } = useStore()
  const [rows, setRows] = useState<Broadcast[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<NotifType>('Info')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('semua')
  const [pickMode, setPickMode] = useState(false)
  const [pickQ, setPickQ] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [delBusy, setDelBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setRows(await fetchBroadcasts())
    } catch (e) {
      toast((e as Error).message, 'danger')
      setRows([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const activePickUsers = users.filter(
    (u) =>
      u.aktif &&
      (pickQ
        ? [u.nama, u.nim_nip, u.email].some((v) =>
            v.toLowerCase().includes(pickQ.toLowerCase()),
          )
        : true),
  )

  const recipients = users.filter((u: User) => {
    if (pickMode) return picked.has(u.id)
    return u.aktif && (audience === 'semua' || u.role === audience)
  }).length

  const submit = async () => {
    const n: Record<string, string> = {}
    if (title.trim().length < 3) n.title = 'Judul minimal 3 karakter.'
    if (message.trim().length < 3) n.message = 'Pesan minimal 3 karakter.'
    if (pickMode && !picked.size) n.pick = 'Pilih minimal satu penerima.'
    setErr(n)
    if (Object.keys(n).length) return
    setBusy(true)
    const body: { type: NotifType; title: string; message: string; audience: string; recipientIds?: string[] } = {
      type,
      title: title.trim(),
      message: message.trim(),
      audience,
    }
    if (pickMode) body.recipientIds = [...picked]
    const ok = await sendBroadcast(body)
    setBusy(false)
    if (ok) {
      toast(`Notifikasi terkirim ke ${recipients} pengguna`)
      setTitle(''); setMessage(''); setType('Info'); setAudience('semua')
      setPickMode(false); setPickQ(''); setPicked(new Set())
      load()
    }
  }

  const delTarget = (rows ?? []).find((b) => b.id === deleteId) ?? null
  const doDelete = async () => {
    if (!deleteId) return
    setDelBusy(true)
    try {
      await api('/admin/notifs/' + deleteId, { method: 'DELETE' })
      toast('Notifikasi dihapus')
      setDeleteId(null)
      await load()
    } catch (e) {
      toast((e as Error).message, 'danger')
    } finally {
      setDelBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Kirim Notifikasi"
        subtitle="Broadcast pengumuman ke pengguna aplikasi."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Glass className="p-5">
          <h2 className="mb-4 text-[18px] font-semibold">Notifikasi baru</h2>
          <div className="flex flex-col gap-4">
            <Field label="Tipe notifikasi">
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {TYPES.map((t) => (
                  <button
                    key={t}
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                    className={`tap flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[14px] border text-[13px] font-semibold ${
                      type === t
                        ? 'border-primary bg-primary/10 text-primary-pressed'
                        : 'border-white/90 bg-white/60 text-ink'
                    }`}
                  >
                    <Icon name={META[t].icon} className="size-5" />
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-ink-2">{META[type].desc}</p>
            </Field>
            <Field label="Judul" error={err.title} htmlFor="bn-title">
              <Input
                id="bn-title"
                value={title}
                error={err.title}
                placeholder="Contoh: Maintenance server"
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Pesan" error={err.message} htmlFor="bn-msg">
              <textarea
                id="bn-msg"
                rows={4}
                value={message}
                placeholder="Tulis isi pengumuman…"
                onChange={(e) => setMessage(e.target.value)}
                className={`${inputCls(err.message)} resize-y py-2.5 leading-relaxed`}
              />
            </Field>
            <Field label="Penerima" htmlFor="bn-aud" error={err.pick}>
              <div className="flex flex-wrap gap-2">
                <select
                  id="bn-aud"
                  value={audience}
                  disabled={pickMode}
                  onChange={(e) => {
                    setAudience(e.target.value)
                    setPickMode(false)
                  }}
                  className={`${inputCls()} flex-1`}
                >
                  <option value="semua">Semua pengguna</option>
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Dosen">Dosen</option>
                  <option value="Admin">Admin</option>
                </select>
                <Button
                  variant={pickMode ? 'secondary' : 'ghost'}
                  size="sm"
                  icon={pickMode ? 'x' : 'users'}
                  onClick={() => {
                    setPickMode((p) => !p)
                    setPicked(new Set())
                  }}
                  className="shrink-0"
                >
                  {pickMode ? 'Batal pilih' : 'Pilih pengguna'}
                </Button>
              </div>
              <p className="mt-1.5 text-[12px] text-ink-2">
                {pickMode
                  ? `${recipients} pengguna dipilih dari daftar.`
                  : `${recipients} pengguna aktif akan menerima notifikasi ini.`}
              </p>
            </Field>
            {pickMode && (
              <Field
                label="Pilih penerima"
                helper="Cari nama, NIM/NIP, atau email, lalu centang penerima."
              >
                <div className="flex flex-col gap-2">
                  <SearchBox
                    value={pickQ}
                    onChange={setPickQ}
                    placeholder="Cari nama / NIM / email"
                  />
                  <div className="max-h-52 overflow-y-auto rounded-[14px] border border-white/90 bg-white/70">
                    <div className="flex flex-col gap-1 p-1">
                      {activePickUsers.map((u) => (
                        <label
                          key={u.id}
                          className={`tap flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[14px] transition-colors ${
                            picked.has(u.id)
                              ? 'bg-primary/10 text-primary-pressed'
                              : 'hover:bg-white/80'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={picked.has(u.id)}
                            onChange={(e) => {
                              const next = new Set(picked)
                              if (e.target.checked) next.add(u.id)
                              else next.delete(u.id)
                              setPicked(next)
                            }}
                            className="size-4 shrink-0 accent-[var(--color-primary)]"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{u.nama}</p>
                            <p className="truncate text-[12px] text-ink-2">
                              {u.nim_nip} · {u.email}
                            </p>
                          </div>
                        </label>
                      ))}
                      {activePickUsers.length === 0 && (
                        <p className="px-3 py-2 text-[13px] text-ink-2">
                          Tidak ada pengguna aktif yang cocok.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Field>
            )}
            <Button icon="sparkle" onClick={submit} loading={busy} disabled={!recipients}>
              {busy ? 'Mengirim…' : 'Kirim notifikasi'}
            </Button>
          </div>
        </Glass>

        <Glass className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Riwayat terkirim</h2>
            <Button
              variant="ghost"
              icon="refresh"
              onClick={load}
              loading={loading}
              className="min-h-9 px-3 text-[13px]"
            >
              Muat ulang
            </Button>
          </div>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (rows ?? []).length === 0 ? (
            <Empty
              icon="bell"
              title="Belum ada notifikasi terkirim"
              desc="Notifikasi yang kamu kirim akan muncul di sini beserta jumlah pembacanya."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {(rows ?? []).map((b) => {
                const pct = b.recipients
                  ? Math.round((b.read / b.recipients) * 100)
                  : 0
                return (
                  <div key={b.id} className="rounded-[16px] bg-white/55 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={META[b.type]?.tone ?? 'gray'}>{b.type}</Pill>
                          <span className="text-[12px] font-medium text-ink-2">
                            {fmtDateTime(b.at)} · oleh {b.by}
                          </span>
                        </div>
                        <p className="mt-2 text-[15px] font-semibold">{b.title}</p>
                        <p className="mt-0.5 text-[14px] text-ink-2">{b.message}</p>
                        <p className="mt-1 text-[12px] text-ink-2">
                          Ke: {audienceLabel(b.audience)} · {b.recipients} penerima
                        </p>
                      </div>
                      {b.canDelete && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon="trash"
                          onClick={() => setDeleteId(b.id)}
                          className="min-h-9 shrink-0 px-3 text-[13px]"
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex items-center justify-between text-[12px] font-medium text-ink-2">
                        <span>
                          Pembaca: {b.read}/{b.recipients} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/70">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Glass>
      </div>

      <Confirm
        open={!!deleteId}
        onClose={() => (delBusy ? null : setDeleteId(null))}
        onConfirm={doDelete}
        title="Hapus notifikasi?"
        message={
          delTarget
            ? `Broadcast "${delTarget.title}" akan dihapus dari riwayat dan notifikasi penerimanya ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
            : ''
        }
        confirmLabel={delBusy ? 'Menghapus…' : 'Hapus'}
        tone="danger"
      />
    </div>
  )
}
