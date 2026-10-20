/**
 * Baca file gambar dari input, perkecil di canvas, lalu kembalikan data URL JPEG.
 * Dipakai agar foto yang dikirim ke server tetap ringan (bukan file asli kamera).
 *
 * @param max  panjang sisi terpanjang (px). Foto profil memakai nilai kecil + `square`.
 * @param quality kualitas JPEG 0..1
 * @param square potong tengah jadi persegi (untuk avatar)
 */
export function readImage(file: File, max = 900, quality = 0.82, square = false): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('File harus berupa gambar.'))
    const img = new Image()
    img.onload = () => {
      const done = (url: string) => { URL.revokeObjectURL(img.src); resolve(url) }
      const c = document.createElement('canvas')
      const x = c.getContext('2d')
      if (!x) return reject(new Error('Canvas tidak didukung perangkat ini.'))
      if (square) {
        const s = Math.min(img.width, img.height)
        const side = Math.max(1, Math.min(max, s))
        c.width = c.height = side
        x.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, side, side)
      } else {
        const k = Math.min(1, max / Math.max(img.width, img.height))
        c.width = Math.max(1, Math.round(img.width * k))
        c.height = Math.max(1, Math.round(img.height * k))
        x.drawImage(img, 0, 0, c.width, c.height)
      }
      done(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Gambar gagal dibaca.')) }
    img.src = URL.createObjectURL(file)
  })
}
