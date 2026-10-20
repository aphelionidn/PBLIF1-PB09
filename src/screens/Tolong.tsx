import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Button, Empty, Field, Glass, Icon, Input, Overlay, PageHeader, Pill, SearchBox, inputCls, useIsMobile } from '../components/ui'
import { fmtDateTime, timeAgo, type ChatStatus, type ChatTicket } from '../data'
import { useStore } from '../store'

const FILTERS: (ChatStatus | 'semua')[] = ['semua', 'Terbuka', 'Selesai']
const tone = (s: ChatStatus) => (s === 'Selesai' ? 'green' : 'blue')

export default function Tolong() {
  const { me, role, chats, createTicket, sendChat, setChatStatus, markChatRead, toast } = useStore()
  const mobile = useIsMobile()
  const isAdmin = role === 'Admin'
  const [sel, setSel] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ChatStatus | 'semua'>('semua')
  const [newOpen, setNewOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [first, setFirst] = useState('')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const lastText = (t: ChatTicket) => t.messages[t.messages.length - 1]?.text ?? ''
  const unread = (t: ChatTicket) =>
    me ? t.messages.filter((m) => m.userId !== me.id && !m.readBy?.includes(me.id)).length : 0

  const list = useMemo(() => {
    const ql = q.trim().toLowerCase()
    return [...chats]
      .filter((t) => (filter === 'semua' ? true : t.status === filter))
      .filter((t) =>
        ql
          ? [t.subject, t.by, lastText(t)].some((v) => v.toLowerCase().includes(ql))
          : true,
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chats, q, filter])

  const current = chats.find((t) => t.id === sel) ?? null

  // Tandai pesan orang lain sebagai dibaca saat tiket dibuka / ada pesan baru.
  useEffect(() => {
    if (current) markChatRead([current.id])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, current?.messages.length])

  // Gulir ke pesan terbaru saat berpindah tiket atau mengirim pesan.
  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight })
  }, [current?.id, current?.messages.length])

  const open = (id: string) => setSel(id)

  const submitNew = async () => {
    if (subject.trim().length < 3) return toast('Subjek minimal 3 karakter.', 'danger')
    if (first.trim().length < 3) return toast('Pesan minimal 3 karakter.', 'danger')
    setBusy(true)
    const ok = await createTicket(subject.trim(), first.trim())
    setBusy(false)
    if (ok) {
      toast('Tiket terkirim ke Admin')
      setSubject(''); setFirst(''); setNewOpen(false); setFilter('semua')
    }
  }

  const send = async () => {
    if (!current || !draft.trim()) return
    setBusy(true)
    const ok = await sendChat(current.id, draft.trim())
    setBusy(false)
    if (ok) setDraft('')
  }

  const toggleStatus = async () => {
    if (!current) return
    const next: ChatStatus = current.status === 'Terbuka' ? 'Selesai' : 'Terbuka'
    const ok = await setChatStatus(current.id, next)
    if (ok) toast(next === 'Selesai' ? 'Tiket ditutup' : 'Tiket dibuka kembali')
  }

  const detail = current ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-white/60 px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={tone(current.status)}>{current.status}</Pill>
            {isAdmin && <span className="text-[12px] font-medium text-ink-2">{current.by} · {current.role}</span>}
          </div>
          <h2 className="mt-1.5 truncate text-[17px] font-semibold">{current.subject}</h2>
          <p className="text-[12px] text-ink-2">Dibuat {fmtDateTime(current.at)}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" icon={current.status === 'Terbuka' ? 'check' : 'refresh'} onClick={toggleStatus} className="min-h-9 px-3 text-[13px]">
            {current.status === 'Terbuka' ? 'Tandai selesai' : 'Buka lagi'}
          </Button>
        </div>
      </div>

      <div ref={boxRef} className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
        {current.messages.map((m) => {
          const mine = m.userId === me?.id
          return (
            <div key={m.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
              {!mine && <Avatar name={m.by} className="size-8 text-[12px]" />}
              <div className={`max-w-[78%] rounded-[16px] px-3.5 py-2.5 ${mine ? 'bg-primary text-on' : 'glass lg-rim'}`}>
                {!mine && <p className="mb-0.5 text-[12px] font-semibold text-ink-2">{m.by}{isAdmin ? ` · ${m.role}` : ''}</p>}
                <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">{m.text}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'text-on/70' : 'text-ink-2'}`}>{fmtDateTime(m.at)}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-end gap-2 border-t border-white/60 px-4 py-3">
        <textarea
          rows={1}
          value={draft}
          disabled={current.status === 'Selesai'}
          placeholder={current.status === 'Selesai' ? 'Tiket selesai — tekan “Buka lagi” untuk membalas.' : 'Tulis balasan…'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          className={`${inputCls()} max-h-32 min-h-11 flex-1 resize-none py-2.5 leading-relaxed disabled:opacity-60`}
        />
        <Button icon="right" onClick={send} loading={busy} disabled={!draft.trim() || current.status === 'Selesai'} className="shrink-0">Kirim</Button>
      </div>
    </div>
  ) : (
    <Empty
      icon="mail"
      title={isAdmin ? 'Pilih tiket untuk dibalas' : 'Pilih salah satu tiket'}
      desc={isAdmin ? 'Semua tiket bantuan pengguna muncul di panel kiri.' : 'Pilih tiket di panel kiri, atau buat tiket baru bila butuh bantuan.'}
    />
  )

  return (
    <div>
      <PageHeader
        title="Tolong.in"
        subtitle={isAdmin ? 'Kotak masuk tiket bantuan dari pengguna.' : 'Butuh bantuan? Buat tiket dan ngobrol dengan Admin.'}
        action={!isAdmin ? <Button icon="plus" onClick={() => setNewOpen(true)}>Tiket baru</Button> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Glass className="flex h-[calc(100vh-230px)] min-h-[420px] flex-col overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-white/60 p-3">
            <SearchBox value={q} onChange={setQ} placeholder="Cari subjek, pengirim, pesan" />
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={`tap min-h-8 rounded-full px-3 text-[12px] font-semibold ${filter === f ? 'bg-ink text-canvas' : 'glass lg-rim text-ink-2 hover:bg-white/70'}`}
                >
                  {f === 'semua' ? 'Semua' : f}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {list.length === 0 ? (
              <div className="px-3 py-10 text-center text-[14px] text-ink-2">
                {isAdmin ? 'Belum ada tiket masuk.' : 'Belum ada tiket. Tekan “Tiket baru” untuk mulai.'}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {list.map((t) => {
                  const n = unread(t)
                  const active = t.id === sel
                  return (
                    <button
                      key={t.id}
                      onClick={() => open(t.id)}
                      className={`tap flex w-full flex-col gap-1 rounded-[14px] p-3 text-left ${active ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-white/60'}`}
                    >
                      <div className="flex w-full items-center gap-2">
                        <p className="min-w-0 flex-1 truncate text-[14px] font-semibold">{t.subject}</p>
                        {n > 0 && <span className="shrink-0 rounded-full bg-danger px-1.5 text-[11px] font-semibold leading-[18px] text-on">{n}</span>}
                        <Pill tone={tone(t.status)}>{t.status}</Pill>
                      </div>
                      {isAdmin && <p className="truncate text-[12px] font-medium text-primary-pressed">{t.by} · {t.role}</p>}
                      <p className="w-full truncate text-[13px] text-ink-2">{lastText(t)}</p>
                      <p className="text-[11px] text-ink-2">{timeAgo(t.updatedAt)}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </Glass>

        {!mobile && <Glass className="h-[calc(100vh-230px)] min-h-[420px] overflow-hidden">{detail}</Glass>}
      </div>

      {/* Detail sebagai sheet di mobile */}
      {mobile && (
        <Overlay open={!!current} onClose={() => setSel(null)} title={current?.subject ?? 'Tiket'}>
          <div className="flex h-[70vh] flex-col">{detail}</div>
        </Overlay>
      )}

      {/* Tiket baru */}
      <Overlay
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Tiket baru"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>Batal</Button>
            <Button icon="sparkle" onClick={submitNew} loading={busy}>Kirim ke Admin</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Field label="Subjek" htmlFor="tk-subject" helper="Ringkas, mis. “Proyektor rusak di B204”.">
            <Input id="tk-subject" value={subject} placeholder="Tulis subjek tiket" onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Pesan" htmlFor="tk-first">
            <textarea
              id="tk-first"
              rows={4}
              value={first}
              placeholder="Jelaskan kendala atau pertanyaanmu…"
              onChange={(e) => setFirst(e.target.value)}
              className={`${inputCls()} resize-y py-2.5 leading-relaxed`}
            />
          </Field>
          <p className="flex items-start gap-1.5 text-[12px] text-ink-2">
            <Icon name="info" className="mt-0.5 size-4 shrink-0" />
            Admin akan membalas di halaman ini. Kamu dapat menutup tiket bila sudah selesai.
          </p>
        </div>
      </Overlay>
    </div>
  )
}
