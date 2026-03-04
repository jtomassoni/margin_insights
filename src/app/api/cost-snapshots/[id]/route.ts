import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Get a single cost snapshot with all lines */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const snapshot = await prisma.costSnapshot.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: snapshot.id,
      name: snapshot.name,
      created_at: snapshot.createdAt.toISOString(),
      start_date: snapshot.startDate?.toISOString() ?? null,
      end_date: snapshot.endDate?.toISOString() ?? null,
      lines: snapshot.lines.map((l) => ({
        ingredient_id: l.ingredientId,
        ingredient_name: l.ingredientName,
        unit_type: l.unitType,
        cost_per_unit: l.costPerUnit,
      })),
    });
  } catch (err) {
    console.error('Cost snapshot GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load' },
      { status: 500 }
    );
  }
}

/** Update a cost snapshot (name, date range) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, start_date, end_date } = body as {
      name?: string;
      start_date?: string | null;
      end_date?: string | null;
    };

    const data: { name?: string; startDate?: Date | null; endDate?: Date | null } = {};
    if (typeof name === 'string' && name.trim()) data.name = name.trim();
    if (start_date !== undefined) {
      data.startDate = start_date ? (() => {
        const d = new Date(start_date);
        return !isNaN(d.getTime()) ? d : null;
      })() : null;
    }
    if (end_date !== undefined) {
      data.endDate = end_date ? (() => {
        const d = new Date(end_date);
        return !isNaN(d.getTime()) ? d : null;
      })() : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const snapshot = await prisma.costSnapshot.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: snapshot.id,
      name: snapshot.name,
      created_at: snapshot.createdAt.toISOString(),
      start_date: snapshot.startDate?.toISOString() ?? null,
      end_date: snapshot.endDate?.toISOString() ?? null,
    });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }
    console.error('Cost snapshot PATCH error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update' },
      { status: 500 }
    );
  }
}

/** Delete a cost snapshot */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    await prisma.costSnapshot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2025') {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }
    console.error('Cost snapshot DELETE error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete' },
      { status: 500 }
    );
  }
}
