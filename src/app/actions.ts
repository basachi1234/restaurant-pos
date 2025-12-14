'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose' // ✅ ต้องใช้ไลบรารีนี้ (ถ้ายังไม่ลงให้ npm install jose)

// การตั้งค่า Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
const supabase = createClient(supabaseUrl, supabaseKey)

// 🔐 รหัสลับสำหรับเข้ารหัส Token (ควรตรงกับใน middleware.ts และ .env)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'my-super-secret-restaurant-key-12345'
)

// 1. ฟังก์ชัน Login (เปลี่ยนจากเก็บ Role ดื้อๆ เป็นเก็บ JWT)
export async function login(pin: string) {
    // หน่วงเวลา 0.5 วินาที (ป้องกันการสุ่มรหัสรัวๆ)
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        // ตรวจสอบ PIN ในฐานข้อมูล
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('pin', pin)
            .single();

        if (error || !user) {
            return { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
        }

        // ✅ สร้าง JWT Token (บัตรผ่านที่ถูกเข้ารหัส)
        const token = await new SignJWT({ 
            userId: user.id, 
            role: user.role, 
            name: user.name 
        })
        .setProtectedHeader({ alg: 'HS256' }) // ใช้อัลกอริทึมมาตรฐาน
        .setIssuedAt()
        .setExpirationTime('24h') // หมดอายุใน 24 ชั่วโมง
        .sign(JWT_SECRET); // เซ็นกำกับด้วยรหัสลับ

        // ฝัง Cookie ที่ปลอดภัย
        const cookieStore = await cookies()
        cookieStore.set({
            name: 'session_token', // ชื่อ Cookie (ต้องตรงกับ middleware)
            value: token,
            httpOnly: true, // ห้าม JavaScript ฝั่ง Client อ่าน (ป้องกันการขโมย)
            secure: process.env.NODE_ENV === 'production', // ใช้ HTTPS เท่านั้นบน Production
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 1 วัน
            path: '/',
        })

        return { success: true, user: user };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดเชื่อมต่อระบบ" };
    }
}

// 2. ฟังก์ชัน Logout
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('session_token')
    return { success: true }
}

// 3. ✅ ฟังก์ชันตรวจสอบ Session (สำคัญมากสำหรับหน้า Frontend)
export async function getSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value

    if (!token) return { role: null }

    try {
        // ถอดรหัส Token เพื่อเอา Role ออกมาส่งให้หน้าเว็บ
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return { role: payload.role as string }
    } catch (error) {
        console.error("Invalid Token:", error);
        return { role: null }
    }
}