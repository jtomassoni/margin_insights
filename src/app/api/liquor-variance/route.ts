import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export interface LiquorVarianceEntry {
  id: string;
  start_date: string;
  end_date: string;
  item_name: string;
  bought_bottles: number;
  sold_bottles: number;
  begin_on_hand_bottles: number | null;
  end_on_hand_bottles: number | null;
  created_at: string;
}

/** List liquor variance entries. Optional query: startDate, endDate (ISO strings). */
export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: { startDate?: { gte: Date }; endDate?: { lte: Date } } = {};
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { lte: new Date(endDate) };

    const entries = await prisma.liquorVarianceEntry.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    });

    const result: LiquorVarianceEntry[] = entries.map((e) => ({
      id: e.id,
      start_date: e.startDate.toISOString().slice(0, 10),
      end_date: e.endDate.toISOString().slice(0, 10),
      item_name: e.itemName,
      bought_bottles: e.boughtBottles,
      sold_bottles: e.soldBottles,
      begin_on_hand_bottles: e.beginOnHandBottles,
      end_on_hand_bottles: e.endOnHandBottles,
      created_at: e.createdAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('Liquor variance GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load' },
      { status: 500 }
    );
  }
}

/** Create a liquor variance entry. */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      start_date,
      end_date,
      item_name,
      bought_bottles,
      sold_bottles,
      begin_on_hand_bottles,
      end_on_hand_bottles,
    } = body;

    if (
      !start_date ||
      !end_date ||
      typeof item_name !== 'string' ||
      item_name.trim() === '' ||
      typeof bought_bottles !== 'number' ||
      typeof sold_bottles !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Missing required fields: start_date, end_date, item_name, bought_bottles, sold_bottles' },
        { status: 400 }
      );
    }

    const entry = await prisma.liquorVarianceEntry.create({
      data: {
        startDate: new Date(start_date),
        endDate: new Date(end_date),
        itemName: item_name.trim(),
        boughtBottles: Math.max(0, Math.floor(bought_bottles)),
        soldBottles: Math.max(0, Math.floor(sold_bottles)),
        beginOnHandBottles:
          begin_on_hand_bottles != null ? Math.max(0, Math.floor(begin_on_hand_bottles)) : null,
        endOnHandBottles:
          end_on_hand_bottles != null ? Math.max(0, Math.floor(end_on_hand_bottles)) : null,
      },
    });

    return NextResponse.json({
      id: entry.id,
      start_date: entry.startDate.toISOString().slice(0, 10),
      end_date: entry.endDate.toISOString().slice(0, 10),
      item_name: entry.itemName,
      bought_bottles: entry.boughtBottles,
      sold_bottles: entry.soldBottles,
      begin_on_hand_bottles: entry.beginOnHandBottles,
      end_on_hand_bottles: entry.endOnHandBottles,
      created_at: entry.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('Liquor variance POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    );
  }
}
