import { useState } from 'react'
import { Avatar, Button, Chip, Confirm, DataGate, Empty, Field, Glass, Icon, IconButton, Input, Overlay, PageHeader, Pill, SearchBox, Skeleton, useIsMobile } from '../components/ui'
import { fmtDateTime, isCampusEmail, timeAgo, type ActivityEntry, type Role, type User } from '../data'
import { useStore } from '../store'
import { actionLabel } from './AdminActivity'

const ROLES: Role[] = ['Mahasiswa', 'Dosen', 'Admin']
const blank: User = { id: '', nama: '', nim_nip: '', email: '', role: 'Mahasiswa', aktif: true }
/** Dianggap online bila denyut terakhir < 2 menit lalu (jantung dari GET /state tiap 5 detik). */
const ONLINE_MS = 120000
const isOnline = (u: User) => !!u.lastSeen && Date.now() - Date.parse(u.lastSeen) < ONLINE_MS

const STATUS_ICON: Record<string, string> = { login: 'check', logout: 'logout', login_gagal: 'x' }

export default function AdminUsers() {
  const { users, saveUser, toggleUser, resetPassword, fetchActivity, toast, me } = useStore()
  const mobile = useIsMobile()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<Role | 'Semua'>('Semua')
  const [form, setForm] = useState<User | null>(null)
  const [err, setErr] = useState<Record<string, string>>({})
  const [deact, setDeact] = useState<User | null>(null)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [reset, setReset] = useState<User | null>(null)
  const [resetPw, setResetPw] = useState('')
  const [resetErr, setResetErr] = useState('')
  const [detail, setDetail] = useState<User | null>(null)
  const [logs, setLogs] = useState<ActivityEntry[] | null>(null)
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true)
    try {
      await fn()
      toast(ok)
      return true
    } catch (e) {
      toast((e as Error).message, 'danger')
      return false
    } finally {
      setBusy(false)
    }
  }

  const list = users.filter((u) => (role === 'Semua' || u.role === role) && [u.nama, u.nim_nip, u.email].some((v) => v.toLowerCase().includes(q.toLowerCase())))
  const onlineCount = users.filter(isOnline).length

  const openDetail = async (u: User) => {
    setDetail(u)
    setLogs(null)
    try {
      const all = await fetchActivity()
      setLogs(all.filter((a) => a.userId === u.id))
    } catch (e) {
      toast((e as Error).message, 'danger')
      setLogs([])
    }
  }

  const save = async () => {
    if (!form) return
    const n: Record<string, string> = {}
    if (form.nama.trim().length < 3) n.nama = 'Nama minimal 3 karakter.'
    if (!/^[A-Za-z0-9]{5,20}$/.test(form.nim_nip)) n.nim = 'NIM/NIP harus 5–20 karakter huruf atau angka.'
    else if (users.some((u) => u.nim_nip === form.nim_nip && u.id !== form.id)) n.nim = 'NIM/NIP sudah dipakai.'
    if (!isCampusEmail(form.email)) n.email = 'Email harus domain polibatam.ac.id.'
    if (!form.id && pw.length < 6) n.pw = 'Password awal minimal 6 karakter.'
    setErr(n)
    if (Object.keys(n).length) return
    if (await run(() => saveUser(form, pw), form.id ? 'Pengguna diperbarui' : 'Akun dibuat')) setForm(null)
  }
  const toggle = (u: User) => (u.aktif ? setDeact(u) : run(() => toggleUser(u), `${u.nama} diaktifkan kembali`))
  const doReset = async () => {
    if (resetPw.length < 6) return setResetErr('Password minimal 6 karakter.')
    if (reset && (await run(() => resetPassword(reset, resetPw), `Password ${reset.nama} direset`))) setReset(null)
  }

  const actions = (u: User) => (
    <div className="flex items-center justify-end gap-1">
      <IconButton icon="eye" label={`Detail ${u.nama}`} onClick={() => openDetail(u)} />
      <IconButton icon="edit" label={`Edit ${u.nama}`} onClick={() => { setErr({}); setForm(u) }} />
      <Button variant="ghost" className="min-h-9 px-3 text-[13px]" onClick={() => { setResetPw(''); setResetErr(''); setReset(u) }}>Reset password</Button>
      {u.id !== me?.id && <Button variant="ghost" className={`min-h-9 px-3 text-[13px] ${u.aktif ? '!text-danger' : ''}`} onClick={() => toggle(u)}>{u.aktif ? 'Nonaktifkan' : 'Aktifkan'}</Button>}
    </div>
  )
  const status = (u: User) => <Pill tone={u.aktif ? 'green' : 'gray'}>{u.aktif ? 'Aktif' : 'Nonaktif'}</Pill>
  const presence = (u: User) => (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
      <span className={`size-2.5 rounded-full ${isOnline(u) ? 'animate-pulse bg-success' : 'bg-black/20'}`} />
      {isOnline(u) ? 'Online' : 'Offline'}
    </span>
  )
  const lastActive = (u: User) => (
    <span className="flex flex-col"><span>{timeAgo(u.lastSeen)}</span>{u.lastSeen && <span className="text-[12px] text-ink-2">{fmtDateTime(u.lastSeen)}</span>}</span>
  )

  const loginHistory = (logs ?? []).filter((a) => ['login', 'logout', 'login_gagal'].includes(a.action)).slice(0, 12)

  return (
    <div>
      <PageHeader title="Kelola Pengguna" subtitle={`${users.filter((u) => u.aktif).length} aktif · ${onlineCount} online sekarang`} action={<Button icon="plus" onClick={() => { setErr({}); setPw(''); setForm(blank) }}>Tambah Pengguna</Button>} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="glass lg-rim rounded-[16px] p-1 lg:w-80"><SearchBox value={q} onChange={setQ} placeholder="Cari nama, NIM/NIP, email" /></div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">{(['Semua', ...ROLES] as const).map((r) => <Chip key={r} active={role === r} onClick={() => setRole(r)}>{r}</Chip>)}</div>
      </div>

      <DataGate>
      {list.length === 0 ? (
        <Glass><Empty icon="users" title="Pengguna tidak ditemukan" desc="Coba kata kunci atau filter peran lain." /></Glass>
      ) : mobile ? (
        <div className="flex flex-col gap-2.5">
          {list.map((u) => (
            <Glass key={u.id} className={`p-4 ${u.aktif ? '' : 'opacity-70'}`}>
              <div className="flex items-center gap-3">
                <Avatar name={u.nama} src={u.foto} />
                <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold">{u.nama}</p><p className="truncate text-[13px] text-ink-2">{u.nim_nip} · {u.email}</p></div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
                <span className="flex flex-col"><span className="text-[12px] text-ink-2">Status</span>{presence(u)}</span>
                <span className="flex flex-col"><span className="text-[12px] text-ink-2">Lokasi</span><span>{u.kota || '-'}</span></span>
                <span className="col-span-2 flex flex-col"><span className="text-[12px] text-ink-2">Terakhir aktif</span>{lastActive(u)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between"><div className="flex gap-1.5"><Pill tone="blue">{u.role}</Pill>{status(u)}</div>{actions(u)}</div>
            </Glass>
          ))}
        </div>
      ) : (
        <Glass className="table-scroll overflow-x-auto p-0">
          <table className="w-full min-w-[1080px] text-left text-[14px]">
            <thead className="text-[12px] font-semibold uppercase tracking-wide text-ink-2"><tr className="border-b border-white/70"><th className="px-4 py-3">Nama</th><th className="px-4 py-3">NIM/NIP</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Peran</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Terakhir aktif</th><th className="px-4 py-3">Lokasi</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className={`border-b border-white/50 last:border-0 hover:bg-white/40 ${u.aktif ? '' : 'text-ink-2'}`}>
                  <td className="px-4 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={u.nama} src={u.foto} className="size-8 text-[12px]" /><span className="font-semibold">{u.nama}</span></div></td>
                  <td className="px-4 py-2.5 tabular-nums">{u.nim_nip}</td>
                  <td className="px-4 py-2.5">{u.email}</td>
                  <td className="px-4 py-2.5"><Pill tone="blue">{u.role}</Pill></td>
                  <td className="px-4 py-2.5"><div className="flex flex-col gap-1">{status(u)}{presence(u)}</div></td>
                  <td className="px-4 py-2.5">{lastActive(u)}</td>
                  <td className="px-4 py-2.5">{u.kota || '-'}</td>
                  <td className="px-4 py-2.5">{actions(u)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      )}
      </DataGate>

      <Overlay open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Pengguna' : 'Tambah Pengguna'}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Batal</Button><Button onClick={save} loading={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button></>}>
        {form && (
          <div className="flex flex-col gap-4">
            <Field label="Nama lengkap" error={err.nama} htmlFor="un"><Input id="un" value={form.nama} error={err.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Field>
            <Field label="NIM/NIP" error={err.nim} htmlFor="ui"><Input id="ui" value={form.nim_nip} error={err.nim} onChange={(e) => setForm({ ...form, nim_nip: e.target.value })} /></Field>
            <Field label="Email" error={err.email} htmlFor="ue"><Input id="ue" type="email" placeholder="nama@polibatam.ac.id" value={form.email} error={err.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Peran" helper="Ubah peran juga tercatat di log aktivitas.">
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {ROLES.map((r) => (
                  <button key={r} role="radio" aria-checked={form.role === r} onClick={() => setForm({ ...form, role: r })}
                    className={`tap min-h-11 rounded-[14px] border text-[14px] font-semibold ${form.role === r ? 'border-primary bg-primary/10 text-primary-pressed' : 'border-white/90 bg-white/60'}`}>{r}</button>
                ))}
              </div>
            </Field>
            {!form.id && <Field label="Password awal" error={err.pw} helper="Berikan ke pengguna; mereka bisa menggantinya di Profil." htmlFor="up"><Input id="up" type="text" value={pw} error={err.pw} onChange={(e) => setPw(e.target.value)} /></Field>}
          </div>
        )}
      </Overlay>

      <Overlay open={!!detail} onClose={() => setDetail(null)} title="Detail & aktivitas" wide>
        {detail && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <Avatar name={detail.nama} src={detail.foto} className="size-12 text-[17px]" />
              <div className="min-w-0"><p className="text-[17px] font-semibold">{detail.nama}</p><p className="text-[13px] text-ink-2">{detail.nim_nip} · {detail.email}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-[14px] bg-white/55 p-3"><p className="text-[12px] text-ink-2">Peran</p><p className="mt-1 text-[14px] font-semibold">{detail.role}</p></div>
              <div className="rounded-[14px] bg-white/55 p-3"><p className="text-[12px] text-ink-2">Akun</p><p className="mt-1">{status(detail)}</p></div>
              <div className="rounded-[14px] bg-white/55 p-3"><p className="text-[12px] text-ink-2">Status</p><p className="mt-1">{presence(detail)}</p></div>
              <div className="rounded-[14px] bg-white/55 p-3"><p className="text-[12px] text-ink-2">Lokasi</p><p className="mt-1 text-[14px] font-semibold">{detail.kota || '-'}</p></div>
            </div>
            <p className="-mt-2 text-[13px] text-ink-2">Terakhir aktif {timeAgo(detail.lastSeen)}{detail.lastSeen ? ` · ${fmtDateTime(detail.lastSeen)}` : ''}</p>

            <div>
              <h3 className="mb-2 text-[16px] font-semibold">Riwayat login</h3>
              {logs === null ? <Skeleton className="h-24" /> : loginHistory.length === 0 ? <p className="text-[14px] text-ink-2">Belum ada catatan login.</p> : (
                <ul className="flex flex-col gap-2">
                  {loginHistory.map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-[12px] bg-white/55 px-3 py-2 text-[14px]">
                      <Icon name={STATUS_ICON[a.action] ?? 'info'} className={`size-4 ${a.action === 'login_gagal' ? 'text-danger' : a.action === 'login' ? 'text-success' : 'text-ink-2'}`} />
                      <span className="font-medium">{actionLabel(a.action)}</span>
                      {a.detail && <span className="text-ink-2">· {a.detail}</span>}
                      <span className="ml-auto whitespace-nowrap text-[12px] text-ink-2">{fmtDateTime(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="mb-2 text-[16px] font-semibold">Log aktivitas per pengguna</h3>
              {logs === null ? <Skeleton className="h-40" /> : (logs ?? []).length === 0 ? <p className="text-[14px] text-ink-2">Belum ada aktivitas tercatat.</p> : (
                <ul className="flex flex-col gap-2">
                  {(logs ?? []).slice(0, 40).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 rounded-[12px] bg-white/55 px-3 py-2 text-[14px]">
                      <span className="font-medium">{actionLabel(a.action)}</span>
                      {a.detail && <span className="min-w-0 truncate text-ink-2">· {a.detail}</span>}
                      <span className="ml-auto whitespace-nowrap text-[12px] text-ink-2">{timeAgo(a.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Overlay>

      <Confirm open={!!deact} onClose={() => setDeact(null)} tone="danger" confirmLabel="Nonaktifkan" title="Nonaktifkan pengguna?"
        message={`${deact?.nama} tidak akan bisa masuk dan membuat booking baru sampai diaktifkan kembali.`}
        onConfirm={() => { if (deact) run(() => toggleUser(deact), `${deact.nama} dinonaktifkan`); setDeact(null) }} />
      <Overlay open={!!reset} onClose={() => setReset(null)} title="Reset password"
        footer={<><Button variant="secondary" onClick={() => setReset(null)}>Batal</Button><Button onClick={doReset} loading={busy}>{busy ? 'Menyimpan…' : 'Reset'}</Button></>}>
        <div className="flex flex-col gap-4">
          <p className="text-[14px] text-ink-2">Atur password sementara untuk <b className="text-ink">{reset?.nama}</b>. Pengguna akan mendapat notifikasi untuk segera menggantinya.</p>
          <Field label="Password sementara" error={resetErr} htmlFor="rp"><Input id="rp" type="text" value={resetPw} error={resetErr} onChange={(e) => { setResetPw(e.target.value); setResetErr('') }} /></Field>
        </div>
      </Overlay>
    </div>
  )
}
