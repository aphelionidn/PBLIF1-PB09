import SimDate from '../components/SimDate'
import WallpaperPicker from '../components/WallpaperPicker'
import { useRef, useState } from 'react'
import { Avatar, Button, Field, Glass, Icon, Input, Overlay, Pill, Segmented } from '../components/ui'
import { useStore, type Theme } from '../store'

function EditProfile({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, updateProfile, toast } = useStore()
  const [f, setF] = useState({ nama: me?.nama ?? '', hp: me?.hp ?? '', kota: me?.kota ?? '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const n: Record<string, string> = {}
    if (f.nama.trim().length < 3) n.nama = 'Nama minimal 3 karakter.'
    if (f.hp && !/^\+?[0-9 ]{8,16}$/.test(f.hp)) n.hp = 'Nomor HP 8–16 digit.'
    setErr(n)
    if (Object.keys(n).length) return
    setBusy(true)
    try {
      await updateProfile(f)
      toast('Profil diperbarui')
      onClose()
    } catch (e) {
      setErr({ form: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Overlay open={open} onClose={onClose} title="Edit profil" footer={<Button className="w-full" loading={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>}>
      <div className="flex flex-col gap-4">
        {err.form && <p role="alert" className="rounded-[14px] bg-tint-red p-3 text-[14px] font-medium text-danger">{err.form}</p>}
        <Field label="Nama lengkap" error={err.nama} htmlFor="pn"><Input id="pn" value={f.nama} error={err.nama} onChange={(e) => setF({ ...f, nama: e.target.value })} /></Field>
        <Field label="Nomor HP" error={err.hp} helper="Opsional, untuk dihubungi Admin." htmlFor="ph"><Input id="ph" inputMode="tel" value={f.hp} error={err.hp} placeholder="08xx xxxx xxxx" onChange={(e) => setF({ ...f, hp: e.target.value })} /></Field>
        <Field label="Kota" helper="Cukup nama kota." htmlFor="pk"><Input id="pk" value={f.kota} placeholder="contoh: Bandung" onChange={(e) => setF({ ...f, kota: e.target.value })} /></Field>
        <p className="text-[12px] text-ink-2">NIM/NIP, email, dan peran hanya bisa diubah Admin.</p>
      </div>
    </Overlay>
  )
}

function ChangePassword({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { changePassword, toast } = useStore()
  const [f, setF] = useState({ cur: '', pw: '', pw2: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const save = async () => {
    const n: Record<string, string> = {}
    if (!f.cur) n.cur = 'Password saat ini wajib diisi.'
    if (f.pw.length < 6) n.pw = 'Password baru minimal 6 karakter.'
    if (f.pw2 !== f.pw) n.pw2 = 'Konfirmasi tidak sama.'
    setErr(n)
    if (Object.keys(n).length) return
    setBusy(true)
    try {
      await changePassword(f.cur, f.pw)
      toast('Password diganti')
      setF({ cur: '', pw: '', pw2: '' })
      onClose()
    } catch (e) {
      setErr({ form: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }
  return (
    <Overlay open={open} onClose={onClose} title="Ganti password" footer={<Button className="w-full" loading={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Ganti password'}</Button>}>
      <div className="flex flex-col gap-4">
        {err.form && <p role="alert" className="rounded-[14px] bg-tint-red p-3 text-[14px] font-medium text-danger">{err.form}</p>}
        <Field label="Password saat ini" error={err.cur} htmlFor="c0"><Input id="c0" type="password" autoComplete="current-password" value={f.cur} error={err.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} /></Field>
        <Field label="Password baru" error={err.pw} htmlFor="c1"><Input id="c1" type="password" autoComplete="new-password" value={f.pw} error={err.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} /></Field>
        <Field label="Ulangi password baru" error={err.pw2} htmlFor="c2"><Input id="c2" type="password" autoComplete="new-password" value={f.pw2} error={err.pw2} onChange={(e) => setF({ ...f, pw2: e.target.value })} /></Field>
      </div>
    </Overlay>
  )
}

export default function Profile() {
  const { me, logout, simError, setSimError, theme, setTheme, performanceMode, setPerformanceMode, wireframeMode, setWireframeMode, uploadPhoto, updateProfile, toast } = useStore()
  const [sheet, setSheet] = useState<'edit' | 'pw' | null>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const photo = useRef<HTMLInputElement>(null)
  if (!me) return null

  const savePhoto = async (url: string) => {
    setPhotoBusy(true)
    try {
      await updateProfile({ nama: me.nama, hp: me.hp ?? '', kota: me.kota ?? '', foto: url })
      toast(url ? 'Foto profil diperbarui' : 'Foto profil dihapus')
    } catch (e) {
      toast((e as Error).message, 'danger')
    } finally {
      setPhotoBusy(false)
    }
  }
  const pickPhoto = async (f?: File) => {
    if (!f) return
    const url = await uploadPhoto(f, 'avatar')
    if (url) await savePhoto(url)
  }
  const rows = [['NIM/NIP', me.nim_nip, 'tag'], ['Email', me.email, 'mail'], ['Peran', me.role, 'user'], ['Nomor HP', me.hp || '—', 'info'], ['Kota', me.kota || '—', 'info']]
  return (
    <div className="mx-auto flex max-w-[560px] flex-col gap-4 md:pt-6">
      <Glass className="glass-strong flex flex-col items-center p-8 text-center">
        <input ref={photo} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
        <div className="relative">
          <Avatar name={me.nama} src={me.foto} className="size-24 text-[34px] accent-shadow" />
          <button type="button" onClick={() => photo.current?.click()} disabled={photoBusy} aria-label="Ganti foto profil"
            className="tap accent-shadow absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-primary text-on disabled:opacity-60">
            <Icon name={photoBusy ? 'refresh' : 'pen'} className="size-4" />
          </button>
        </div>
        <h1 className="mt-4 text-[28px] font-bold tracking-tight">{me.nama}</h1>
        <div className="mt-2"><Pill tone="blue">{me.role}</Pill></div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" variant="secondary" icon="plus" onClick={() => photo.current?.click()} loading={photoBusy}>Foto profil</Button>
          {me.foto && <Button size="sm" variant="ghost" onClick={() => savePhoto('')} disabled={photoBusy}>Hapus foto</Button>}
        </div>
        <div className="mt-4 flex w-full gap-2">
          <Button variant="secondary" icon="edit" className="flex-1" onClick={() => setSheet('edit')}>Edit profil</Button>
          <Button variant="secondary" className="flex-1" onClick={() => setSheet('pw')}>Ganti password</Button>
        </div>
      </Glass>
      {sheet === 'edit' && <EditProfile open onClose={() => setSheet(null)} />}
      {sheet === 'pw' && <ChangePassword open onClose={() => setSheet(null)} />}
      <Glass className="overflow-hidden p-0">
        {rows.map(([k, v, ic]) => (
          <div key={k} className="flex items-center gap-3 border-b border-white/60 px-5 py-4 last:border-0">
            <span className="grid size-9 place-items-center rounded-[10px] bg-white/70 text-primary"><Icon name={ic} className="size-[18px]" /></span>
            <span className="text-[13px] font-medium text-ink-2">{k}</span>
            <span className="ml-auto truncate text-[15px] font-semibold">{v}</span>
          </div>
        ))}
      </Glass>
      <Glass className="p-4">
        <p className="mb-1 flex items-center gap-1.5 text-[14px] font-semibold"><Icon name={theme === 'dark' ? 'moon' : 'sun'} className="size-4 text-primary" />Tampilan</p>
        <p className="mb-3 text-[12px] text-ink-2">Pilihan disimpan di perangkat ini.</p>
        <Segmented<Theme> value={theme} onChange={setTheme} options={[{ value: 'light', label: 'Terang' }, { value: 'dark', label: 'Gelap' }, { value: 'system', label: 'Ikuti Sistem' }]} className="[&>*]:flex-1" />
      </Glass>
      <WallpaperPicker />
      <Glass className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-[14px] font-semibold"><Icon name="board" className="size-4 text-primary" />Mode wireframe</p>
          <p className="mt-1 text-[12px] text-ink-2">Tampilkan antarmuka sebagai rancangan monokrom dengan garis tegas dan tanpa dekorasi.</p>
        </div>
        <button role="switch" aria-checked={wireframeMode} aria-label="Mode wireframe" onClick={() => setWireframeMode(!wireframeMode)}
          className={`relative h-8 w-[52px] shrink-0 rounded-full border border-black/15 transition-colors ${wireframeMode ? 'bg-primary' : 'bg-black/15'}`}>
          <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${wireframeMode ? 'left-[24px]' : 'left-1'}`} />
        </button>
      </Glass>
      <Glass className="flex items-center justify-between gap-4 p-4">
        <div>
          <p className="flex items-center gap-1.5 text-[14px] font-semibold"><Icon name="monitor" className="size-4 text-primary" />Mode performa</p>
          <p className="mt-1 text-[12px] text-ink-2">Matikan seluruh animasi dan pemrosesan visual wallpaper untuk perangkat yang lebih lambat.</p>
        </div>
        <button role="switch" aria-checked={performanceMode} aria-label="Mode performa" onClick={() => setPerformanceMode(!performanceMode)}
          className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${performanceMode ? 'bg-primary' : 'bg-black/15'}`}>
          <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${performanceMode ? 'left-[24px]' : 'left-1'}`} />
        </button>
      </Glass>
      <SimDate />
      <Glass className="flex items-center justify-between gap-3 border-dashed p-4">
        <div><p className="text-[14px] font-semibold">Kontrol prototipe</p><p className="text-[12px] text-ink-2">Simulasikan galat saat memuat katalog.</p></div>
        <button role="switch" aria-checked={simError} aria-label="Simulasikan galat" onClick={() => setSimError(!simError)} className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors ${simError ? 'bg-success' : 'bg-black/15'}`}>
          <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${simError ? 'left-[24px]' : 'left-1'}`} />
        </button>
      </Glass>
      <Button variant="secondary" icon="logout" className="!text-danger" onClick={logout}>Keluar</Button>
    </div>
  )
}
