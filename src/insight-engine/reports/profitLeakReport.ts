import type { ItemMarginRow } from '../services/marginEngine';
import { priceAtTargetMargin, suggestPrice } from '../services/pricingEngine';

/** Whether this leak item is a candidate "loss leader" (high volume, low margin — may be intentional). */
export type LeakItemRole = 'to_fix' | 'strategic_candidate';

export interface ProfitLeakItem {
  item_name: string;
  current_margin_pct: number;
  units_sold: number;
  revenue: number;
  cost_per_serving: number;
  current_contribution: number;
  suggested_price: number;
  potential_contribution: number;
  estimated_lost_profit_per_month: number;
  /** High-volume low-margin items may be intentional loss leaders; review before raising. */
  role: LeakItemRole;
}

export interface ProfitLeakReport {
  summary: {
    bottom_margin_skus: number;
    estimated_lost_profit_per_month: number;
    /** Lost profit from items we suggest fixing (excludes strategic candidates). */
    lost_from_items_to_fix: number;
    /** Lost profit from high-volume low-margin items (possible loss leaders). */
    lost_from_strategic_candidates: number;
    items_to_fix_count: number;
    strategic_candidate_count: number;
    message: string;
  };
  items: ProfitLeakItem[];
  generated_at: string;
}

const DEFAULT_TARGET_MARGIN = 0.75;
const BOTTOM_PCT = 20;
/** Volume percentile above which a low-margin item is treated as a "strategic candidate" (possible loss leader). */
const STRATEGIC_VOLUME_PCT = 60;
const round2 = (n: number) => Math.round(n * 100) / 100;

const percentile = (sorted: number[], pct: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((pct / 100) * sorted.length));
  return sorted[idx] ?? 0;
};

/**
 * Identify bottom 20% margin items and estimate lost profit if raised to target margin.
 * Classifies items as "to_fix" vs "strategic_candidate" (high volume + low margin = possible loss leader).
 * @param targetMargin - Default target gross margin as decimal (e.g. 0.75 for 75%).
 * @param perItemTargetMargin - Optional per-item override (decimal). Key = item_name.
 * @param strategicItemNames - Optional set of item names to always treat as strategic (e.g. user-marked loss leaders).
 */
export const buildProfitLeakReport = (
  rows: ItemMarginRow[],
  targetMargin: number = DEFAULT_TARGET_MARGIN,
  perItemTargetMargin?: Record<string, number>,
  strategicItemNames?: Set<string>
): ProfitLeakReport => {
  const withMargin = rows.filter((r) => r.revenue > 0 && !Number.isNaN(r.gross_margin_pct));
  if (withMargin.length === 0) {
    return {
      summary: {
        bottom_margin_skus: 0,
        estimated_lost_profit_per_month: 0,
        lost_from_items_to_fix: 0,
        lost_from_strategic_candidates: 0,
        items_to_fix_count: 0,
        strategic_candidate_count: 0,
        message: 'No items with margin data.',
      },
      items: [],
      generated_at: new Date().toISOString(),
    };
  }

  const sorted = [...withMargin].sort((a, b) => a.gross_margin_pct - b.gross_margin_pct);
  const cutoffIndex = Math.max(0, Math.floor(sorted.length * (BOTTOM_PCT / 100)) - 1);
  const marginThreshold = sorted[cutoffIndex]?.gross_margin_pct ?? 0;
  const bottomItems = sorted.filter((r) => r.gross_margin_pct <= marginThreshold);

  const volumes = [...withMargin].map((r) => r.units_sold).sort((a, b) => a - b);
  const volumeAtStrategic = percentile(volumes, STRATEGIC_VOLUME_PCT);

  const getTarget = (itemName: string) => perItemTargetMargin?.[itemName] ?? targetMargin;
  const isStrategic = (itemName: string, unitsSold: number) =>
    strategicItemNames?.has(itemName) ?? unitsSold >= volumeAtStrategic;

  const items: ProfitLeakItem[] = bottomItems.map((r) => {
    const price = r.price ?? (r.units_sold > 0 ? r.revenue / r.units_sold : 0);
    const target = getTarget(r.item_name);
    const suggestion = suggestPrice(r.cost_per_serving, price, target);
    const priceAtTarget = priceAtTargetMargin(r.cost_per_serving, target);
    const potential_contribution = (priceAtTarget - r.cost_per_serving) * r.units_sold;
    const estimated_lost_profit_per_month = Math.max(0, potential_contribution - r.contribution_margin);
    const role: LeakItemRole = isStrategic(r.item_name, r.units_sold) ? 'strategic_candidate' : 'to_fix';
    return {
      item_name: r.item_name,
      current_margin_pct: r.gross_margin_pct,
      units_sold: r.units_sold,
      revenue: r.revenue,
      cost_per_serving: r.cost_per_serving,
      current_contribution: r.contribution_margin,
      suggested_price: suggestion.suggested_price,
      potential_contribution: round2(potential_contribution),
      estimated_lost_profit_per_month: round2(estimated_lost_profit_per_month),
      role,
    };
  });

  const totalLost = items.reduce((sum, i) => sum + i.estimated_lost_profit_per_month, 0);
  const lostFromFix = items.filter((i) => i.role === 'to_fix').reduce((s, i) => s + i.estimated_lost_profit_per_month, 0);
  const lostFromStrategic = items.filter((i) => i.role === 'strategic_candidate').reduce((s, i) => s + i.estimated_lost_profit_per_month, 0);
  const toFixCount = items.filter((i) => i.role === 'to_fix').length;
  const strategicCount = items.filter((i) => i.role === 'strategic_candidate').length;

  const message =
    items.length > 0
      ? `You're losing approximately $${Math.round(totalLost).toLocaleString()}/month on ${items.length} SKU(s) by pricing below target margin.`
      : 'No bottom-margin items in this dataset.';

  return {
    summary: {
      bottom_margin_skus: items.length,
      estimated_lost_profit_per_month: round2(totalLost),
      lost_from_items_to_fix: round2(lostFromFix),
      lost_from_strategic_candidates: round2(lostFromStrategic),
      items_to_fix_count: toFixCount,
      strategic_candidate_count: strategicCount,
      message,
    },
    items,
    generated_at: new Date().toISOString(),
  };
};
