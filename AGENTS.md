# pinjamin-vanilla-web (Standalone Pure Vanilla Web Application)

ALWAYS REMEMBER TO NEVER DO IT YOUR SELF, ALWAYS HAND IT TO A SUB-AGENTS

Pure Vanilla HTML5 / Modern CSS / Native ES Modules (ES6+) Multi-Page Application for **Pinjam.in** (Politeknik Negeri Batam).

---

## 1. Project Overview & Philosophy

This repository is an independent, 100% self-contained multi-page web application. It operates entirely without runtime dependencies, build tools, compilers, or bundlers (no React, no Vite, no Tailwind build step, and no PostCSS).

- **Core Paradigm**: 1:1 Multi-Page Architecture (MPA) where each route is a physical `.html` file grouped by role (`auth/`, `pages/`, `admin/`) and paired with a same-named ES module controller in `assets/js/<group>/`.
- **Zero Build Step**: Native browser execution using modern Web Standards (ES Modules via `<script type="module">`, CSS Custom Properties, Semantic HTML5, and native Fetch API).
- **Design System**: Handcrafted Flat UI design language governed by design tokens (`tokens.css`) and modular components (`components.css`).
- **Live Supabase Backend**: Communicates directly with the live Supabase Edge Function (`https://uljsqrakyulxkhbyvdps.supabase.co/functions/v1/make-server-5a56c1fa`) via REST endpoints with JWT authorization.
- **Standalone Web Server**: Native Node.js HTTP server (`serve.js`) with zero npm dependencies, providing clean URLs, MIME resolution, and 404 fallbacks.

---

## 2. Development & Local Server

A built-in native Node.js static server is included in `serve.js`.

### Running the Server
```bash
# Start server using npm script:
npm start

# Or run directly with Node:
node serve.js
```

- **Default Port**: `3000` (configurable via environment variable `PORT=XXXX node serve.js`).
- **Local URL**: `http://localhost:3000/`
- **Features**:
  - Automatic `.html` extension resolution for clean URLs (e.g. `/catalog` serves `/catalog.html`).
  - Native MIME type mapping (`.html`, `.css`, `.js`, `.mjs`, `.json`, `.svg`, `.png`, `.jpg`, `.woff2`, etc.).
  - Directory index routing (`/` serves `/index.html`).
  - Fallback error routing (routes missing pages to `404.html`).
- **Static Cloud Hosting**: Production-ready configurations are provided for Vercel (`vercel.json`) and Netlify (`netlify.toml`).

---

## 3. Project Structure & File Map

```
.
├── index.html                # Router utama (redirect sesuai sesi login & peran)
├── 404.html                  # Halaman Error 404 (path absolut, aman di URL mana pun)
├── serve.js                  # Server statis lokal bawaan (Node.js native)
├── package.json              # Skrip npm untuk menjalankan server lokal
├── vercel.json · netlify.toml
│
├── auth/
│   └── login.html            # Layar Masuk (NIM/NIP/Email Polibatam)
│
├── pages/                    # Mahasiswa / Dosen (login wajib)
│   ├── catalog.html          # Beranda (Katalog) — filter, pencarian, booking & keranjang
│   ├── my-loans.html         # Peminjaman Saya — riwayat, timeline, batal & perpanjangan
│   ├── notifications.html    # Notifikasi
│   ├── tolong.html           # Tolong.in — tiket bantuan & chat dengan Admin
│   ├── profile.html          # Profil — data akun, password, foto, tema & latar
│   └── queue.html            # Persetujuan (Dosen) / Pengajuan (Admin)
│
├── admin/                    # Khusus Admin (dijaga guard.js + backend 403)
│   ├── dashboard.html        # Metrik KPI, grafik 8 minggu, barang terpopuler
│   ├── items.html            # Inventaris CRUD, foto, stok & kategori
│   ├── returns.html          # Pengembalian dengan grading kondisi
│   ├── users.html            # Akun pengguna, peran, reset password, riwayat
│   ├── calendar.html         # Matriks ketersediaan 14 hari
│   ├── activity.html         # Log audit sistem
│   ├── notifs.html           # Broadcast notifikasi global
│   └── rules.html            # Aturan peminjaman
│
└── assets/
    ├── css/
    │   ├── tokens.css        # CSS Custom Properties (warna, radius, font, wallpaper)
    │   └── components.css    # Komponen, layout utilities, transisi halaman
    ├── img/
    │   └── 1transparant.svg  # Logo resmi Pinjam.in
    └── js/
        ├── core/             # Modul bersama
        │   ├── api.js        # REST client Supabase, toList(), utilitas tanggal, toast
        │   ├── auth.js       # Sesi, requireAuth, shell sidebar/topbar/bottom bar
        │   ├── routes.js     # Peta URL semua halaman (url('catalog'), homeFor(role))
        │   ├── guard.js      # Guard pra-render (classic script di <head>, data-roles)
        │   ├── theme.js      # Tema terang/gelap, wallpaper, blur, panel kaca (classic script)
        │   └── icons.js      # SVG icon generator (Lucide-compatible)
        ├── auth/login.js     # Controller login
        ├── pages/*.js        # Controller halaman pengguna (nama sama dengan HTML-nya)
        └── admin/*.js        # Controller halaman admin (nama sama dengan HTML-nya)
```

