import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

// ต้องตรงกับใน actions.ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'my-super-secret-restaurant-key-12345'
)

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('session_token')?.value; 
  
  let userRole = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = payload.role as string;
    } catch (err) {
      console.log('Token invalid:', err);
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

  // 3. จำกัดสิทธิ์ Staff
  if (userRole === 'staff' && (path.startsWith('/admin') || path.startsWith('/cashier'))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // ✅ แก้ไข Matcher: เพิ่ม manifest.json และไฟล์นามสกุลต่างๆ (.png, .mp3) ให้ยกเว้นการตรวจสอบ
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.png|.*\\.mp3).*)',
  ],
}