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

/**
 * Disable demo mode and wipe all operational data (ingredients, recipes, sales, etc.).
 * Businesses and users are preserved.
 */
export async function POST() {
  const err = await requireAdmin();
  if (err) return err;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.costSnapshotLine.deleteMany({});
      await tx.costSnapshot.deleteMany({});
      await tx.recipeLine.deleteMany({});
      await tx.recipe.deleteMany({});
      await tx.ingredient.deleteMany({});
      await tx.menuPrice.deleteMany({});
      await tx.menuMarginGoal.deleteMany({});
      await tx.salesRecord.deleteMany({});
      await tx.liquorVarianceEntry.deleteMany({});

      await tx.setting.upsert({
        where: { key: 'demoMode' },
        create: { key: 'demoMode', value: 'false' },
        update: { value: 'false' },
      });
    });

    return NextResponse.json({ ok: true, demoMode: false });
  } catch (e) {
    console.error('Admin wipe-database POST:', e);
    return NextResponse.json(
      { error: 'Failed to wipe database' },
      { status: 500 }
    );
  }
}