---

## 4. Architecture & Technical Conventions

### Native ES Modules
- Page controllers and shared modules are native ES modules loaded with `<script type="module" src="...">`.
- **Exceptions (classic scripts in `<head>`)**: `core/guard.js` and `core/theme.js` must run synchronously before first paint (access redirect and no theme flash). Keep them dependency-free.
- Module imports MUST explicitly include the `.js` file extension (e.g. `import { api } from '../core/api.js'`).
- **Never hard-code page URLs in JS.** Use `core/routes.js`: `url('catalog')`, `url('adminUsers')`, `homeFor(role)`. Add new pages to `ROUTES`.
- Pages live one folder deep, so static HTML references use `../assets/...` and sibling-folder links like `../pages/queue.html`. `404.html` is the exception and uses root-absolute paths.
- Shared global utilities:
  - `api.js`: Handles all HTTP calls, token injection, date formatting, and toast notifications (`showToast`).
  - `auth.js`: Manages local authentication state (`Auth.getUser()`, `Auth.getToken()`, `Auth.requireAuth()`, `Auth.renderShell()`).
  - `icons.js`: Generates inline SVGs via `renderIcon('icon-name', { size: 18 })`.
  - `theme.js`: Applies `[data-theme="dark"]` and custom wallpaper styles.

### Flat UI & CSS Design Tokens
- **No Tailwind**: Do NOT write or import Tailwind utility classes or framework runtimes.
- Use handcrafted CSS custom properties defined in `tokens.css`:
  - Colors: `var(--c-primary)`, `var(--c-surface)`, `var(--c-canvas)`, `var(--c-border)`, `var(--c-ink)`, etc.
  - Geometry: `var(--radius-sm)`, `var(--radius-md)`, `var(--radius-lg)`, `var(--radius-full)`.
  - Typography: `var(--font-sans)`, `var(--font-mono)`.
- **Navigation Pill Styling**: Active sidebar and filter pills use a solid, distinct Flat UI styling with warm active accents (`#38271e` or themed active indicators).
- Keep component styles organized within `components.css` or scoped `<style>` tags when page-specific.

### Authentication & Role-Based Access Control
- Sessions are stored in browser `localStorage`:
  - `pinjamin.token`: Supabase JWT session token.
  - `pinjamin.user`: Parsed user object (`id`, `nama`, `nim_nip`, `email`, `role`, `aktif`).
- Every protected page loads the pre-render guard in `<head>` (before `theme.js`):
  ```html
  <script src="../assets/js/core/guard.js" data-roles="Admin"></script>  <!-- omit data-roles = any logged-in user -->
  ```
- Route protection is also enforced at the top of each page controller:
  ```javascript
  import { Auth } from '../core/auth.js'
  // Require specific roles or redirect to appropriate dashboard/login:
  const user = Auth.requireAuth({ roles: ['Admin'] })
  Auth.renderShell('admin-items', user)
  ```
- Client-side guards only control what the browser shows. Real protection is the backend's role checks (401/403) — never rely on folder placement for security.

---

## 5. Critical Operational Rules for AI Agents

1. **Subagent Delegation Rule**:
   - **ALWAYS HAND IT TO A SUB-AGENT**. Never perform extensive tasks directly yourself. Always spawn or delegate tasks to specialized sub-agents.
2. **Backend & Supabase Safety**:
   - **NEVER** alter, regenerate, or tamper with the Supabase Edge Function backend, KV store table (`kv_store_5a56c1fa`), or database schemas unless specifically ordered.
   - The frontend communicates strictly via the existing REST API contracts exposed in `api.js`.
3. **Vanilla Purity & Dependency Isolation**:
   - Do NOT introduce npm packages, bundlers (Webpack, Vite, Rollup, Parcel), or CSS frameworks (Tailwind, Bootstrap) into this folder.
   - Keep the project runnable with vanilla Node.js (`node serve.js`) and direct static file serving.
4. **Code Quality**:
   - Ensure clean HTML5 semantic structure and valid markup.
   - Maintain proper string quoting and apostrophe escaping in HTML and JS.
   - Preserve error handling in async fetch calls with descriptive user feedback via `showToast()`.
