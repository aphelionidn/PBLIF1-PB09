import { useState } from 'react'
import { lateDays } from '../components/LoanDetail'
import { Avatar, Button, DataGate, Empty, Field, Glass, Overlay, PageHeader, Pill, StatusBadge, inputCls, useIsMobile } from '../components/ui'
import { fmtDate, fmtRange, type Kondisi, type Loan } from '../data'
import { useStore } from '../store'

const KONDISI: Kondisi[] = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Hilang']

export default function AdminReturns() {
  const { loans, userById, itemNames, itemById, recordReturn, toast, today } = useStore()
  const mobile = useIsMobile()
  const [sel, setSel] = useState<Loan | null>(null)
  const [conds, setConds] = useState<Record<string, Kondisi>>({})
  const [note, setNote] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})

  const list = loans.filter((l) => l.status === 'Dipinjam' || l.status === 'Terlambat').sort((a) => (a.status === 'Terlambat' ? -1 : 1))
  const open = (l: Loan) => { setSel(l); setConds({}); setNote(''); setErr({}) }
  const submit = async () => {
    if (!sel) return
    const n: Record<string, string> = {}
    sel.items.forEach((i) => { if (!conds[i.itemId]) n[i.itemId] = 'Pilih kondisi barang.' })
    if (Object.values(conds).some((c) => c !== 'Baik') && note.trim().length < 5) n.note = 'Catatan wajib diisi jika ada barang rusak atau hilang.'
    setErr(n)
    if (Object.keys(n).length) return
    if (!(await recordReturn(sel.id, conds, note.trim()))) return
    toast(`Pengembalian ${sel.id} dicatat`)
    setSel(null)
  }
  const late = (l: Loan) => (l.status === 'Terlambat' ? <Pill tone="red">Terlambat {lateDays(l, today)} hari</Pill> : <Pill tone="gray">Kembali {fmtDate(l.end)}</Pill>)

  return (
    <div>
      <PageHeader title="Pengembalian" subtitle={`${list.length} peminjaman belum dikembalikan`} />
      <DataGate>
      {list.length === 0 ? (
        <Glass><Empty icon="return" title="Semua barang sudah kembali" desc="Tidak ada peminjaman berstatus Dipinjam atau Terlambat." /></Glass>
      ) : mobile ? (
        <div className="flex flex-col gap-2.5">
          {list.map((l) => (
            <Glass key={l.id} className={`flex flex-col gap-3 p-4 ${l.status === 'Terlambat' ? 'ring-2 ring-danger/40' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="text-[12px] font-medium text-ink-2">{l.id} · {fmtRange(l.start, l.end)}</p><p className="text-[15px] font-semibold">{itemNames(l)}</p><p className="text-[13px] text-ink-2">{userById(l.userId)?.nama}</p></div>
                <StatusBadge status={l.status} />
              </div>
              <div className="flex items-center justify-between gap-2">{late(l)}<Button icon="return" onClick={() => open(l)}>Catat</Button></div>
            </Glass>
          ))}
        </div>
      ) : (
        <Glass className="table-scroll overflow-x-auto p-0">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="text-[12px] font-semibold uppercase tracking-wide text-ink-2"><tr className="border-b border-white/70"><th className="px-4 py-3">Peminjam</th><th className="px-4 py-3">Barang</th><th className="px-4 py-3">Periode</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Keterlambatan</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody>
              {list.map((l) => {
                const u = userById(l.userId)
                return (
                  <tr key={l.id} className="border-b border-white/50 last:border-0 hover:bg-white/40">
                    <td className="px-4 py-3"><div className="flex items-center gap-2.5"><Avatar name={u?.nama ?? '?'} src={u?.foto} className="size-8 text-[12px]" /><div><p className="font-semibold">{u?.nama}</p><p className="text-[12px] text-ink-2">{l.id}</p></div></div></td>
                    <td className="max-w-[240px] truncate px-4 py-3 font-medium">{itemNames(l)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{fmtRange(l.start, l.end)}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                    <td className="px-4 py-3">{late(l)}</td>
                    <td className="px-4 py-3 text-right"><Button icon="return" className="min-h-9 text-[13px]" onClick={() => open(l)}>Catat Pengembalian</Button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Glass>
      )}
      </DataGate>

      <Overlay open={!!sel} onClose={() => setSel(null)} title="Catat Pengembalian"
        footer={<><Button variant="secondary" onClick={() => setSel(null)}>Batal</Button><Button variant="success" icon="check" onClick={submit}>Simpan</Button></>}>
        {sel && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-[16px] bg-white/55 p-3">
              <div><p className="text-[12px] font-medium text-ink-2">{sel.id}</p><p className="text-[15px] font-semibold">{userById(sel.userId)?.nama}</p></div>
              {late(sel)}
            </div>
            {sel.items.map((li) => (
              <Field key={li.itemId} label={`${itemById(li.itemId)?.nama} ×${li.qty}`} error={err[li.itemId]}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup">
                  {KONDISI.map((k) => (
                    <button key={k} role="radio" aria-checked={conds[li.itemId] === k} onClick={() => setConds({ ...conds, [li.itemId]: k })}
                      className={`tap min-h-11 rounded-[12px] border px-2 text-[13px] font-semibold ${conds[li.itemId] === k ? (k === 'Baik' ? 'border-success bg-tint-green text-success' : 'border-danger bg-tint-red text-danger') : 'border-white/90 bg-white/60'}`}>{k}</button>
                  ))}
                </div>
              </Field>
            ))}
            <Field label="Catatan" error={err.note} htmlFor="rn" helper="Wajib jika ada barang rusak atau hilang.">
              <textarea id="rn" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: Kabel sedikit tertekuk di ujung." className={`${inputCls(err.note)} py-3`} />
            </Field>
          </div>
        )}
      </Overlay>
    </div>
  )
}
