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

/** Update a user */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const err = await requireAdmin();
  if (err) return err;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { email, name, role, business_id } = body as {
      email?: string;
      name?: string;
      role?: string;
      business_id?: string | null;
    };

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: {
      email?: string;
      name?: string | null;
      role?: string;
      businessId?: string | null;
    } = {};

    if (typeof email === 'string' && email.trim()) {
      updateData.email = email.trim().toLowerCase();
    }
    if (typeof name === 'string') {
      updateData.name = name.trim() || null;
    }
    if (role === 'admin' || role === 'owner') {
      updateData.role = role;
    }
    if (business_id !== undefined) {
      updateData.businessId = business_id || null;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
    console.error('Admin users PATCH:', e);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
