import type { UnitType } from '../models/Ingredient';

/** Convert quantity to fluid oz for liquor variance. Handles oz, ml, lb, grams. */
export function quantityToOz(value: number, unitType: UnitType): number {
  switch (unitType) {
    case 'oz':
      return value;
    case 'ml':
      return value / 29.5735;
    case 'lb':
      return value * 16;
    case 'grams':
      return value / 28.3495;
    default:
      return value;
  }
}

/**
 * Convert a value from one unit to another.
 * Weight: oz, lb, grams (1 lb = 16 oz, 1 oz ≈ 28.35 g)
 * Volume: ml (no cross-conversion with weight)
 * Count: count, each (1:1)
 */
export function convertUnit(
  value: number,
  fromUnit: UnitType,
  toUnit: UnitType
): number {
  if (fromUnit === toUnit) return value;

  // count/each: no conversion
  if (fromUnit === 'count' || fromUnit === 'each') return value;
  if (toUnit === 'count' || toUnit === 'each') return value;

  // ml: only convert ml <-> ml
  if (fromUnit === 'ml' || toUnit === 'ml') return value;

  // Weight: oz, lb, grams
  const toOz = (v: number, u: UnitType): number => {
    switch (u) {
      case 'oz':
        return v;
      case 'lb':
        return v * 16;
      case 'grams':
        return v / 28.3495;
      default:
        return v;
    }
  };
  const fromOz = (v: number, u: UnitType): number => {
    switch (u) {
      case 'oz':
        return v;
      case 'lb':
        return v / 16;
      case 'grams':
        return v * 28.3495;
      default:
        return v;
    }
  };

  const oz = toOz(value, fromUnit);
  return fromOz(oz, toUnit);
}
