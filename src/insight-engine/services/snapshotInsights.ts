/**
 * Snapshot insights — seasonal sales, cost trends, period comparisons.
 * Uses cost snapshots with date ranges + sales records with timestamps.
 */

export interface SnapshotWithRange {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
}

export interface SalesRecordWithTimestamp {
  item_name: string;
  units_sold: number;
  revenue: number;
  timestamp?: string;
}

export interface SeasonalInsight {
  type: 'seasonal_sales';
  item_name: string;
  period_a: string;
  period_b: string;
  units_a: number;
  units_b: number;
  change_pct: number;
  message: string;
}

export interface CostTrendInsight {
  type: 'cost_trend';
  ingredient_name: string;
  period_a: string;
  period_b: string;
  cost_a: number;
  cost_b: number;
  change_pct: number;
  message: string;
}

export type SnapshotInsight = SeasonalInsight | CostTrendInsight;

/**
 * Aggregate sales by item within a date range.
 */
export function aggregateSalesInRange(
  records: SalesRecordWithTimestamp[],
  startDate: string,
  endDate: string
): Map<string, number> {
  const start = new Date(startDate + 'T00:00:00').getTime();
  const end = new Date(endDate + 'T23:59:59').getTime();
  const map = new Map<string, number>();

  for (const r of records) {
    if (!r.timestamp) continue;
    const t = new Date(r.timestamp).getTime();
    if (t < start || t > end) continue;
    const key = r.item_name.trim();
    map.set(key, (map.get(key) ?? 0) + r.units_sold);
  }
  return map;
}

/**
 * Format period label from date range.
 */
function formatPeriodLabel(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
    return `${monthNames[s.getMonth()]} ${s.getFullYear()}`;
  }
  return `${monthNames[s.getMonth()]} ${s.getFullYear()} – ${monthNames[e.getMonth()]} ${e.getFullYear()}`;
}

/**
 * Find seasonal sales insights: items that sold significantly more in one period vs another.
 */
export function findSeasonalInsights(
  snapshots: SnapshotWithRange[],
  salesRecords: SalesRecordWithTimestamp[],
  minChangePct: number = 30
): SeasonalInsight[] {
  const insights: SeasonalInsight[] = [];
  const withRanges = snapshots.filter((s) => s.start_date && s.end_date);
  const withTimestamps = salesRecords.filter((r) => r.timestamp);

  if (withRanges.length < 2 || withTimestamps.length === 0) return insights;

  for (let i = 0; i < withRanges.length; i++) {
    for (let j = i + 1; j < withRanges.length; j++) {
      const a = withRanges[i];
      const b = withRanges[j];
      if (!a.start_date || !a.end_date || !b.start_date || !b.end_date) continue;

      const salesA = aggregateSalesInRange(salesRecords, a.start_date, a.end_date);
      const salesB = aggregateSalesInRange(salesRecords, b.start_date, b.end_date);

      const allItems = new Set([...Array.from(salesA.keys()), ...Array.from(salesB.keys())]);

      for (const item of Array.from(allItems)) {
        const uA = salesA.get(item) ?? 0;
        const uB = salesB.get(item) ?? 0;
        const total = uA + uB;
        if (total < 5) continue;

        const changePct = uA > 0 ? ((uB - uA) / uA) * 100 : (uB > 0 ? 100 : 0);
        if (Math.abs(changePct) < minChangePct) continue;

        const periodA = formatPeriodLabel(a.start_date, a.end_date);
        const periodB = formatPeriodLabel(b.start_date, b.end_date);

        let message: string;
        if (changePct > 0) {
          message = `${item} sold ${changePct.toFixed(0)}% more in ${periodB} (${uB} units) vs ${periodA} (${uA} units).`;
        } else {
          message = `${item} sold ${Math.abs(changePct).toFixed(0)}% less in ${periodB} (${uB} units) vs ${periodA} (${uA} units).`;
        }

        insights.push({
          type: 'seasonal_sales',
          item_name: item,
          period_a: periodA,
          period_b: periodB,
          units_a: uA,
          units_b: uB,
          change_pct: changePct,
          message,
        });
      }
    }
  }

  return insights
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
    .slice(0, 10);
}

/**
 * Find cost trend insights from snapshot line comparisons.
 */
export interface SnapshotLine {
  ingredient_id: string;
  ingredient_name: string;
  cost_per_unit: number;
}

export interface SnapshotDetail extends SnapshotWithRange {
  lines: SnapshotLine[];
}

export function findCostTrendInsights(
  snapshots: SnapshotDetail[],
  minChangePct: number = 10
): CostTrendInsight[] {
  const insights: CostTrendInsight[] = [];
  const withRanges = snapshots.filter((s) => s.start_date && s.end_date && s.lines?.length > 0);

  if (withRanges.length < 2) return insights;

  for (let i = 0; i < withRanges.length; i++) {
    for (let j = i + 1; j < withRanges.length; j++) {
      const a = withRanges[i];
      const b = withRanges[j];

      const costByIngredientA = new Map(a.lines.map((l) => [l.ingredient_id, l]));
      const costByIngredientB = new Map(b.lines.map((l) => [l.ingredient_id, l]));

      const allIds = new Set([...Array.from(costByIngredientA.keys()), ...Array.from(costByIngredientB.keys())]);

      for (const id of Array.from(allIds)) {
        const lineA = costByIngredientA.get(id);
        const lineB = costByIngredientB.get(id);
        if (!lineA || !lineB || lineA.cost_per_unit <= 0) continue;

        const changePct = ((lineB.cost_per_unit - lineA.cost_per_unit) / lineA.cost_per_unit) * 100;
        if (Math.abs(changePct) < minChangePct) continue;

        const periodA = formatPeriodLabel(a.start_date!, a.end_date!);
        const periodB = formatPeriodLabel(b.start_date!, b.end_date!);

        const name = lineA.ingredient_name || lineB.ingredient_name || 'Unknown';
        let message: string;
        if (changePct > 0) {
          message = `${name} cost increased ${changePct.toFixed(0)}% from ${periodA} ($${lineA.cost_per_unit.toFixed(2)}) to ${periodB} ($${lineB.cost_per_unit.toFixed(2)}).`;
        } else {
          message = `${name} cost decreased ${Math.abs(changePct).toFixed(0)}% from ${periodA} ($${lineA.cost_per_unit.toFixed(2)}) to ${periodB} ($${lineB.cost_per_unit.toFixed(2)}).`;
        }

        insights.push({
          type: 'cost_trend',
          ingredient_name: name,
          period_a: periodA,
          period_b: periodB,
          cost_a: lineA.cost_per_unit,
          cost_b: lineB.cost_per_unit,
          change_pct: changePct,
          message,
        });
      }
    }
  }

  return insights
    .sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct))
    .slice(0, 10);
}
