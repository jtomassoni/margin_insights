import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  findSeasonalInsights,
  findCostTrendInsights,
  type SnapshotInsight,
} from '@/insight-engine/services/snapshotInsights';

export const dynamic = 'force-dynamic';

/** Get snapshot-based insights (seasonal sales, cost trends) */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const [snapshots, salesRecords] = await Promise.all([
      prisma.costSnapshot.findMany({
        orderBy: { createdAt: 'asc' },
        include: { lines: true },
      }),
      prisma.salesRecord.findMany(),
    ]);

    const snapshotSummaries = snapshots.map((s) => ({
      id: s.id,
      name: s.name,
      start_date: s.startDate?.toISOString() ?? null,
      end_date: s.endDate?.toISOString() ?? null,
    }));

    const snapshotDetails = snapshots.map((s) => ({
      id: s.id,
      name: s.name,
      start_date: s.startDate?.toISOString() ?? null,
      end_date: s.endDate?.toISOString() ?? null,
      lines: s.lines.map((l) => ({
        ingredient_id: l.ingredientId,
        ingredient_name: l.ingredientName,
        cost_per_unit: l.costPerUnit,
      })),
    }));

    const salesWithTimestamps = salesRecords.map((s) => ({
      item_name: s.itemName,
      units_sold: s.unitsSold,
      revenue: s.revenue,
      timestamp: s.timestamp?.toISOString(),
    }));

    const seasonalInsights = findSeasonalInsights(
      snapshotSummaries,
      salesWithTimestamps,
      25
    );

    const costTrendInsights = findCostTrendInsights(snapshotDetails, 10);

    const insights: SnapshotInsight[] = [
      ...seasonalInsights,
      ...costTrendInsights,
    ].sort((a, b) => {
      const scoreA = a.type === 'seasonal_sales' ? Math.abs(a.change_pct) : Math.abs(a.change_pct) / 2;
      const scoreB = b.type === 'seasonal_sales' ? Math.abs(b.change_pct) : Math.abs(b.change_pct) / 2;
      return scoreB - scoreA;
    });

    return NextResponse.json({
      insights: insights.slice(0, 15),
      seasonal_count: seasonalInsights.length,
      cost_trend_count: costTrendInsights.length,
      has_timestamped_sales: salesWithTimestamps.some((r) => r.timestamp),
      snapshots_with_ranges: snapshotSummaries.filter((s) => s.start_date && s.end_date).length,
    });
  } catch (err) {
    console.error('Snapshot insights GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load insights' },
      { status: 500 }
    );
  }
}
