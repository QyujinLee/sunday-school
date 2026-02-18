import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/', '/login'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/api/auth') || pathname === '/favicon.ico') {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/operations') && token?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (token && token.approvalStatus !== 'APPROVED' && pathname !== '/pending') {
    return NextResponse.redirect(new URL('/pending', req.url));
  }

  if (pathname === '/pending' && token?.approvalStatus === 'APPROVED') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'],
};
