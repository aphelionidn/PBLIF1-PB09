import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { projectId, publicAnonKey } from '../../utils/supabase/info'

// Satu klien untuk seluruh app (tetap sama lintas hot reload)
const g = globalThis as { __pinjaminSb?: SupabaseClient }
export const supabase = (g.__pinjaminSb ??= createClient(`https://${projectId}.supabase.co`, publicAnonKey, { auth: { storageKey: 'pinjamin.auth' } }))
