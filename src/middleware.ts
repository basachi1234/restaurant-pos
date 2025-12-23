import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const token = request.cookies.get('session_token')?.value; 
  
  // ✅ 1. อ่านค่า Secret จาก .env โดยตรง (ไม่มีค่าสำรองแล้ว)
  const secretStr = process.env.JWT_SECRET;
  
  if (!secretStr) {
    console.error("❌ CRITICAL: JWT_SECRET is missing in .env file (Middleware)");
    // ปล่อยผ่านไปก่อนแต่จะไม่มี userRole (Fail Safe)
  }

  const JWT_SECRET = new TextEncoder().encode(secretStr || "");

  let userRole = null;

  if (token && secretStr) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      userRole = payload.role as string;
    } catch (err) {
      // Token ไม่ถูกต้อง
    }
  }

  // --- กฎการ Redirect ---

  if (userRole && path === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!userRole && path !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

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