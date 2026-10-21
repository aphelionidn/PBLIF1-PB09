import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', 'public')
const PORT = parseInt(process.env.PORT || '3000', 10)

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
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  let pathname = decodeURIComponent(reqUrl.pathname)

  if (pathname === '/') {
    pathname = '/index.html'
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '')
  let filePath = path.join(ROOT, safePath)

  if (!fs.existsSync(filePath)) {
    // Try appending .html
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html'
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`<h1>404 Not Found</h1><p>File not found: ${pathname}</p>`)
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`)
  console.log(`  🚀 Pinjam.in Vanilla Static Server Running!`)
  console.log(`======================================================`)
  console.log(`  Local URL:        http://localhost:${PORT}/`)
  console.log(`  Direct Page Links:`)
  console.log(`    - Masuk:        http://localhost:${PORT}/login.html`)
  console.log(`    - Katalog:      http://localhost:${PORT}/catalog.html`)
  console.log(`    - Peminjaman:   http://localhost:${PORT}/my-loans.html`)
  console.log(`    - Antrean:      http://localhost:${PORT}/queue.html`)
  console.log(`    - Kelola Item:  http://localhost:${PORT}/admin-items.html`)
  console.log(`    - Pengembalian: http://localhost:${PORT}/admin-returns.html`)
  console.log(`======================================================\n`)
})
