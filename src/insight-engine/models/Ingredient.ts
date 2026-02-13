export type UnitType = 'oz' | 'ml' | 'grams' | 'count' | 'lb' | 'each';

export interface Ingredient {
  id: string;
  name: string;
  unit_type: UnitType;
  cost_per_unit: number;
  /** Optional waste factor (0–1) for future use */
  waste_factor?: number;
}
