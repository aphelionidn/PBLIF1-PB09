import { useRef, useState } from 'react'
import { Button, Chip, Confirm, DataGate, Empty, Field, Glass, IconButton, Input, ItemThumb, Overlay, PageHeader, Pill, SearchBox, inputCls, useIsMobile } from '../components/ui'
import type { Item, Kondisi } from '../data'
import { useStore } from '../store'

const KONDISI: Kondisi[] = ['Baik', 'Rusak Ringan', 'Rusak Berat']
const blank = (kategori: string): Item => ({ id: '', nama: '', kategori, deskripsi: '', stok_total: 1, kondisi: 'Baik' })

export default function AdminItems() {
  const { items, categories, saveItem, deleteItem, addCategory, renameCategory, deleteCategory, uploadPhoto, toast } = useStore()
  const mobile = useIsMobile()
  const photo = useRef<HTMLInputElement>(null)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('Semua')
  const [form, setForm] = useState<Item | null>(null)
  const [err, setErr] = useState<Record<string, string>>({})
  const [del, setDel] = useState<Item | null>(null)
  const [catOpen, setCatOpen] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [editCat, setEditCat] = useState<{ old: string; val: string } | null>(null)
  const [catErr, setCatErr] = useState('')

  const list = items.filter((i) => (cat === 'Semua' || i.kategori === cat) && i.nama.toLowerCase().includes(q.toLowerCase()))

  const save = async () => {
    if (!form) return
    const n: Record<string, string> = {}
    if (form.nama.trim().length < 3) n.nama = 'Nama barang minimal 3 karakter.'
    if (!form.kategori) n.kategori = 'Pilih kategori.'
    if (!Number.isInteger(form.stok_total) || form.stok_total < 1) n.stok = 'Stok total minimal 1.'
    if (form.deskripsi.trim().length < 10) n.deskripsi = 'Deskripsi minimal 10 karakter.'
    setErr(n)
    if (Object.keys(n).length) return
    const ok = await saveItem({ ...form, id: form.id || 'i' + Date.now(), nama: form.nama.trim() })
    if (!ok) return
    toast(form.id ? 'Barang diperbarui' : 'Barang ditambahkan')
    setForm(null)
  }
  const catSubmit = async () => {
    const v = newCat.trim()
    if (!v) return setCatErr('Nama kategori wajib diisi.')
    if (categories.includes(v)) return setCatErr('Kategori sudah ada.')
    if (await addCategory(v)) { setNewCat(''); setCatErr(''); toast('Kategori ditambahkan') }
  }
  const catDelete = async (c: string) => {
    if (items.some((i) => i.kategori === c)) return setCatErr(`"${c}" masih dipakai barang, pindahkan barangnya dulu.`)
    if (await deleteCategory(c)) { setCatErr(''); toast('Kategori dihapus') }
  }

  const pickPhoto = async (f?: File) => {
    if (!f) return
    setPhotoBusy(true)
    const url = await uploadPhoto(f, 'item')
    setPhotoBusy(false)
    if (url) setForm((cur) => (cur ? { ...cur, foto: url } : cur))
  }

  const actions = (it: Item) => (
    <div className="flex justify-end gap-1">
      <IconButton icon="edit" label={`Edit ${it.nama}`} onClick={() => { setErr({}); setForm(it) }} />
      <IconButton icon="trash" label={`Hapus ${it.nama}`} className="!text-danger" onClick={() => setDel(it)} />
    </div>
  )

  return (
    <div>
      <PageHeader title="Kelola Barang" subtitle={`${items.length} jenis barang · ${categories.length} kategori`}
        action={<div className="flex gap-2"><Button variant="secondary" icon="tag" onClick={() => { setCatErr(''); setCatOpen(true) }}>Kategori</Button><Button icon="plus" onClick={() => { setErr({}); setForm(blank(categories[0] ?? '')) }}>Tambah Barang</Button></div>} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="glass lg-rim rounded-[16px] p-1 lg:w-80"><SearchBox value={q} onChange={setQ} placeholder="Cari nama barang" /></div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">{['Semua', ...categories].map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}</div>
      </div>

      <DataGate>
      {list.length === 0 ? (
        <Glass><Empty icon="box" title="Belum ada barang" desc="Tidak ada barang yang cocok dengan filter ini." action={<Button icon="plus" onClick={() => setForm(blank(categories[0] ?? ''))}>Tambah Barang</Button>} /></Glass>
      ) : mobile ? (
        <div className="flex flex-col gap-2.5">
          {list.map((it) => (
            <Glass key={it.id} className="flex items-center gap-3 p-3">
              <ItemThumb kategori={it.kategori} foto={it.foto} className="size-16 shrink-0 rounded-[14px] [&>div:last-child]:size-9 [&_svg]:size-5" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold">{it.nama}</p>
                <p className="text-[12px] text-ink-2">{it.kategori} · {it.stok_total} unit</p>
                <div className="mt-1"><Pill tone={it.kondisi === 'Baik' ? 'green' : 'orange'}>{it.kondisi}</Pill></div>
              </div>
              {actions(it)}
            </Glass>
          ))}
        </div>
      ) : (
        <Glass className="table-scroll overflow-x-auto p-0">
          <table className="w-full min-w-[680px] text-left text-[14px]">
            <thead className="text-[12px] font-semibold uppercase tracking-wide text-ink-2"><tr className="border-b border-white/70"><th className="px-4 py-3">Barang</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">Stok total</th><th className="px-4 py-3">Kondisi</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead>
            <tbody>
              {list.map((it) => (
                <tr key={it.id} className="border-b border-white/50 last:border-0 hover:bg-white/40">
                  <td className="px-4 py-2.5"><div className="flex items-center gap-3"><ItemThumb kategori={it.kategori} foto={it.foto} className="size-11 shrink-0 rounded-[12px] [&>div:last-child]:size-7 [&_svg]:size-4" /><span className="font-semibold">{it.nama}</span></div></td>
                  <td className="px-4 py-2.5 text-ink-2">{it.kategori}</td>
                  <td className="px-4 py-2.5 font-semibold">{it.stok_total} unit</td>
                  <td className="px-4 py-2.5"><Pill tone={it.kondisi === 'Baik' ? 'green' : 'orange'}>{it.kondisi}</Pill></td>
                  <td className="px-4 py-2.5">{actions(it)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Glass>
      )}
      </DataGate>

      <Overlay open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Edit Barang' : 'Tambah Barang'}
        footer={<><Button variant="secondary" onClick={() => setForm(null)}>Batal</Button><Button onClick={save}>Simpan</Button></>}>
        {form && (
          <div className="flex flex-col gap-4">
            <input ref={photo} type="file" accept="image/*" hidden onChange={(e) => { pickPhoto(e.target.files?.[0]); e.target.value = '' }} />
            <div className="flex items-center gap-3 rounded-[16px] border border-dashed border-ink-2/30 bg-white/40 p-3">
              <ItemThumb kategori={form.kategori} foto={form.foto} className="size-16 shrink-0 rounded-[14px] [&>div:last-child]:size-9 [&_svg]:size-5" />
              <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold">Foto barang</p><p className="text-[12px] text-ink-2">{form.foto ? 'Foto sudah diunggah.' : 'Belum ada foto — placeholder kategori dipakai.'}</p></div>
              <div className="flex shrink-0 flex-col gap-1.5">
                <Button size="sm" variant="secondary" icon="plus" onClick={() => photo.current?.click()} loading={photoBusy}>Unggah</Button>
                {form.foto && <Button size="sm" variant="ghost" onClick={() => setForm({ ...form, foto: undefined })} disabled={photoBusy}>Hapus</Button>}
              </div>
            </div>
            <Field label="Nama barang" error={err.nama} htmlFor="fn"><Input id="fn" value={form.nama} error={err.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kategori" error={err.kategori} htmlFor="fk"><select id="fk" value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className={inputCls(err.kategori)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Stok total" error={err.stok} htmlFor="fs"><Input id="fs" type="number" min={1} value={form.stok_total} error={err.stok} onChange={(e) => setForm({ ...form, stok_total: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Kondisi" htmlFor="fc"><select id="fc" value={form.kondisi} onChange={(e) => setForm({ ...form, kondisi: e.target.value as Kondisi })} className={inputCls()}>{KONDISI.map((k) => <option key={k}>{k}</option>)}</select></Field>
            <Field label="Deskripsi" error={err.deskripsi} htmlFor="fd"><textarea id="fd" rows={3} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} className={`${inputCls(err.deskripsi)} py-3`} /></Field>
          </div>
        )}
      </Overlay>

      <Confirm open={!!del} onClose={() => setDel(null)} tone="danger" confirmLabel="Hapus" title="Hapus barang?"
        message={`"${del?.nama}" akan dihapus dari katalog. Riwayat peminjaman tetap tersimpan.`}
        onConfirm={async () => { if (del && await deleteItem(del.id)) toast('Barang dihapus'); setDel(null) }} />

      <Overlay open={catOpen} onClose={() => setCatOpen(false)} title="Kelola Kategori">
        <div className="flex flex-col gap-2">
          {categories.map((c) => (
            <div key={c} className="flex items-center gap-2 rounded-[14px] bg-white/55 py-1 pl-3 pr-1">
              {editCat?.old === c ? (
                <>
                  <Input autoFocus aria-label="Nama kategori" value={editCat.val} onChange={(e) => setEditCat({ old: c, val: e.target.value })} className="!min-h-9" />
                  <IconButton icon="check" label="Simpan nama" onClick={async () => { const v = editCat.val.trim(); if (v && !categories.includes(v) && await renameCategory(c, v)) toast('Kategori diganti'); setEditCat(null) }} />
                </>
              ) : (
                <>
                  <span className="flex-1 text-[15px] font-medium">{c}</span>
                  <span className="text-[12px] text-ink-2">{items.filter((i) => i.kategori === c).length} barang</span>
                  <IconButton icon="edit" label={`Ganti nama ${c}`} onClick={() => setEditCat({ old: c, val: c })} />
                  <IconButton icon="trash" label={`Hapus ${c}`} className="!text-danger" onClick={() => catDelete(c)} />
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <p className="py-4 text-center text-[14px] text-ink-2">Belum ada kategori.</p>}
        </div>
        <div className="mt-4">
          <Field label="Kategori baru" error={catErr}>
            <div className="flex gap-2"><Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Mis. Alat Laboratorium" error={catErr} /><Button icon="plus" onClick={catSubmit}>Tambah</Button></div>
          </Field>
        </div>
      </Overlay>
    </div>
  )
}
