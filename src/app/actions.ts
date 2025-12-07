'use server'

import { createClient } from '@supabase/supabase-js'

// สร้าง Client สำหรับฝั่ง Server (พร้อมค่ากันตายสำหรับ Build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key"

const supabase = createClient(supabaseUrl, supabaseKey)

// ฟังก์ชันตรวจสอบรหัสจากตาราง users ใน Database
export async function verifyUserPin(pin: string) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, role')
            .eq('pin', pin)
            .single();

        if (error || !data) {
            return { success: false, message: "รหัสไม่ถูกต้อง" };
        }

        // เจอตัวตน -> ส่งข้อมูลกลับไป (เพื่อให้หน้า Login เอาไปฝัง Cookie)
        return { success: true, user: data };
    } catch (error) {
        console.error("Login Error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดเชื่อมต่อระบบ" };
    }
}