import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-config';
import { isAdminEmail } from '@/lib/auth';
import { createSignupCookie } from '@/lib/signup-cookie';

export const dynamic = 'force-dynamic';

/**
 * Self-signup: create a business and link the current user (owner) to it.
 * Only for authenticated users who don't already have a business.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (role === 'admin') {
    return NextResponse.json({ error: 'Admins use the admin dashboard' }, { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name } = body as { name?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      );
    }

    const email = session.user.email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: { email },
      include: { business: true },
    });
    if (existingUser?.businessId) {
      return NextResponse.json(
        { error: 'You already have a business' },
        { status: 400 }
      );
    }

    const slug =
      name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') || `biz-${Date.now()}`;

    const existingSlug = await prisma.business.findUnique({
      where: { slug },
    });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    const business = await prisma.business.create({
      data: { name: name.trim(), slug: finalSlug },
    });

    await prisma.user.create({
      data: {
        email,
        name: session.user.name ?? null,
        role: isAdminEmail(email) ? 'admin' : 'owner',
        businessId: business.id,
      },
    });

    const { name: cookieName, value: cookieValue, options } = await createSignupCookie(business.slug);
    const cookieParts = [
      `${cookieName}=${encodeURIComponent(cookieValue)}`,
      `Path=${options.path}`,
      `HttpOnly`,
      `SameSite=${options.sameSite}`,
      `Max-Age=${options.maxAge}`,
    ];
    if (options.secure) cookieParts.push('Secure');

    const res = NextResponse.json({
      slug: business.slug,
      redirect: `/dashboard/${business.slug}`,
    });
    res.headers.set('Set-Cookie', cookieParts.join('; '));
    return res;
  } catch (e) {
    console.error('Signup POST:', e);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}
