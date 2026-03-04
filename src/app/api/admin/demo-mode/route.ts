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

/** Get demo mode status */
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
    const setting = await prisma.setting.findUnique({
      where: { key: 'demoMode' },
    });
    const demoMode = setting?.value === 'true';
    return NextResponse.json({ demoMode });
  } catch (e) {
    console.error('Admin demo-mode GET:', e);
    return NextResponse.json(
      { error: 'Failed to load demo mode' },
      { status: 500 }
    );
  }
}
