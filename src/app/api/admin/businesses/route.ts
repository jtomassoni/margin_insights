import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return null;
}

/** List all businesses */
export async function GET() {
  const err = await requireAdmin();
  if (err) return err;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const businesses = await prisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    });
    return NextResponse.json(
      businesses.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        created_at: b.createdAt.toISOString(),
        user_count: b._count.users,
      }))
    );
  } catch (e) {
    console.error('Admin businesses GET:', e);
    return NextResponse.json(
      { error: 'Failed to load businesses' },
      { status: 500 }
    );
  }
}

/** Create a business */
export async function POST(request: Request) {
  const err = await requireAdmin();
  if (err) return err;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name } = body as { name?: string };
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const business = await prisma.business.create({
      data: { name: name.trim(), slug: slug || `biz-${Date.now()}` },
    });
    return NextResponse.json({
      id: business.id,
      name: business.name,
      slug: business.slug,
      created_at: business.createdAt.toISOString(),
    });
  } catch (e) {
    console.error('Admin businesses POST:', e);
    return NextResponse.json(
      { error: 'Failed to create business' },
      { status: 500 }
    );
  }
}
