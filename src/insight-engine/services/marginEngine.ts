import type { SalesRecord } from '../models/SalesRecord';

export interface ItemMarginRow {
  item_name: string;
  units_sold: number;
  revenue: number;
  cost_per_serving: number;
  total_cost: number;
  gross_margin_pct: number;
  contribution_margin: number;
  price?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Aggregate sales by item name (sum units and revenue).
 */
const aggregateSales = (records: SalesRecord[]): Map<string, { units_sold: number; revenue: number }> => {
  const map = new Map<string, { units_sold: number; revenue: number }>();
  records.forEach((r) => {
    const key = r.item_name.trim();
    const existing = map.get(key) ?? { units_sold: 0, revenue: 0 };
    map.set(key, {
      units_sold: existing.units_sold + r.units_sold,
      revenue: existing.revenue + r.revenue,
    });
  });
  return map;
};

/**
 * Compute per-item margins and contribution.
 * Items without cost get margin NaN/0; caller can filter.
 * When menuPrices is provided, revenue is computed as units_sold × price for that item
 * (keeps revenue in sync when price is edited in menu manager).
 */
export const computeMargins = (
  records: SalesRecord[],
  itemCosts: Map<string, number>,
  menuPrices?: Record<string, number>
): ItemMarginRow[] => {
  const salesByItem = aggregateSales(records);
  return Array.from(salesByItem.entries()).map(([item_name, { units_sold, revenue }]) => {
    const price = menuPrices?.[item_name];
    const effectiveRevenue =
      price != null && price > 0 && units_sold > 0
        ? round2(units_sold * price)
        : revenue;
    const cost_per_serving = itemCosts.get(item_name) ?? 0;
    const total_cost = cost_per_serving * units_sold;
    const contribution_margin = effectiveRevenue - total_cost;
    const gross_margin_pct =
      effectiveRevenue > 0 ? (contribution_margin / effectiveRevenue) * 100 : 0;
    const impliedPrice =
      units_sold > 0 ? round2(effectiveRevenue / units_sold) : undefined;
    return {
      item_name,
      units_sold,
      revenue: effectiveRevenue,
      cost_per_serving,
      total_cost,
      gross_margin_pct: round2(gross_margin_pct),
      contribution_margin: round2(contribution_margin),
      price: impliedPrice,
    };
  });
};

/**
 * Category margin: sum revenue and contribution by category if menu items have category.
 */
export const categoryMargins = (
  rows: ItemMarginRow[],
  itemCategories: Map<string, string>
): { category: string; revenue: number; contribution: number; margin_pct: number }[] => {
  const byCat = new Map<string, { revenue: number; contribution: number }>();
  rows.forEach((r) => {
    const category = itemCategories.get(r.item_name) ?? 'Uncategorized';
    const existing = byCat.get(category) ?? { revenue: 0, contribution: 0 };
    byCat.set(category, {
      revenue: existing.revenue + r.revenue,
      contribution: existing.contribution + r.contribution_margin,
    });
  });
  return Array.from(byCat.entries()).map(([category, { revenue, contribution }]) => ({
    category,
    revenue,
    contribution,
    margin_pct: revenue > 0 ? (contribution / revenue) * 100 : 0,
  }));
};
