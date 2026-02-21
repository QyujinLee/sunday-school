import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/', '/login'];
const PENDING_PATH = '/pending';
const REJECTED_PATH = '/rejected';

/**
 * 요청 경로가 항상 공개 접근 가능한 경로인지 확인한다.
 */
function isAlwaysPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

/**
 * 인증 검사를 생략해야 하는 내부 경로인지 확인한다.
 */
function isBypassPath(pathname: string): boolean {
  return pathname.startsWith('/_next') || pathname.startsWith('/api/auth') || pathname === '/favicon.ico';
}

/**
 * 원래 요청 경로를 보존하기 위해 callback_url이 포함된 로그인 URL을 생성한다.
 */
function buildLoginUrl(req: NextRequest): URL {
  const loginUrl = new URL('/login', req.url);
  const requestedPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;

  loginUrl.searchParams.set('callback_url', requestedPath);

  return loginUrl;
}

/**
 * 승인 상태에 따라 이동해야 하는 상태 페이지 경로를 반환한다.
 */
function getApprovalStatusPath(approvalStatus: unknown): string {
  if (approvalStatus === 'REJECTED') {
    return REJECTED_PATH;
  }

  return PENDING_PATH;
}

/**
 * 매칭된 모든 요청에 인증 및 승인 상태 가드를 적용한다.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/operations')) {
    return NextResponse.redirect(new URL('/signup-management', req.url));
  }

  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  if (!token && !isAlwaysPublicPath(pathname)) {
    return NextResponse.redirect(buildLoginUrl(req));
  }

  if (!token) {
    return NextResponse.next();
  }

  const approvalStatusPath = getApprovalStatusPath(token.approvalStatus);
  const isStatusPage = pathname === PENDING_PATH || pathname === REJECTED_PATH;

  if (token.approvalStatus !== 'APPROVED' && pathname !== approvalStatusPath) {
    return NextResponse.redirect(new URL(approvalStatusPath, req.url));
  }

  if (token.approvalStatus === 'APPROVED' && isStatusPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname.startsWith('/signup-management') && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  if (pathname === '/login') {
    if (token.approvalStatus !== 'APPROVED') {
      return NextResponse.redirect(new URL(approvalStatusPath, req.url));
    }

    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)'],
};
