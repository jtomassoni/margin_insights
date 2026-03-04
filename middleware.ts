import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSignupCookieFromRequest, verifySignupCookie } from '@/lib/signup-cookie';

const PROTECTED_PATHS = ['/dashboard', '/admin', '/demo-dashboard'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Reserved route names — these are NOT company slugs (old URL structure) */
const DASHBOARD_RESERVED = ['reporting', 'ingredients', 'sales', 'profile'];

/**
 * Dashboard paths require a company slug: /dashboard/[slug] or /dashboard/[slug]/...
 * Paths like /dashboard, /dashboard/reporting (reserved name as first segment) are invalid.
 */
function getDashboardSlug(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const segment = match ? match[1] : null;
  if (!segment || DASHBOARD_RESERVED.includes(segment)) return null;
  return segment;
}

function isDashboardWithSlug(pathname: string): boolean {
  const slug = getDashboardSlug(pathname);
  return slug !== null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.APP_AUTH_SECRET,
  });

  if (!token) {
    const signInUrl = new URL('/login', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  const role = token.role as 'admin' | 'owner' | undefined;
  const businessSlug = token.businessSlug as string | null | undefined;

  // Admin users: redirect /dashboard without slug to /admin (admin home)
  // Admin CAN access /dashboard/[slug] to super-jump into any company
  if (role === 'admin' && (pathname === '/dashboard' || (pathname.startsWith('/dashboard/') && !isDashboardWithSlug(pathname)))) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // /dashboard/admin is the special admin company — redirect to /admin (no restaurant data)
  if (pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Non-admin users: block /admin
  if (role !== 'admin' && (pathname === '/admin' || pathname.startsWith('/admin/'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Dashboard without slug (e.g. /dashboard, /dashboard/reporting) — invalid for everyone
  // Redirect to login so user must pick a company (owner gets their slug, admin goes to /admin)
  if (pathname === '/dashboard' || (pathname.startsWith('/dashboard/') && !isDashboardWithSlug(pathname))) {
    const signInUrl = new URL('/login', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Owner on /dashboard/[slug]: must match their business slug only
  if (role === 'owner' && pathname.startsWith('/dashboard/')) {
    const slug = getDashboardSlug(pathname);
    if (slug && businessSlug && slug !== businessSlug) {
      // Owner trying to access another company — redirect to their dashboard
      return NextResponse.redirect(new URL(`/dashboard/${businessSlug}`, request.url));
    }
    if (slug && !businessSlug) {
      // Owner has no business slug — allow if valid post-signup cookie
      const cookieValue = getSignupCookieFromRequest(request.headers.get('cookie'));
      if (cookieValue && (await verifySignupCookie(cookieValue, slug))) {
        return NextResponse.next();
      }
      return NextResponse.redirect(new URL('/signup', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/demo-dashboard/:path*'],
};
