import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose' // ✅ ใช้ตรวจสอบ Token

// ต้องตรงกับใน actions.ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'my-super-secret-restaurant-key-12345'
)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('session_token')?.value; // อ่านค่า Token
  
  let userRole = null;

  // 1. ✅ พยายามถอดรหัส Token (ถ้ามี)
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = payload.role as string; // ได้ Role ออกมาแล้ว! ('owner' หรือ 'staff')
    } catch (err) {
      console.log('Token invalid:', err);
      // ถ้า Token ปลอมหรือหมดอายุ ให้ถือว่าไม่มีสิทธิ์
    }
  }

  // --- กฎการ Redirect (เหมือนเดิมแต่ใช้ userRole ที่แกะมาจาก JWT) ---

  // กฎที่ 1: ถ้า Login แล้ว (มี Role) แต่จะไปหน้า Login -> ดีดไปหน้าแรก
  if (userRole && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // กฎที่ 2: ถ้ายังไม่ Login (ไม่มี Role) แต่จะไปหน้าอื่น -> ไล่ไป Login
  if (!userRole && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // กฎที่ 3: จำกัดสิทธิ์ Staff
  if (userRole === 'staff' && (path.startsWith('/admin') || path.startsWith('/cashier'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}