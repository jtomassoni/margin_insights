import type { Ingredient } from '../models/Ingredient';
import type { Recipe, RecipeLine } from '../models/Recipe';
import { convertUnit } from '../utils/unitConversion';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Compute true cost per serving for a recipe given ingredient master list.
 */
export const costPerServing = (recipe: Recipe, ingredients: Ingredient[]): number => {
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const total = recipe.lines.reduce((sum, line) => {
    const ing = byId.get(line.ingredient_id);
    return sum + (ing ? ing.cost_per_unit * line.quantity : 0);
  }, 0);
  return round2(total);
};

/**
 * Get cost for a single recipe line (for UI display).
 */
export const lineCost = (line: RecipeLine, ingredients: Ingredient[]): number => {
  const ing = ingredients.find((i) => i.id === line.ingredient_id);
  return ing ? round2(ing.cost_per_unit * line.quantity) : 0;
};

/**
 * Get display quantity and unit for a recipe line.
 * Uses display_unit if set, otherwise ingredient's unit.
 */
export const lineDisplay = (
  line: RecipeLine,
  ingredients: Ingredient[]
): { quantity: number; unit: string } => {
  const ing = ingredients.find((i) => i.id === line.ingredient_id);
  if (!ing) return { quantity: line.quantity, unit: '' };
  const displayUnit = line.display_unit ?? ing.unit_type;
  const quantity =
    displayUnit === ing.unit_type
      ? line.quantity
      : convertUnit(line.quantity, ing.unit_type, displayUnit);
  return { quantity: round2(quantity), unit: displayUnit };
};
