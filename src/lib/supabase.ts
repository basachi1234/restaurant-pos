import { createClient } from '@supabase/supabase-js'

// ใส่ Fallback String เพื่อป้องกัน Error ตอน Build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

export const supabase = createClient(supabaseUrl, supabaseKey)