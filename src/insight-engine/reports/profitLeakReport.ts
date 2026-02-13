import type { ItemMarginRow } from '../services/marginEngine';
import { priceAtTargetMargin, suggestPrice } from '../services/pricingEngine';

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
}

export interface ProfitLeakReport {
  summary: {
    bottom_margin_skus: number;
    estimated_lost_profit_per_month: number;
    message: string;
  };
  items: ProfitLeakItem[];
  generated_at: string;
}

const DEFAULT_TARGET_MARGIN = 0.75;
const BOTTOM_PCT = 20;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Identify bottom 20% margin items and estimate lost profit if raised to target margin.
 * @param targetMargin - Default target gross margin as decimal (e.g. 0.75 for 75%).
 * @param perItemTargetMargin - Optional per-item override (decimal). Key = item_name.
 */
export const buildProfitLeakReport = (
  rows: ItemMarginRow[],
  targetMargin: number = DEFAULT_TARGET_MARGIN,
  perItemTargetMargin?: Record<string, number>
): ProfitLeakReport => {
  const withMargin = rows.filter((r) => r.revenue > 0 && !Number.isNaN(r.gross_margin_pct));
  if (withMargin.length === 0) {
    return {
      summary: { bottom_margin_skus: 0, estimated_lost_profit_per_month: 0, message: 'No items with margin data.' },
      items: [],
      generated_at: new Date().toISOString(),
    };
  }

  const sorted = [...withMargin].sort((a, b) => a.gross_margin_pct - b.gross_margin_pct);
  const cutoffIndex = Math.max(0, Math.floor(sorted.length * (BOTTOM_PCT / 100)) - 1);
  const marginThreshold = sorted[cutoffIndex]?.gross_margin_pct ?? 0;
  const bottomItems = sorted.filter((r) => r.gross_margin_pct <= marginThreshold);

  const getTarget = (itemName: string) => perItemTargetMargin?.[itemName] ?? targetMargin;

  const items: ProfitLeakItem[] = bottomItems.map((r) => {
    const price = r.price ?? (r.units_sold > 0 ? r.revenue / r.units_sold : 0);
    const target = getTarget(r.item_name);
    const suggestion = suggestPrice(r.cost_per_serving, price, target);
    // Loss to reach target: use full target-margin price (uncapped), so we know true $ left on table at 75%
    const priceAtTarget = priceAtTargetMargin(r.cost_per_serving, target);
    const potential_contribution = (priceAtTarget - r.cost_per_serving) * r.units_sold;
    const estimated_lost_profit_per_month = Math.max(0, potential_contribution - r.contribution_margin);
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
    };
  });

  const totalLost = items.reduce((sum, i) => sum + i.estimated_lost_profit_per_month, 0);
  const message =
    items.length > 0
      ? `You're losing approximately $${Math.round(totalLost).toLocaleString()}/month on ${items.length} SKU(s) by pricing below target margin.`
      : 'No bottom-margin items in this dataset.';

  return {
    summary: {
      bottom_margin_skus: items.length,
      estimated_lost_profit_per_month: round2(totalLost),
      message,
    },
    items,
    generated_at: new Date().toISOString(),
  };
};
