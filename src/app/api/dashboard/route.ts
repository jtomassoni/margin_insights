import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Ingredient } from '@/insight-engine/models/Ingredient';
import type { Recipe } from '@/insight-engine/models/Recipe';
import type { SalesRecord } from '@/insight-engine/models/SalesRecord';

export const dynamic = 'force-dynamic';

/** Load full dashboard state from DB */
export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const [ingredients, recipesWithLines, menuPrices, menuMarginGoals, salesRecords, marginGoalSetting, menuCategoriesSetting, menuItemCategoriesSetting, menuItemIsDrinkSetting, menuItemPourOzSetting, menuItemBottleOzSetting] =
      await Promise.all([
        prisma.ingredient.findMany(),
        prisma.recipe.findMany({ include: { recipeLines: true } }),
        prisma.menuPrice.findMany(),
        prisma.menuMarginGoal.findMany(),
        prisma.salesRecord.findMany(),
        prisma.setting.findUnique({ where: { key: 'marginGoal' } }),
        prisma.setting.findUnique({ where: { key: 'menuCategories' } }),
        prisma.setting.findUnique({ where: { key: 'menuItemCategories' } }),
        prisma.setting.findUnique({ where: { key: 'menuItemIsDrink' } }),
        prisma.setting.findUnique({ where: { key: 'menuItemPourOz' } }),
        prisma.setting.findUnique({ where: { key: 'menuItemBottleOz' } }),
      ]);

    const ingredientsMap: Ingredient[] = ingredients.map((i) => ({
      id: i.id,
      name: i.name,
      unit_type: i.unitType as Ingredient['unit_type'],
      cost_per_unit: i.costPerUnit,
      kind: (i.kind as Ingredient['kind']) ?? 'ingredient',
      waste_factor: i.wasteFactor ?? undefined,
      bottle_oz: i.bottleOz ?? undefined,
    }));

    const recipesMap: Recipe[] = recipesWithLines.map((r) => ({
      menu_item_name: r.menuItemName,
      lines: r.recipeLines.map((l) => ({
        ingredient_id: l.ingredientId,
        quantity: l.quantity,
        display_unit: l.displayUnit as Ingredient['unit_type'] | undefined,
      })),
    }));

    const menuPricesObj: Record<string, number> = {};
    for (const p of menuPrices) menuPricesObj[p.menuItemName] = p.price;

    const menuMarginGoalObj: Record<string, number> = {};
    for (const m of menuMarginGoals) menuMarginGoalObj[m.menuItemName] = m.goal;

    const salesRecordsMap: SalesRecord[] = salesRecords.map((s) => ({
      item_name: s.itemName,
      units_sold: s.unitsSold,
      revenue: s.revenue,
      timestamp: s.timestamp?.toISOString(),
    }));

    const marginGoal = marginGoalSetting ? parseFloat(marginGoalSetting.value) : 0.75;

    const menuCategories: string[] = menuCategoriesSetting?.value
      ? (JSON.parse(menuCategoriesSetting.value) as string[])
      : [];
    const menuItemCategories: Record<string, string> = menuItemCategoriesSetting?.value
      ? (JSON.parse(menuItemCategoriesSetting.value) as Record<string, string>)
      : {};

    const menuItemIsDrink: Record<string, boolean> = menuItemIsDrinkSetting?.value
      ? (JSON.parse(menuItemIsDrinkSetting.value) as Record<string, boolean>)
      : {};

    const menuItemPourOz: Record<string, number> = menuItemPourOzSetting?.value
      ? (JSON.parse(menuItemPourOzSetting.value) as Record<string, number>)
      : {};

    const menuItemBottleOz: Record<string, number> = menuItemBottleOzSetting?.value
      ? (JSON.parse(menuItemBottleOzSetting.value) as Record<string, number>)
      : {};

    return NextResponse.json({
      ingredients: ingredientsMap,
      recipes: recipesMap,
      menuPrices: menuPricesObj,
      menuMarginGoal: menuMarginGoalObj,
      salesRecords: salesRecordsMap,
      marginGoal,
      menuCategories,
      menuItemCategories,
      menuItemIsDrink,
      menuItemPourOz,
      menuItemBottleOz,
    });
  } catch (err) {
    console.error('Dashboard GET error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load dashboard' },
      { status: 500 }
    );
  }
}

