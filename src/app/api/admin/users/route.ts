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

/** List all users */
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
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { business: true },
    });
    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        business_id: u.businessId,
        business_name: u.business?.name ?? null,
        created_at: u.createdAt.toISOString(),
      }))
    );
  } catch (e) {
    console.error('Admin users GET:', e);
    return NextResponse.json(
      { error: 'Failed to load users' },
      { status: 500 }
    );
  }
}

/** Create a user */
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
    const { email, name, role, business_id } = body as {
      email?: string;
      name?: string;
      role?: string;
      business_id?: string;
    };
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        name: typeof name === 'string' ? name.trim() || null : null,
        role: role === 'admin' ? 'admin' : 'owner',
        businessId: business_id || null,
      },
      include: { business: true },
    });
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      business_id: user.businessId,
      business_name: user.business?.name ?? null,
      created_at: user.createdAt.toISOString(),
    });
  } catch (e) {
    console.error('Admin users POST:', e);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
