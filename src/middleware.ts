import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublicPath = path === '/admin-login';
  const isAdminPath = path === '/admin' || path.startsWith('/admin/');

  const token = request.cookies.get('admin_token')?.value || '';

  // If trying to access admin without a token, redirect to home per user request
  if (isAdminPath && !token) {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  // If trying to access login page WITH a token, redirect to admin
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/admin', request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/admin-login'
  ]
};
