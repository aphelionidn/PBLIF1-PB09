import { useEffect, useState } from 'react'
import SimDate from '../components/SimDate'
import { Button, Confirm, DataGate, Glass, Icon, PageHeader } from '../components/ui'
import { DEFAULT_RULES, RULE_META, rulesText, type Rules } from '../config'
import { useStore } from '../store'

export default function AdminRules() {
  const { rules, setRules, toast } = useStore()
  const [draft, setDraft] = useState<Rules>(rules)
  const [confirm, setConfirm] = useState(false)
  const dirty = RULE_META.some((m) => draft[m.key] !== rules[m.key])
  // Ikuti nilai server selama belum ada perubahan lokal (mis. data baru selesai dimuat).
  useEffect(() => { if (!dirty) setDraft(rules) }, [rules, dirty])
  const isDefault = RULE_META.every((m) => rules[m.key] === DEFAULT_RULES[m.key])
  const invalid = RULE_META.find((m) => draft[m.key] < m.min || draft[m.key] > m.max)

  const set = (k: keyof Rules, v: number) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <div className="mx-auto max-w-[880px]">
      <PageHeader title="Pengaturan Aturan" subtitle="Ubah batas peminjaman. Berlaku langsung untuk booking baru." />
      <DataGate>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <Glass className="overflow-hidden p-0">
          {RULE_META.map((m, i) => {
            const v = draft[m.key]
            const changed = v !== rules[m.key]
            return (
              <div key={m.key} className="anim-rise flex flex-wrap items-center gap-4 border-b border-white/60 p-5 last:border-0" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="flex items-center gap-2 text-[16px] font-semibold">{m.label}{changed && <span className="anim-badge rounded-full bg-tint-orange px-2 py-0.5 text-[11px] font-semibold text-warning">Diubah</span>}</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">{m.help} <span className="whitespace-nowrap">({m.min}–{m.max} {m.unit})</span></p>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-white/60 p-1">
                  <button aria-label={`Kurangi ${m.label}`} disabled={v <= m.min} onClick={() => set(m.key, v - 1)} className="tap grid size-10 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40"><Icon name="minus" className="size-4" /></button>
                  <span className="w-16 text-center"><span key={v} className="anim-badge inline-block text-[22px] font-bold tabular-nums">{v}</span> <span className="text-[12px] font-medium text-ink-2">{m.unit}</span></span>
                  <button aria-label={`Tambah ${m.label}`} disabled={v >= m.max} onClick={() => set(m.key, v + 1)} className="tap grid size-10 place-items-center rounded-full bg-white shadow-sm disabled:opacity-40"><Icon name="plus" className="size-4" /></button>
                </div>
              </div>
            )
          })}
          <div className="flex flex-wrap gap-2 border-t border-white/60 bg-white/30 p-4">
            <Button disabled={!dirty || !!invalid} onClick={async () => { if (await setRules(draft)) toast('Aturan disimpan') }}>Simpan</Button>
            <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(rules)}>Batalkan perubahan</Button>
            <Button variant="secondary" className="ml-auto" disabled={isDefault && !dirty} onClick={() => setConfirm(true)}>Kembalikan Default</Button>
          </div>
        </Glass>
        <div className="flex flex-col gap-4">
          <Glass className="p-5">
            <p className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-primary-pressed"><Icon name="eye" className="size-4" />Pratinjau untuk pengguna</p>
            <ul className="list-disc space-y-1.5 pl-5 text-[13px]">{rulesText(draft).map((t) => <li key={t}>{t}</li>)}</ul>
          </Glass>
          <SimDate />
        </div>
      </div>
      </DataGate>
      <Confirm open={confirm} onClose={() => setConfirm(false)} title="Kembalikan default?" message="Semua aturan kembali ke nilai awal dari konfigurasi." confirmLabel="Kembalikan"
        onConfirm={async () => { if (await setRules(DEFAULT_RULES)) { setDraft(DEFAULT_RULES); setConfirm(false); toast('Aturan dikembalikan ke default') } }} />
    </div>
  )
}
