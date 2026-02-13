import type { ItemMarginRow } from './marginEngine';

export type Quadrant = 'high_volume_high_margin' | 'high_volume_low_margin' | 'low_volume_high_margin' | 'low_volume_low_margin';

export interface QuadrantItem {
  item_name: string;
  quadrant: Quadrant;
  units_sold: number;
  revenue: number;
  gross_margin_pct: number;
  contribution_margin: number;
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const getQuadrant = (highVolume: boolean, highMargin: boolean): Quadrant => {
  if (highVolume && highMargin) return 'high_volume_high_margin';
  if (highVolume && !highMargin) return 'high_volume_low_margin';
  if (!highVolume && highMargin) return 'low_volume_high_margin';
  return 'low_volume_low_margin';
};

/**
 * Split items into quadrants by volume (units_sold) and margin (gross_margin_pct).
 * High/low relative to medians.
 */
export const runQuadrantAnalysis = (rows: ItemMarginRow[]): QuadrantItem[] => {
  const volumes = rows.map((r) => r.units_sold).filter((v) => v > 0);
  const margins = rows.map((r) => r.gross_margin_pct).filter((v) => !Number.isNaN(v));
  const volMedian = median(volumes) || 0;
  const marginMedian = median(margins) ?? 0;

  return rows.map((r) => ({
    item_name: r.item_name,
    quadrant: getQuadrant(r.units_sold >= volMedian, r.gross_margin_pct >= marginMedian),
    units_sold: r.units_sold,
    revenue: r.revenue,
    gross_margin_pct: r.gross_margin_pct,
    contribution_margin: r.contribution_margin,
  }));
};
