import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getSignupCookieFromRequest, verifySignupCookie } from '@/lib/signup-cookie';

const PROTECTED_PATHS = ['/dashboard', '/admin', '/demo-dashboard'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Reserved route names — these are NOT company slugs (sub-routes under a company) */
const DASHBOARD_RESERVED = ['reporting', 'ingredients', 'sales', 'profile'];

/** Admin-only segments under /dashboard (businesses, users, profile) */
const DASHBOARD_ADMIN_SEGMENTS = ['businesses', 'users', 'profile'];

/**
 * Dashboard paths require a company slug: /dashboard/[slug] or /dashboard/[slug]/...
 * Admin routes: /dashboard, /dashboard/businesses, /dashboard/users, /dashboard/profile
 */
function getDashboardSlug(pathname: string): string | null {
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const segment = match ? match[1] : null;
  if (!segment || DASHBOARD_RESERVED.includes(segment) || DASHBOARD_ADMIN_SEGMENTS.includes(segment)) return null;
  return segment;
}

function isDashboardWithSlug(pathname: string): boolean {
  const slug = getDashboardSlug(pathname);
  return slug !== null;
}

function isAdminDashboardRoute(pathname: string): boolean {
  if (pathname === '/dashboard') return true;
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const segment = match ? match[1] : null;
  return segment !== null && DASHBOARD_ADMIN_SEGMENTS.includes(segment);
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

  // Redirect /admin to /dashboard (consolidated endpoint)
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (role !== 'admin') {
      const target = businessSlug ? `/dashboard/${businessSlug}` : '/signup';
      return NextResponse.redirect(new URL(target, request.url));
    }
    const target = pathname === '/admin' ? '/dashboard' : pathname.replace(/^\/admin/, '/dashboard');
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Admin dashboard routes: /dashboard, /dashboard/businesses, /dashboard/users, /dashboard/profile
  // Admin: allow. Owner: redirect to their company dashboard
  if (isAdminDashboardRoute(pathname)) {
    if (role === 'admin') return NextResponse.next();
    const target = businessSlug ? `/dashboard/${businessSlug}` : '/signup';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // /dashboard/admin is the special admin company — redirect to /dashboard (admin home)
  if (pathname === '/dashboard/admin' || pathname.startsWith('/dashboard/admin/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Dashboard without valid slug (e.g. /dashboard/reporting) — invalid, redirect to login
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
