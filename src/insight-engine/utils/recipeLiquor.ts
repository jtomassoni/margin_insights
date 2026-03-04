/**
 * Derive liquor pour (oz/drink) and bottle size from recipe + ingredients.
 * Uses unit cost and quantities as established in Menu & Recipes.
 */
import type { Ingredient } from '../models/Ingredient';
import type { Recipe } from '../models/Recipe';
import { quantityToOz } from './unitConversion';
import { lineCost } from '../services/costCalculator';

const DEFAULT_BOTTLE_OZ = 25.4; // 750ml

export interface RecipeLiquorData {
  /** Oz of liquor per drink (from recipe quantities) */
  ozPerDrink: number;
  /** Oz per bottle (from liquor ingredient or default) */
  bottleOz: number;
  /** Whether derived from recipe (vs fallback) */
  fromRecipe: boolean;
}

/**
 * Get liquor oz per drink and bottle size from a recipe.
 * Sums quantities of ingredients marked kind='liquor', converted to oz.
 * Uses first liquor's bottle_oz, or default 25.4.
 * Falls back to { ozPerDrink: 0, bottleOz: DEFAULT, fromRecipe: false } when no liquor in recipe.
 */
export function getRecipeLiquorData(
  recipe: Recipe | undefined,
  ingredients: Ingredient[]
): RecipeLiquorData {
  if (!recipe?.lines?.length) {
    return { ozPerDrink: 0, bottleOz: DEFAULT_BOTTLE_OZ, fromRecipe: false };
  }

  const byId = new Map(ingredients.map((i) => [i.id, i]));
  let ozPerDrink = 0;
  let bottleOz = DEFAULT_BOTTLE_OZ;

  for (const line of recipe.lines) {
    const ing = byId.get(line.ingredient_id);
    if (!ing || (ing.kind ?? 'ingredient') !== 'liquor') continue;

    ozPerDrink += quantityToOz(line.quantity, ing.unit_type);
    if (ing.bottle_oz != null && ing.bottle_oz > 0) {
      bottleOz = ing.bottle_oz;
    }
  }

  if (ozPerDrink <= 0) {
    // No liquor ingredients — use highest-cost ingredient as primary (common for simple drinks)
    const withCost = recipe.lines
      .map((line) => {
        const ing = byId.get(line.ingredient_id);
        const cost = ing ? lineCost(line, ingredients) : 0;
        return { line, ing, cost };
      })
      .filter((x) => x.ing && x.cost > 0)
      .sort((a, b) => b.cost - a.cost);

    const primary = withCost[0];
    if (primary?.ing) {
      ozPerDrink = quantityToOz(primary.line.quantity, primary.ing.unit_type);
      if (primary.ing.bottle_oz != null && primary.ing.bottle_oz > 0) {
        bottleOz = primary.ing.bottle_oz;
      }
    }
  }

  return {
    ozPerDrink,
    bottleOz,
    fromRecipe: ozPerDrink > 0,
  };
}
