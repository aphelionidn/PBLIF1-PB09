/** Terang/gelap relatif sebuah warna hex (#rgb / #rrggbb) — dipakai untuk menyesuaikan cadar latar. */
export const colorTone = (hex: string): 'light' | 'dark' => {
  const h = (hex || '').replace('#', '').trim()
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  if (!/^[0-9a-f]{6}$/i.test(s)) return 'light'
  const r = parseInt(s.slice(0, 2), 16)
  const g = parseInt(s.slice(2, 4), 16)
  const b = parseInt(s.slice(4, 6), 16)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.55 ? 'dark' : 'light'
}

/** Ambil 2 warna (kiri-atas & kanan-bawah, rata-rata) dari foto untuk logo. */
export const photoColors = (src: string) =>
  new Promise<[string, string]>((res) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = c.height = 8
      const x = c.getContext('2d')!
      x.drawImage(img, 0, 0, 8, 8)
      const px = (sx: number, sy: number) => {
        const d = x.getImageData(sx, sy, 4, 4).data
        let r = 0, g = 0, b = 0
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2] }
        const n = d.length / 4
        // naikkan saturasi sedikit agar logo tidak kusam
        const avg = (r + g + b) / 3 / n
        const k = (v: number) => Math.max(0, Math.min(255, Math.round(avg + (v / n - avg) * 1.6)))
        return `rgb(${k(r)} ${k(g)} ${k(b)})`
      }
      res([px(0, 0), px(4, 4)])
    }
    img.onerror = () => res(['#0A84FF', '#8E7CFF'])
    img.src = src
  })
