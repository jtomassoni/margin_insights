import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** List cost snapshots, newest first */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const snapshots = await prisma.costSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lines: true,
      },
    });

    return NextResponse.json(
      snapshots.map((s) => ({
        id: s.id,
        name: s.name,
        created_at: s.createdAt.toISOString(),
        start_date: s.startDate?.toISOString() ?? null,
        end_date: s.endDate?.toISOString() ?? null,
        line_count: s.lines.length,
      }))
    );
  } catch (err) {
    console.error('Cost snapshots GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load' },
      { status: 500 }
    );
  }
}

/** Create a cost snapshot. Pass ingredients from client for current state, or omit to use DB. */
export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, ingredients: ingredientsFromBody, start_date, end_date } = body as {
      name: string;
      ingredients?: Array<{ id: string; name: string; unit_type: string; cost_per_unit: number }>;
      start_date?: string;
      end_date?: string;
    };

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    let ingredients: Array<{ id: string; name: string; unitType: string; costPerUnit: number }>;

    if (Array.isArray(ingredientsFromBody) && ingredientsFromBody.length > 0) {
      ingredients = ingredientsFromBody.map((i) => ({
        id: i.id,
        name: String(i.name ?? ''),
        unitType: String(i.unit_type ?? 'oz'),
        costPerUnit: Math.max(0, Number(i.cost_per_unit) ?? 0),
      }));
    } else {
      const fromDb = await prisma.ingredient.findMany();
      ingredients = fromDb.map((i) => ({
        id: i.id,
        name: i.name,
        unitType: i.unitType,
        costPerUnit: i.costPerUnit,
      }));
    }

    const startDate = start_date ? new Date(start_date) : null;
    const endDate = end_date ? new Date(end_date) : null;

    const snapshot = await prisma.costSnapshot.create({
      data: {
        name: name.trim(),
        startDate: startDate && !isNaN(startDate.getTime()) ? startDate : null,
        endDate: endDate && !isNaN(endDate.getTime()) ? endDate : null,
        lines: {
          create: ingredients.map((i) => ({
            ingredientId: i.id,
            ingredientName: i.name,
            unitType: i.unitType,
            costPerUnit: i.costPerUnit,
          })),
        },
      },
      include: { lines: true },
    });

    return NextResponse.json({
      id: snapshot.id,
      name: snapshot.name,
      created_at: snapshot.createdAt.toISOString(),
      start_date: snapshot.startDate?.toISOString() ?? null,
      end_date: snapshot.endDate?.toISOString() ?? null,
      line_count: snapshot.lines.length,
    });
  } catch (err) {
    console.error('Cost snapshots POST error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save' },
      { status: 500 }
    );
  }
}
