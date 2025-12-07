import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 1. อ่านค่า Role จาก Cookie
  const role = request.cookies.get('user_role')?.value;
  const path = request.nextUrl.pathname;

  // (Optional) Debug ดูค่าใน Terminal ของ Vercel/Localhost
  // console.log(`Path: ${path}, Role: ${role}`); 

  // --- ✅ กฎที่ 1: ถ้า Login อยู่แล้ว (มี Role) แต่พยายามเข้าหน้า Login -> ให้เด้งไปหน้าแรกทันที ---
  if (role && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // --- ✅ กฎที่ 2: ถ้ายังไม่ Login (ไม่มี Role) แต่พยายามเข้าหน้าอื่น -> ไล่ไปหน้า Login ---
  // (ยกเว้นหน้า Login เอง ที่ต้องปล่อยให้เข้าได้)
  if (!role && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // --- ✅ กฎที่ 3: จำกัดสิทธิ์พนักงาน (Staff) ---
  // ห้ามเข้าหน้า Admin และหน้า Cashier
  if (role === 'staff' && (path.startsWith('/admin') || path.startsWith('/cashier'))) {
    // ดีดกลับไปหน้าแรก (หน้าเลือกโต๊ะ)
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Config: บังคับใช้กับทุกหน้า ยกเว้นไฟล์ Static, รูปภาพ, และ API
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}