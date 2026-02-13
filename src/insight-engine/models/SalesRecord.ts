/**
 * Canonical sales record from POS (Toast) export.
 * Normalized for margin and profit analysis.
 */
export interface SalesRecord {
  item_name: string;
  units_sold: number;
  revenue: number;
  /** Optional: for time-based analysis later */
  timestamp?: string;
}
