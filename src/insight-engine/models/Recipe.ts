import type { UnitType } from './Ingredient';

/**
 * One ingredient line in a recipe: quantity of that ingredient per serving.
 * quantity is always in the ingredient's pricing unit (for cost calculation).
 * display_unit: optional unit for display (e.g. oz when ingredient is priced per lb).
 */
export interface RecipeLine {
  ingredient_id: string;
  quantity: number;
  display_unit?: UnitType;
}

/**
 * Recipe: maps a menu item to its ingredients and quantities.
 * Used to compute true cost per serving.
 */
export interface Recipe {
  menu_item_name: string;
  lines: RecipeLine[];
}