/** Save full dashboard state to DB */
export async function PUT(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const {
      ingredients = [],
      recipes = [],
      menuPrices = {},
      menuMarginGoal = {},
      salesRecords = [],
      marginGoal = 0.75,
      menuCategories = [],
      menuItemCategories = {},
      menuItemIsDrink = {},
      menuItemPourOz = {},
      menuItemBottleOz = {},
    } = body;

    await prisma.$transaction(async (tx) => {
      await tx.recipeLine.deleteMany({});
      await tx.recipe.deleteMany({});
      await tx.ingredient.deleteMany({});
      await tx.menuPrice.deleteMany({});
      await tx.menuMarginGoal.deleteMany({});
      await tx.salesRecord.deleteMany({});

      if (ingredients.length > 0) {
        await tx.ingredient.createMany({
          data: ingredients.map((i: Ingredient) => ({
            id: i.id,
            name: i.name,
            unitType: i.unit_type,
            costPerUnit: i.cost_per_unit,
            kind: i.kind ?? 'ingredient',
            wasteFactor: i.waste_factor ?? null,
            bottleOz: i.bottle_oz ?? null,
          })),
        });
      }

      const ingredientIds = new Set(ingredients.map((i: Ingredient) => i.id));

      for (const r of recipes) {
        const recipe = await tx.recipe.create({
          data: { menuItemName: r.menu_item_name },
        });
        const validLines = (r.lines || []).filter((l: { ingredient_id: string }) =>
          ingredientIds.has(l.ingredient_id)
        );
        if (validLines.length > 0) {
          await tx.recipeLine.createMany({
            data: validLines.map((l: { ingredient_id: string; quantity: number; display_unit?: string }) => ({
              recipeId: recipe.id,
              ingredientId: l.ingredient_id,
              quantity: l.quantity,
              displayUnit: l.display_unit ?? null,
            })),
          });
        }
      }

      const menuPriceEntries = Object.entries(menuPrices).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number'
      );
      if (menuPriceEntries.length > 0) {
        await tx.menuPrice.createMany({
          data: menuPriceEntries.map(([menuItemName, price]) => ({ menuItemName, price })),
        });
      }

      const menuMarginGoalEntries = Object.entries(menuMarginGoal).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number'
      );
      if (menuMarginGoalEntries.length > 0) {
        await tx.menuMarginGoal.createMany({
          data: menuMarginGoalEntries.map(([menuItemName, goal]) => ({ menuItemName, goal })),
        });
      }

      if (salesRecords.length > 0) {
        await tx.salesRecord.createMany({
          data: salesRecords.map((s: SalesRecord) => {
            const base = {
              itemName: s.item_name,
              unitsSold: s.units_sold,
              revenue: s.revenue,
            };
            if (s.timestamp) {
              const ts = new Date(s.timestamp);
              if (!isNaN(ts.getTime())) {
                return { ...base, timestamp: ts };
              }
            }
            return base;
          }),
        });
      }

      await tx.setting.upsert({
        where: { key: 'marginGoal' },
        create: { key: 'marginGoal', value: String(marginGoal) },
        update: { value: String(marginGoal) },
      });

      const validMenuCategories = Array.isArray(menuCategories)
        ? menuCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        : [];
      await tx.setting.upsert({
        where: { key: 'menuCategories' },
        create: { key: 'menuCategories', value: JSON.stringify(validMenuCategories) },
        update: { value: JSON.stringify(validMenuCategories) },
      });

      const validMenuItemCategories =
        menuItemCategories && typeof menuItemCategories === 'object'
          ? Object.fromEntries(
              Object.entries(menuItemCategories).filter(
                (entry): entry is [string, string] =>
                  typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[1].trim().length > 0
              )
            )
          : {};
      await tx.setting.upsert({
        where: { key: 'menuItemCategories' },
        create: { key: 'menuItemCategories', value: JSON.stringify(validMenuItemCategories) },
        update: { value: JSON.stringify(validMenuItemCategories) },
      });

      const validMenuItemIsDrink =
        menuItemIsDrink && typeof menuItemIsDrink === 'object'
          ? Object.fromEntries(
              Object.entries(menuItemIsDrink).filter(
                (entry): entry is [string, boolean] =>
                  typeof entry[0] === 'string' && typeof entry[1] === 'boolean'
              )
            )
          : {};
      await tx.setting.upsert({
        where: { key: 'menuItemIsDrink' },
        create: { key: 'menuItemIsDrink', value: JSON.stringify(validMenuItemIsDrink) },
        update: { value: JSON.stringify(validMenuItemIsDrink) },
      });

      const validMenuItemPourOz =
        menuItemPourOz && typeof menuItemPourOz === 'object'
          ? Object.fromEntries(
              Object.entries(menuItemPourOz).filter(
                (entry): entry is [string, number] =>
                  typeof entry[0] === 'string' && typeof entry[1] === 'number' && entry[1] > 0
              )
            )
          : {};
      await tx.setting.upsert({
        where: { key: 'menuItemPourOz' },
        create: { key: 'menuItemPourOz', value: JSON.stringify(validMenuItemPourOz) },
        update: { value: JSON.stringify(validMenuItemPourOz) },
      });

      const validMenuItemBottleOz =
        menuItemBottleOz && typeof menuItemBottleOz === 'object'
          ? Object.fromEntries(
              Object.entries(menuItemBottleOz).filter(
                (entry): entry is [string, number] =>
                  typeof entry[0] === 'string' && typeof entry[1] === 'number' && entry[1] > 0
              )
            )
          : {};
      await tx.setting.upsert({
        where: { key: 'menuItemBottleOz' },
        create: { key: 'menuItemBottleOz', value: JSON.stringify(validMenuItemBottleOz) },
        update: { value: JSON.stringify(validMenuItemBottleOz) },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Dashboard PUT error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save dashboard' },
      { status: 500 }
    );
  }
}
