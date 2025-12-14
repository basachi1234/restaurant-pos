import { createClient } from '@supabase/supabase-js'

// 1. อ่านค่าจาก Environment Variables โดยไม่ต้องใส่ || "placeholder"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// 2. เช็คว่ามีค่าไหม? ถ้า "ไม่มี" ให้ระเบิดตัวเองทันที (Throw Error)
if (!supabaseUrl || !supabaseKey) {
  // Error นี้จะโชว์ใน Terminal ตอนรัน หรือใน Log ของ Vercel
  throw new Error(
    "❌ Missing Supabase Config: กรุณาตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY ในไฟล์ .env หรือ Vercel Settings"
  );
}

// 3. ถ้าผ่านมาถึงตรงนี้ได้ แสดงว่ามีค่าครบ ก็สร้าง Client ตามปกติ
export const supabase = createClient(supabaseUrl, supabaseKey)