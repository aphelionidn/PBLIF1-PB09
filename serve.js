// @ts-check
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = __dirname
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10)

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

function createServer() {
  return http.createServer((req, res) => {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    let pathname = decodeURIComponent(reqUrl.pathname)

    if (pathname === '/') {
      pathname = '/index.html'
    }

    const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '')
    let filePath = path.join(ROOT, safePath)

    if (!fs.existsSync(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html'
      } else {
        const notFoundPath = path.join(ROOT, '404.html')
        if (fs.existsSync(notFoundPath)) {
          res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
          fs.createReadStream(notFoundPath).pipe(res)
          return
        }
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end('<h1>404 Not Found</h1>')
        return
      }
    }

    const stat = fs.statSync(filePath)
    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html')
      if (fs.existsSync(indexPath)) {
        filePath = indexPath
      } else {
        res.writeHead(403, { 'Content-Type': 'text/plain' })
        res.end('Directory listing forbidden')
        return
      }
    }

    const ext = path.extname(filePath).toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    })

    fs.createReadStream(filePath).pipe(res)
  })
}

function start(port = DEFAULT_PORT) {
  const server = createServer()

  server.on('error', (err) => {
    // @ts-ignore
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${port} in use, trying ${port + 1}...]`)
      start(port + 1)
    } else {
      console.error('Server error:', err)
    }
  })

  server.listen(port, '0.0.0.0', () => {
    console.log('\n=============================================================')
    console.log('  🌟 Pinjam.in — Standalone Vanilla Website')
    console.log('=============================================================')
    console.log(`  🌐 Website URL:         http://localhost:${port}/`)
    console.log('  📄 Halaman Mahasiswa / Dosen:')
    console.log(`    - Masuk:              http://localhost:${port}/auth/login.html`)
    console.log(`    - Beranda (Katalog):  http://localhost:${port}/pages/catalog.html`)
    console.log(`    - Peminjaman Saya:    http://localhost:${port}/pages/my-loans.html`)
    console.log(`    - Notifikasi:         http://localhost:${port}/pages/notifications.html`)
    console.log(`    - Tolong.in:          http://localhost:${port}/pages/tolong.html`)
    console.log(`    - Profil:             http://localhost:${port}/pages/profile.html`)
    console.log('  🛠️ Halaman Admin:')
    console.log(`    - Dashboard:          http://localhost:${port}/admin/dashboard.html`)
    console.log(`    - Kelola Barang:      http://localhost:${port}/admin/items.html`)
    console.log(`    - Pengajuan:          http://localhost:${port}/pages/queue.html`)
    console.log(`    - Pengembalian:       http://localhost:${port}/admin/returns.html`)
    console.log(`    - Pengguna:           http://localhost:${port}/admin/users.html`)
    console.log(`    - Kalender:           http://localhost:${port}/admin/calendar.html`)
    console.log(`    - Aktivitas:          http://localhost:${port}/admin/activity.html`)
    console.log(`    - Kirim Notifikasi:   http://localhost:${port}/admin/notifs.html`)
    console.log(`    - Aturan:             http://localhost:${port}/admin/rules.html`)
    console.log('=============================================================\n')
  })
}

start()
