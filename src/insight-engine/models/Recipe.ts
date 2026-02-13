/**
 * One ingredient line in a recipe: quantity of that ingredient per serving.
 */
export interface RecipeLine {
  ingredient_id: string;
  quantity: number;
}

/**
 * Recipe: maps a menu item to its ingredients and quantities.
 * Used to compute true cost per serving.
 */
export interface Recipe {
  menu_item_name: string;
  lines: RecipeLine[];
}
