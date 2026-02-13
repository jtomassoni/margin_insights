/**
 * US market-relevant cost for demo ingredients.
 * Most items: cost per oz. Buns and tortillas: cost per each (sold by unit).
 * Approximate foodservice/restaurant costs; used for demo fixture only.
 */
export const INGREDIENTS_PRICED_PER_EACH = ["bun", "tortillas"] as const;

/** Cost per single unit (each) — buns and tortillas. */
export const ingredientCostPerEachUS: Record<string, number> = {
  bun: 0.28,       // ~$0.25–0.35 per bun foodservice
  tortillas: 0.06, // ~$0.05–0.08 per tortilla
};

/** Cost per ounce (oz) for all other ingredients. */
export const ingredientCostPerOzUS: Record<string, number> = {
  // Proteins (raw)
  "white fish (raw)": 0.32,
  "ground beef (raw)": 0.42,
  "chicken breast (raw)": 0.32,
  "steak (raw)": 1.05,
  "pork ribs (raw)": 0.38,
  "salmon filet (raw)": 0.85,
  "chicken wings (raw)": 0.28,

  // Chips, pasta (oz)
  "tortilla chips": 0.055,
  "pasta (dry)": 0.04,

  // Cheese & dairy
  "american cheese": 0.14,
  "parmesan": 0.28,
  "shredded cheese": 0.12,
  "nacho cheese": 0.08,
  "mozzarella sticks": 0.16,
  "sour cream": 0.055,
  "compound butter": 0.12,

  // Sauces & condiments
  "burger sauce": 0.06,
  "mayo/aioli": 0.055,
  "aioli": 0.07,
  "chipotle crema": 0.08,
  "pico de gallo": 0.065,
  "BBQ sauce": 0.055,
  "lemon butter sauce": 0.10,
  "bowl sauce": 0.065,
  "alfredo sauce": 0.085,
  "wing sauce": 0.055,
  "ranch/blue cheese": 0.055,
  "marinara": 0.045,
  "salsa": 0.045,
  "guacamole": 0.12,
  "dry rub": 0.18,

  // Produce & prep
  "pickles": 0.04,
  "onion": 0.032,
  "lettuce": 0.075,
  "tomato": 0.062,
  "cilantro": 0.22,
  "taco slaw": 0.045,
  "greens": 0.095,
  "seasonal veg": 0.062,
  "roasted veggies": 0.055,
  "beans": 0.025,
  "rice/quinoa (cooked)": 0.032,
  "breading": 0.03,

  // Frozen & specialty
  "fries (frozen)": 0.032,
  "truffle oil": 0.75,

  // Beverages — beer & non-alc (per oz)
  "IPA beer": 0.10,
  "pilsner beer": 0.085,
  "NA beer": 0.055,
  "soda syrup + CO2 equiv": 0.012,
  "iced tea": 0.012,
  "lemonade": 0.022,

  // Spirits & wine (per oz)
  "tequila": 0.28,
  "triple sec": 0.09,
  "lime juice": 0.032,
  "simple syrup": 0.02,
  "bourbon/rye": 0.32,
  "bitters": 0.45,
  "vodka": 0.22,
  "coffee liqueur": 0.16,
  "espresso": 0.085,
  "cabernet": 0.28,
  "irish whiskey": 0.36,
  "peppermint schnapps": 0.14,
};
