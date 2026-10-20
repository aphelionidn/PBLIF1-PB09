import { useState, type FormEvent } from 'react'
import ScrollPreview from '../components/ScrollPreview'
import { Logo } from '../components/Shell'
import { Button, Field, Icon, Input, inputCls } from '../components/ui'
import { isCampusEmail } from '../data'
import { useStore } from '../store'

function Password({ id, value, onChange, error, placeholder }: { id: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-invalid={!!error} className={`${inputCls(error)} pr-12`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'} className="absolute right-0.5 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-[12px] text-ink-2 hover:text-ink">
        <Icon name={show ? 'eyeOff' : 'eye'} />
      </button>
    </div>
  )
}

function Login() {
  const { login, serverError, boot } = useStore()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState<{ id?: string; pw?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n: typeof err = {}
    if (!id.trim()) n.id = 'Email atau NIM/NIP wajib diisi.'
    else if (id.includes('@') && !isCampusEmail(id)) n.id = 'Gunakan email @polibatam.ac.id.'
    if (!pw) n.pw = 'Password wajib diisi.'
    else if (pw.length < 6) n.pw = 'Password minimal 6 karakter.'
    setErr(n)
    if (Object.keys(n).length) return
    setLoading(true)
    try {
      await login(id.trim(), pw)
    } catch (e) {
      setErr({ form: (e as Error).message })
      setLoading(false)
    }
  }
  return (
    <>
      <h2 className="text-[28px] font-bold tracking-tight">Masuk</h2>
      <p className="mt-1 text-[15px] text-ink-2">Gunakan akun kampus kamu untuk meminjam barang.</p>
      {serverError && (
        <div role="alert" className="mt-4 rounded-[14px] bg-tint-orange p-3 text-[14px] font-medium text-warning">
          <p className="flex gap-2"><Icon name="alert" className="size-5 shrink-0" />Server belum bisa dihubungi: {serverError}</p>
          <button onClick={boot} className="ml-7 mt-1 font-semibold underline">Coba lagi</button>
        </div>
      )}
      {err.form && <div role="alert" className="mt-4 flex gap-2 rounded-[14px] bg-tint-red p-3 text-[14px] font-medium text-danger"><Icon name="alert" className="size-5 shrink-0" />{err.form}</div>}
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4" noValidate>
        <Field label="Email atau NIM/NIP" error={err.id} htmlFor="id">
          <Input id="id" value={id} onChange={(e) => setId(e.target.value)} placeholder="NIM/NIP atau email @polibatam.ac.id" error={err.id} autoComplete="username" />
        </Field>
        <Field label="Password" error={err.pw} htmlFor="pw">
          <Password id="pw" value={pw} onChange={setPw} error={err.pw} placeholder="Minimal 6 karakter" />
        </Field>
        <Button type="submit" loading={loading} className="mt-1 w-full">{loading ? 'Memproses…' : 'Masuk'}</Button>
      </form>
      <p className="mt-4 text-center text-[13px] text-ink-2">Belum punya akun atau lupa password? Hubungi Admin pengelola.</p>
    </>
  )
}

export default function Auth() {
  return (
    <div className="min-h-screen md:grid md:grid-cols-[1.1fr_1fr]">
      {/* Brand panel (desktop) */}
      <section className="relative hidden h-screen flex-col gap-6 overflow-hidden p-10 md:sticky md:top-0 md:flex lg:p-12">
        <Logo />
        <div className="max-w-lg">
          <p className="mb-3 inline-flex rounded-full bg-white/60 px-3 py-1 text-[13px] font-semibold text-ink-2">Peminjaman Barang dan Peralatan Kelas</p>
          <h1 className="text-[40px] font-bold leading-[1.05] tracking-[-0.03em] lg:text-[48px]">Proyektor, kabel, spidol — <span className="logo-text">tinggal pinjam.</span></h1>
          <p className="mt-3 max-w-md text-[16px] text-ink-2">Cek ketersediaan, ajukan booking, dan pantau status peminjaman alat kelas dari satu tempat.</p>
        </div>
        <div className="min-h-0 flex-1"><ScrollPreview /></div>
        <div className="flex gap-3">
          {[['8', 'Jenis barang'], ['41', 'Unit tersedia'], ['1×', 'Persetujuan cukup']].map(([a, b]) => (
            <div key={b} className="glass rounded-[18px] px-5 py-3"><p className="text-[24px] font-bold">{a}</p><p className="text-[13px] font-medium text-ink-2">{b}</p></div>
          ))}
        </div>
      </section>
      <section className="flex min-h-screen items-start justify-center px-4 pb-28 pt-10 md:items-center md:p-10">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex flex-col items-center text-center md:hidden">
            <div className="mb-3 scale-125"><Logo compact /></div>
            <p className="text-[28px] font-bold tracking-tight">Pinjam<span className="logo-text">.in</span></p>
            <p className="text-[14px] font-medium text-ink-2">Peminjaman Barang dan Peralatan Kelas</p>
          </div>
          <div className="mb-5 md:hidden"><ScrollPreview horizontal /></div>
          <div className="anim-pop">
            <div className="glass glass-strong rounded-[28px] p-6 md:p-8">
              <Login />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
