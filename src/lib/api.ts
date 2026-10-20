import { projectId, publicAnonKey } from '../../utils/supabase/info'
import { supabase } from './supabase'

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-5a56c1fa`

/** Klien API server. Memakai token sesi login bila ada, selain itu anon key. */
export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown; quiet404?: boolean } = {}): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token ?? publicAnonKey
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw new Error('Server terlalu lama merespons. Coba lagi.')
    throw new Error('Tidak bisa terhubung ke server. Periksa koneksi kamu.')
  } finally {
    window.clearTimeout(timeout)
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (!(opts.quiet404 && res.status === 404)) console.error(`[api] ${opts.method ?? 'GET'} ${path} → ${res.status}`, json)
    const msg = (json as { error?: string; message?: string }).error ?? (json as { message?: string }).message
    throw Object.assign(new Error(res.status === 404 && !msg ? 'Server belum di-deploy.' : msg ?? `Server error ${res.status}`), { status: res.status })
  }
  return json as T
}
