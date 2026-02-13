import type { Ingredient } from '../models/Ingredient';
import type { Recipe, RecipeLine } from '../models/Recipe';

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
