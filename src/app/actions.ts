'use server'

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'

// การตั้งค่า Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"
const supabase = createClient(supabaseUrl, supabaseKey)

// 🔐 แก้ไข: ดึง Secret จาก .env เท่านั้น (ถ้าไม่มีให้ Error เลย)
const secretStr = process.env.JWT_SECRET;
if (!secretStr) {
  throw new Error("❌ CRITICAL: JWT_SECRET is not defined in .env");
}
const JWT_SECRET = new TextEncoder().encode(secretStr);

// 1. ฟังก์ชัน Login
export async function login(pin: string) {
    // หน่วงเวลา 0.5 วินาที
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('pin', pin)
            .single();

        if (error || !user) {
            return { success: false, message: "รหัส PIN ไม่ถูกต้อง" };
        }

        // สร้าง JWT Token
        const token = await new SignJWT({ 
            userId: user.id, 
            role: user.role, 
            name: user.name 
        })
        .setProtectedHeader({ alg: 'HS256' }) 
        .setIssuedAt()
        .setExpirationTime('24h') 
        .sign(JWT_SECRET); 

        // ฝัง Cookie
        const cookieStore = await cookies()
        cookieStore.set({
            name: 'session_token', 
            value: token,
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, 
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

// 3. ฟังก์ชันตรวจสอบ Session
export async function getSession() {
    const cookieStore = await cookies()
    const token = cookieStore.get('session_token')?.value

    if (!token) return { role: null }

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET)
        return { role: payload.role as string }
    } catch (error) {
        return { role: null }
    }
}