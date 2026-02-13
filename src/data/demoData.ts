/**
 * Demo-only data: recipes (oz per serving) and sample sales.
 * Used for "Try a demo" — no file upload.
 */
import type { SalesRecord } from '@/insight-engine/models/SalesRecord';
import type { Ingredient } from '@/insight-engine/models/Ingredient';
import type { Recipe } from '@/insight-engine/models/Recipe';

import demoSalesRecordsJson from './demoSalesRecords.json';
import {
  ingredientCostPerOzUS,
  ingredientCostPerEachUS,
  INGREDIENTS_PRICED_PER_EACH,
} from './ingredientCostsUS';

// Re-export sales (from CSV converted to JS)
export const demoSalesRecords: SalesRecord[] = demoSalesRecordsJson as SalesRecord[];

/** Demo margin goal (target gross margin), e.g. 0.75 = 75%. */
export const demoMarginGoal = 0.75;

/** Demo menu price per item (USD). US market-relevant casual dining/bar prices. */
export const demoMenuPrices: Record<string, number> = {
  "Fish Tacos": 17,
  "Smash Burger": 16,
  "Chicken Sandwich": 15,
  "Steak Frites": 24,
  "BBQ Ribs": 26,
  "Salmon Plate": 25,
  "Veggie Bowl": 14,
  "Chicken Alfredo": 22,
  "Wings": 11,
  "Nachos": 13,
  "Truffle Fries": 9,
  "Mozz Sticks": 10,
  "Chips & Salsa": 8,
  "IPA Draft": 7,
  "Pilsner Draft": 6.5,
  "NA Beer": 5,
  "Soda": 3.5,
  "Iced Tea": 3.5,
  "Lemonade": 4,
  "House Margarita": 12,
  "Old Fashioned": 14,
  "Espresso Martini": 15,
  "Cabernet Glass": 11,
  "Tequila Shot": 7,
  "Jameson Shot": 8,
  "Rumple Shot": 7,
};

