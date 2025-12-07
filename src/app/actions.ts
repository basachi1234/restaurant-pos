'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers' // ✅ 1. Import cookies

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

const supabase = createClient(supabaseUrl, supabaseKey)

// ✅ 2. เปลี่ยนจาก verifyUserPin เป็น login (ทำหน้าที่ตรวจสอบ + ฝัง Cookie)
export async function login(pin: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('pin', pin)
            .single();

        if (error || !data) {
            return { success: false, message: "รหัสไม่ถูกต้อง" };
        }

        // 🔐 สร้าง HttpOnly Cookie (JavaScript ฝั่ง Client จะมองไม่เห็น แต่ส่งไปกับ Request ได้)
        const cookieStore = await cookies()
        cookieStore.set({
            name: 'user_role',
            value: data.role,
            httpOnly: true, // ห้าม JS เข้าถึง
            secure: process.env.NODE_ENV === 'production', // ใช้ HTTPS เท่านั้น (ถ้าขึ้น Production)
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 วัน
            path: '/',
        })

        return { success: true, user: data };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดเชื่อมต่อระบบ" };
    }
}

// ✅ 3. ฟังก์ชัน Logout (ลบ Cookie ฝั่ง Server)
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('user_role')
    return { success: true }
}

// ✅ 4. ฟังก์ชันดึงค่า Session (เพื่อให้ Client เรียกเช็คว่าตอนนี้เป็นใคร)
export async function getSession() {
    const cookieStore = await cookies()
    const role = cookieStore.get('user_role')?.value
    return { role }
}