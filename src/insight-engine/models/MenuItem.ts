/**
 * Menu item with optional price and computed cost.
 * Linked to sales data and recipe.
 */
export interface MenuItem {
  id: string;
  name: string;
  /** Current price (from POS or manual). */
  price?: number;
  /** Computed from recipe + ingredients. */
  cost_per_serving?: number;
  category?: string;
}
