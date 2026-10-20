import { useRef } from 'react'
import { useStore, type WallId } from '../store'
import { readImage } from '../lib/image'
import { Glass, Icon } from './ui'

const COLOR_DEFAULT = '#0A84FF'
const COLOR_DEFAULT_2 = '#8E7CFF'

const PRESETS: { id: WallId; label: string; swatch: string }[] = [
  { id: 'default', label: 'Mengikuti waktu', swatch: 'linear-gradient(135deg,#CFE8FF,#E0D7FF,#FFD9E8)' },
  { id: 'aurora', label: 'Aurora', swatch: 'linear-gradient(135deg,#7EE8C7,#8FC1FF,#C4A6FF)' },
  { id: 'sunset', label: 'Senja', swatch: 'linear-gradient(135deg,#FFB37A,#FF8FA8,#C9A0FF)' },
  { id: 'ocean', label: 'Samudra', swatch: 'linear-gradient(135deg,#6CC8FF,#7FA8FF,#7FE7DC)' },
  { id: 'forest', label: 'Hutan', swatch: 'linear-gradient(135deg,#9FDD8F,#CBE58A,#86D6B9)' },
  { id: 'plain', label: 'Polos', swatch: 'linear-gradient(135deg,#F2F2F7,#E5E5EA)' },
]

export default function WallpaperPicker() {
  const { wallpaper, setWallpaper, performanceMode, toast } = useStore()
  const file = useRef<HTMLInputElement>(null)
  const color = wallpaper.color ?? COLOR_DEFAULT
  const color2 = wallpaper.color2 ?? COLOR_DEFAULT_2

  // Foto latar disimpan di perangkat ini (localStorage) sebagai cache — tidak diunggah ke server.
  const upload = async (f?: File) => {
    if (!f) return
    try {
      const image = await readImage(f, 1600, 0.8)
      const saved = setWallpaper({ ...wallpaper, id: 'custom', image })
      toast(saved ? 'Wallpaper diganti' : 'Wallpaper dipakai, tapi terlalu besar untuk disimpan', saved ? 'success' : 'info')
    } catch (e) {
      toast((e as Error).message, 'danger')
    }
  }

  const tile = 'tap liquid relative aspect-[3/4] overflow-hidden rounded-[16px] ring-offset-2 ring-offset-transparent'
  const tiles: { id: WallId; label: string; swatch: string }[] = [
    ...PRESETS,
    { id: 'solid', label: 'Warna', swatch: color },
    { id: 'gradient', label: 'Gradien', swatch: color },
  ]
  const swatchOf = (id: WallId, swatch: string) =>
    id === 'solid' ? color : id === 'gradient' ? `linear-gradient(135deg, ${color}, ${color2})` : swatch

  return (
    <Glass className="p-4">
      <p className="mb-1 flex items-center gap-1.5 text-[14px] font-semibold"><Icon name="sparkle" className="size-4 text-primary" />Wallpaper</p>
      <p className="mb-3 text-[12px] text-ink-2">Menyesuaikan mode terang & gelap. Disimpan di perangkat ini.</p>
      <div role="radiogroup" aria-label="Pilih wallpaper" className="grid grid-cols-4 gap-2.5 sm:grid-cols-9">
        {tiles.map((p) => {
          const on = wallpaper.id === p.id
          return (
            <button key={p.id} role="radio" aria-checked={on} aria-label={p.label} title={p.label} onClick={() => setWallpaper({ ...wallpaper, id: p.id })}
              className={`${tile} lg-rim ${on ? 'ring-2 ring-primary' : ''}`} style={{ background: swatchOf(p.id, p.swatch) }}>
              {on && <span className="anim-badge absolute bottom-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-primary text-on"><Icon name="check" className="size-3" /></span>}
              <span className="absolute inset-x-0 bottom-0 truncate bg-[rgba(0,0,0,0.28)] px-1 py-0.5 text-[10px] font-semibold text-on">{p.label}</span>
            </button>
          )
        })}
        <button role="radio" aria-checked={wallpaper.id === 'custom'} aria-label="Unggah foto sendiri" onClick={() => file.current?.click()}
          className={`${tile} lg-rim grid place-items-center border border-dashed border-black/20 bg-white/50 text-ink-2 ${wallpaper.id === 'custom' ? 'ring-2 ring-primary' : ''}`}
          style={wallpaper.image ? { backgroundImage: `url(${wallpaper.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
          {!wallpaper.image && <span className="flex flex-col items-center gap-1 text-[10px] font-semibold"><Icon name="plus" className="size-5" />Foto</span>}
          {wallpaper.image && <span className="absolute inset-x-0 bottom-0 bg-[rgba(0,0,0,0.28)] py-0.5 text-[10px] font-semibold text-on">Ganti</span>}
        </button>
      </div>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }} />

      {(wallpaper.id === 'solid' || wallpaper.id === 'gradient') && (
        <div className="anim-rise mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
            {wallpaper.id === 'gradient' ? 'Warna 1' : 'Warna latar'}
            <input type="color" value={color} aria-label="Warna latar" onChange={(e) => setWallpaper({ ...wallpaper, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded-[10px] border border-white/80 bg-white/60" />
          </label>
          {wallpaper.id === 'gradient' && (
            <label className="flex items-center gap-2 text-[13px] font-medium text-ink-2">
              Warna 2
              <input type="color" value={color2} aria-label="Warna latar kedua" onChange={(e) => setWallpaper({ ...wallpaper, color2: e.target.value })} className="h-9 w-12 cursor-pointer rounded-[10px] border border-white/80 bg-white/60" />
            </label>
          )}
          <span className="text-[12px] text-ink-2">{wallpaper.id === 'gradient' ? 'Dua warna ini menjadi gradien latar.' : 'Warna ini menjadi latar aplikasi.'}</span>
        </div>
      )}

      {wallpaper.id === 'custom' && wallpaper.image && (
        <label className="anim-rise mt-4 flex items-center gap-3 text-[13px] font-medium text-ink-2">
          Blur
          <input type="range" min={0} max={30} value={wallpaper.blur} disabled={performanceMode} onChange={(e) => setWallpaper({ ...wallpaper, blur: Number(e.target.value) })} className="flex-1 accent-primary disabled:opacity-40" />
          <span className="w-10 text-right tabular-nums text-ink">{performanceMode ? 'Off' : `${wallpaper.blur}px`}</span>
        </label>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/60 pt-3">
        <div>
          <p className="flex items-center gap-1.5 text-[14px] font-semibold"><Icon name="sparkle" className="size-4 text-primary" />Tema warna beranimasi</p>
          <p className="text-[12px] text-ink-2">{performanceMode ? 'Dinonaktifkan sementara oleh mode performa.' : 'Warna aksen (logo, tombol, highlight) berubah-ubah halus.'}</p>
        </div>
        <button role="switch" aria-checked={!!wallpaper.anim && !performanceMode} aria-label="Tema warna beranimasi" disabled={performanceMode} onClick={() => setWallpaper({ ...wallpaper, anim: !wallpaper.anim })}
          className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors disabled:opacity-40 ${wallpaper.anim && !performanceMode ? 'bg-success' : 'bg-black/15'}`}>
          <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${wallpaper.anim && !performanceMode ? 'left-[24px]' : 'left-1'}`} />
        </button>
      </div>
    </Glass>
  )
}
