# Pinjam.in

Aplikasi peminjaman perlengkapan kelas untuk Politeknik Negeri Batam (Mahasiswa, Dosen, Admin).
React 19 + Vite + Tailwind v4, backend Supabase Edge Function (Hono + KV).

- Panduan agen/arsitektur/API/deploy: lihat [`CONTEXT.md`](./CONTEXT.md) dan [`AGENTS.md`](./AGENTS.md).
- Dev: `npm run dev` (port `$PORT`, default 8443) - Build: `npm run build` - Typecheck: `npx tsc --noEmit`.
- Edge Function: `supabase/functions/server/` (slug `make-server-5a56c1fa`); deploy manual, lihat CONTEXT.md bagian Checklist deploy.
- Variabel lingkungan: lihat `.env.example`.