// Qty: oz for weight/volume; count (each) for bun and tortillas. 1 sale deducts these from inventory.
export const recipes: Record<string, { name: string; qty: number }[]> = {
  "Fish Tacos": [
    { name: "white fish (raw)", qty: 6.0 },
    { name: "tortillas", qty: 2 },   // 2 tortillas per order
    { name: "taco slaw", qty: 3.0 },
    { name: "chipotle crema", qty: 2.0 },
    { name: "pico de gallo", qty: 2.0 },
    { name: "cilantro", qty: 0.1 },
  ],
  "Smash Burger": [
    { name: "bun", qty: 1 },   // 1 bun per burger
    { name: "ground beef (raw)", qty: 6.0 },
    { name: "american cheese", qty: 1.5 },
    { name: "burger sauce", qty: 1.5 },
    { name: "pickles", qty: 1.0 },
    { name: "onion", qty: 0.75 },
    { name: "lettuce", qty: 0.5 },
    { name: "tomato", qty: 1.5 },
  ],
  "Chicken Sandwich": [
    { name: "bun", qty: 1 },   // 1 bun per sandwich
    { name: "chicken breast (raw)", qty: 7.0 },
    { name: "breading", qty: 2.0 },
    { name: "mayo/aioli", qty: 1.0 },
    { name: "lettuce", qty: 0.75 },
    { name: "tomato", qty: 2.0 },
    { name: "pickles", qty: 1.0 },
  ],
  "Steak Frites": [
    { name: "steak (raw)", qty: 10.0 },
    { name: "fries (frozen)", qty: 10.0 },
    { name: "compound butter", qty: 1.0 },
    { name: "aioli", qty: 2.0 },
  ],
  "BBQ Ribs": [
    { name: "pork ribs (raw)", qty: 24.0 },
    { name: "dry rub", qty: 0.5 },
    { name: "BBQ sauce", qty: 4.0 },
    { name: "pickles", qty: 2.0 },
  ],
  "Salmon Plate": [
    { name: "salmon filet (raw)", qty: 8.0 },
    { name: "rice/quinoa (cooked)", qty: 6.0 },
    { name: "seasonal veg", qty: 5.0 },
    { name: "lemon butter sauce", qty: 2.0 },
  ],
  "Veggie Bowl": [
    { name: "rice/quinoa (cooked)", qty: 7.0 },
    { name: "roasted veggies", qty: 6.0 },
    { name: "beans", qty: 3.0 },
    { name: "greens", qty: 1.5 },
    { name: "bowl sauce", qty: 2.0 },
  ],
  "Chicken Alfredo": [
    { name: "pasta (dry)", qty: 4.5 },
    { name: "chicken breast (raw)", qty: 7.0 },
    { name: "alfredo sauce", qty: 6.0 },
    { name: "parmesan", qty: 0.75 },
  ],
  "Wings": [
    { name: "chicken wings (raw)", qty: 20.0 },
    { name: "wing sauce", qty: 4.0 },
    { name: "ranch/blue cheese", qty: 2.0 },
  ],
  "Nachos": [
    { name: "tortilla chips", qty: 6.0 },
    { name: "nacho cheese", qty: 4.0 },
    { name: "shredded cheese", qty: 2.0 },
    { name: "beans", qty: 3.0 },
    { name: "pico de gallo", qty: 2.5 },
    { name: "sour cream", qty: 2.0 },
    { name: "guacamole", qty: 2.0 },
  ],
  "Truffle Fries": [
    { name: "fries (frozen)", qty: 10.0 },
    { name: "truffle oil", qty: 0.2 },
    { name: "parmesan", qty: 0.75 },
  ],
  "Mozz Sticks": [
    { name: "mozzarella sticks", qty: 12.0 },
    { name: "marinara", qty: 3.0 },
  ],
  "Chips & Salsa": [
    { name: "tortilla chips", qty: 5.0 },
    { name: "salsa", qty: 4.0 },
  ],
  "IPA Draft": [{ name: "IPA beer", qty: 16.0 }],
  "Pilsner Draft": [{ name: "pilsner beer", qty: 16.0 }],
  "NA Beer": [{ name: "NA beer", qty: 12.0 }],
  "Soda": [{ name: "soda syrup + CO2 equiv", qty: 12.0 }],
  "Iced Tea": [{ name: "iced tea", qty: 12.0 }],
  "Lemonade": [{ name: "lemonade", qty: 12.0 }],
  "House Margarita": [
    { name: "tequila", qty: 2.0 },
    { name: "triple sec", qty: 1.0 },
    { name: "lime juice", qty: 1.5 },
    { name: "simple syrup", qty: 0.5 },
  ],
  "Old Fashioned": [
    { name: "bourbon/rye", qty: 2.0 },
    { name: "simple syrup", qty: 0.25 },
    { name: "bitters", qty: 0.1 },
  ],
  "Espresso Martini": [
    { name: "vodka", qty: 2.0 },
    { name: "coffee liqueur", qty: 1.0 },
    { name: "espresso", qty: 1.5 },
    { name: "simple syrup", qty: 0.25 },
  ],
  "Cabernet Glass": [{ name: "cabernet", qty: 5.0 }],
  "Tequila Shot": [{ name: "tequila", qty: 1.5 }],
  "Jameson Shot": [{ name: "irish whiskey", qty: 1.5 }],
  "Rumple Shot": [{ name: "peppermint schnapps", qty: 1.5 }],
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

/** Build app Ingredient[] and Recipe[] from demo recipes (for dashboard). */
export const buildDemoIngredientsAndRecipes = (): {
  ingredients: Ingredient[];
  recipes: Recipe[];
} => {
  const nameToId = new Map<string, string>();
  const ingredients: Ingredient[] = [];
  for (const lines of Object.values(recipes)) {
    for (const { name } of lines) {
      if (nameToId.has(name)) continue;
      const id = slug(name) || `ing-${nameToId.size}`;
      nameToId.set(name, id);
      const perEach = INGREDIENTS_PRICED_PER_EACH.includes(name as typeof INGREDIENTS_PRICED_PER_EACH[number]);
      ingredients.push({
        id,
        name,
        unit_type: perEach ? "each" : "oz",
        cost_per_unit: perEach
          ? (ingredientCostPerEachUS[name] ?? 0)
          : (ingredientCostPerOzUS[name] ?? 0),
      });
    }
  }
  const recipeList: Recipe[] = Object.entries(recipes).map(([menu_item_name, lines]) => ({
    menu_item_name,
    lines: lines.map(({ name, qty }) => ({
      ingredient_id: nameToId.get(name)!,
      quantity: qty,
    })),
  }));
  return { ingredients, recipes: recipeList };
};
