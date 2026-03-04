/**
 * Overview dashboard data utilities.
 * Derives category mapping, quick wins, and issue labels from margin/leak data.
 */
import type { ItemMarginRow } from '../services/marginEngine';
import type { ProfitLeakItem } from '../reports/profitLeakReport';
import { categoryMargins } from '../services/marginEngine';

/** Map item names to display categories for margin summary. */
const ITEM_CATEGORY_MAP: Record<string, string> = {
  'House Margarita': 'Cocktails',
  'Old Fashioned': 'Cocktails',
  'Espresso Martini': 'Cocktails',
  'Sangria Glass': 'Cocktails',
  'Vodka Soda': 'Cocktails',
  'IPA Draft': 'Beer',
  'Pilsner Draft': 'Beer',
  'NA Beer': 'Beer',
  'Draft Cider': 'Beer',
  'Cabernet Glass': 'Wine',
  'Tequila Shot': 'Shots',
  'Jameson Shot': 'Shots',
  'Rumple Shot': 'Shots',
  Soda: 'Non-alcoholic',
  'Iced Tea': 'Non-alcoholic',
  Lemonade: 'Non-alcoholic',
  Nachos: 'Appetizers',
  'Truffle Fries': 'Appetizers',
  'Mozz Sticks': 'Appetizers',
  'Chips & Salsa': 'Appetizers',
  Wings: 'Appetizers',
  'Side Salad': 'Appetizers',
  'Mac & Cheese': 'Appetizers',
  'Cheese Quesadilla': 'Appetizers',
  'Fish Tacos': 'Entrees',
  'Smash Burger': 'Entrees',
  'Chicken Sandwich': 'Entrees',
  'Steak Frites': 'Entrees',
  'BBQ Ribs': 'Entrees',
  'Salmon Plate': 'Entrees',
  'Veggie Bowl': 'Entrees',
  'Chicken Alfredo': 'Entrees',
};

const DRINK_ITEMS = new Set([
  'House Margarita', 'Old Fashioned', 'Espresso Martini', 'Sangria Glass', 'Vodka Soda',
  'IPA Draft', 'Pilsner Draft', 'NA Beer', 'Draft Cider', 'Cabernet Glass',
  'Tequila Shot', 'Jameson Shot', 'Rumple Shot', 'Soda', 'Iced Tea', 'Lemonade',
]);

export function getItemCategory(itemName: string): string {
  return ITEM_CATEGORY_MAP[itemName] ?? 'Other';
}

export function getItemCategoriesMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const [item, cat] of Object.entries(ITEM_CATEGORY_MAP)) {
    map.set(item, cat);
  }
  return map;
}

export type CategoryMarginRow = {
  category: string;
  margin_pct: number;
};

/**
 * Build categories map for margin aggregation.
 * Uses user-defined menuItemCategories when provided and non-empty; otherwise falls back to built-in defaults.
 */
export function getCategoriesMapForMargins(
  menuItemCategories?: Record<string, string> | null
): Map<string, string> {
  if (menuItemCategories && Object.keys(menuItemCategories).length > 0) {
    return new Map(Object.entries(menuItemCategories));
  }
  return getItemCategoriesMap();
}

export function getCategoryMargins(
  rows: ItemMarginRow[],
  menuItemCategories?: Record<string, string> | null
): CategoryMarginRow[] {
  const byCat = categoryMargins(rows, getCategoriesMapForMargins(menuItemCategories));
  return byCat
    .map((r) => ({ category: r.category, margin_pct: Math.round(r.margin_pct) }))
    .sort((a, b) => b.margin_pct - a.margin_pct);
}

/** Infer primary issue label for a profit leak item. */
export function getPrimaryIssue(item: ProfitLeakItem): string {
  if (DRINK_ITEMS.has(item.item_name)) {
    return 'Liquor cost too high';
  }
  if (item.current_margin_pct < 50) {
    return 'Ingredient cost spike';
  }
  return 'Underpriced';
}

export interface QuickWin {
  action: string;
  expectedGain: number;
}

/** Build actionable quick wins from leak report (price raises). */
export function buildQuickWins(
  leakItems: ProfitLeakItem[],
  menuPrices: Record<string, number>
): QuickWin[] {
  const wins: QuickWin[] = [];
  const toFix = leakItems.filter((i) => i.role === 'to_fix').slice(0, 5);
  for (const item of toFix) {
    const currentPrice = menuPrices[item.item_name] ?? (item.units_sold > 0 ? item.revenue / item.units_sold : 0);
    const suggested = item.suggested_price;
    if (suggested > currentPrice && item.estimated_lost_profit_per_month > 0) {
      const newPrice = Math.round(suggested * 2) / 2; // round to nearest 0.50
      wins.push({
        action: `Raise ${item.item_name} price $${currentPrice.toFixed(0)} → $${newPrice.toFixed(0)}`,
        expectedGain: item.estimated_lost_profit_per_month,
      });
    }
  }
  return wins.slice(0, 3);
}
