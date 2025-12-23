import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('session_token')?.value; 
  
  // ✅ 1. อ่านค่า Secret จาก .env โดยตรง (ไม่มีค่าสำรองแล้ว)
  const secretStr = process.env.JWT_SECRET;
  
  // ถ้าไม่มี Secret ใน .env ให้ข้ามการเช็ค Token ไปเลย (หรือจะให้ Redirect ไปหน้า Error ก็ได้)
  // เพื่อป้องกันการใช้ค่า Default ที่ไม่ปลอดภัย
  if (!secretStr) {
    console.error("❌ CRITICAL: JWT_SECRET is missing in .env file (Middleware)");
    // ถ้าซีเรียสเรื่องความปลอดภัย ให้ return error ทันที
    // return NextResponse.json({ error: "Server Configuration Error" }, { status: 500 });
  }

  const JWT_SECRET = new TextEncoder().encode(secretStr || ""); // กัน Error ตอน encode เฉยๆ

  let userRole = null;

  if (token && secretStr) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = payload.role as string;
    } catch (err) {
      // Token ไม่ถูกต้อง หรือหมดอายุ
      // console.log('Token invalid:', err);
    }
  }

  // --- กฎการ Redirect ---

  // 1. ถ้า Login แล้ว แต่จะไปหน้า Login -> ไปหน้าแรก
  if (userRole && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 2. ถ้ายังไม่ Login แต่จะไปหน้าอื่น -> ไปหน้า Login
  if (!userRole && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. จำกัดสิทธิ์ Staff (ห้ามเข้า Admin/Cashier)
  if (userRole === 'staff' && (path.startsWith('/admin') || path.startsWith('/cashier'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.png|.*\\.mp3).*)',
  ],
}