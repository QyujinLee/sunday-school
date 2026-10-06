import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { type JWT, encode, getToken } from 'next-auth/jwt';

import { DEFAULT_TOKEN_MAX_AGE_SECONDS, syncTeacherSnapshot } from '@/lib/auth';

// 홈(/)은 공개하지 않는다. 홈 메뉴에 재정 관리 시트·노션 같은 외부 링크가 있어 비로그인에게 노출되면 안 된다.
const PUBLIC_PATHS = ['/login'];
const GUEST_PATH_PREFIX = '/guest';
const PENDING_PATH = '/pending';
const REJECTED_PATH = '/rejected';

/**
 * NEXTAUTH_URL에서 캐노니컬 Origin을 파싱한다.
 */
function getCanonicalOrigin(): URL | null {
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  if (!nextAuthUrl) {
    return null;
  }

  try {
    return new URL(nextAuthUrl);
  } catch {
    return null;
  }
}

/**
 * 요청 경로가 항상 공개 접근 가능한 경로인지 확인한다.
 */
function isAlwaysPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.includes(pathname);
}

/**
 * 게스트 모드 경로인지 확인한다.
 * 데모 데이터만 노출하므로 로그인 여부와 승인 상태에 관계없이 통과시킨다.
 */
function isGuestPath(pathname: string): boolean {
  return pathname === GUEST_PATH_PREFIX || pathname.startsWith(`${GUEST_PATH_PREFIX}/`);
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
 * next-auth와 같은 규칙으로 보안 쿠키(__Secure- 접두사) 사용 여부를 판단한다.
 */
function isSecureCookie(): boolean {
  return process.env.NEXTAUTH_URL?.startsWith('https://') ?? Boolean(process.env.VERCEL);
}

/**
 * next-auth 세션 토큰 쿠키 이름을 반환한다.
 */
function getSessionCookieName(): string {
  return isSecureCookie() ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
}

/**
 * 매칭된 모든 요청에 인증 및 승인 상태 가드를 적용한다.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const canonicalOrigin = getCanonicalOrigin();

  if (canonicalOrigin) {
    const requestHost = req.nextUrl.host;
    const requestProtocol = req.nextUrl.protocol;
    const canonicalHost = canonicalOrigin.host;
    const canonicalProtocol = canonicalOrigin.protocol;

    if (requestHost !== canonicalHost || requestProtocol !== canonicalProtocol) {
      const redirectUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, canonicalOrigin);
      return NextResponse.redirect(redirectUrl, 307);
    }
  }

  if (pathname.startsWith('/operations')) {
    return NextResponse.redirect(new URL('/signup-management', req.url));
  }

  if (isBypassPath(pathname) || isGuestPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: isSecureCookie(),
  });

  if (!token && !isAlwaysPublicPath(pathname)) {
    return NextResponse.redirect(buildLoginUrl(req));
  }

  if (!token) {
    return NextResponse.next();
  }

  // 쿠키 토큰은 로그인 시점 스냅샷이라, 5분마다 DB와 동기화하고 바뀐 토큰을 쿠키로 다시 발급한다.
  // App Router의 getServerSession은 쿠키를 갱신하지 않으므로 proxy가 갱신해야 승인·거절·삭제가 반영된다.
  const isTokenSynced = await syncTeacherSnapshot(token);
  const response = resolveAuthorizedResponse(req, token);

  if (isTokenSynced) {
    const sessionToken = await encode({
      token,
      secret: process.env.AUTH_SECRET ?? '',
      maxAge: DEFAULT_TOKEN_MAX_AGE_SECONDS,
    });

    response.cookies.set(getSessionCookieName(), sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: isSecureCookie(),
      maxAge: DEFAULT_TOKEN_MAX_AGE_SECONDS,
    });
  }

  return response;
}

/**
 * 로그인된 토큰의 승인 상태·권한에 따라 리다이렉트 또는 통과 응답을 만든다.
 */
function resolveAuthorizedResponse(req: NextRequest, token: JWT): NextResponse {
  const { pathname } = req.nextUrl;
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
