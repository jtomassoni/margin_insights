export type UnitType = 'oz' | 'ml' | 'grams' | 'count' | 'lb' | 'each';

export type IngredientKind = 'ingredient' | 'maintenance' | 'liquor';

export interface Ingredient {
  id: string;
  name: string;
  unit_type: UnitType;
  cost_per_unit: number;
  /** Optional waste factor (0–1) for future use */
  waste_factor?: number;
  /**
   * Kind of cost component.
   * - 'ingredient' = food/beverage input (default)
   * - 'maintenance' = overhead like dishwasher cycles, CO₂, waste buffer, etc.
   * - 'liquor' = spirit/liquor for variance tracking (uses bottle_oz)
   */
  kind?: IngredientKind;
  /** Oz per bottle (e.g. 25.4 for 750ml). Used for liquor variance when kind='liquor'. */
  bottle_oz?: number;
}

