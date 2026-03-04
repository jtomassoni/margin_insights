import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-config';
import {
  buildDemoIngredientsAndRecipes,
  demoMenuPrices,
  demoSalesRecords,
  demoMarginGoal,
} from '@/data/demoData';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return null;
}

/**
 * Load demo data into the database and enable demo mode.
 * Wipes existing operational data first, then loads sample ingredients, recipes, prices, and sales.
 */
export async function POST() {
  const err = await requireAdmin();
  if (err) return err;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: 'DATABASE_URL not configured' },
      { status: 503 }
    );
  }

  try {
    const { ingredients, recipes } = buildDemoIngredientsAndRecipes();

    await prisma.$transaction(async (tx) => {
      await tx.costSnapshotLine.deleteMany({});
      await tx.costSnapshot.deleteMany({});
      await tx.recipeLine.deleteMany({});
      await tx.recipe.deleteMany({});
      await tx.ingredient.deleteMany({});
      await tx.menuPrice.deleteMany({});
      await tx.menuMarginGoal.deleteMany({});
      await tx.salesRecord.deleteMany({});

      if (ingredients.length > 0) {
        await tx.ingredient.createMany({
          data: ingredients.map((i) => ({
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

      const ingredientIds = new Set(ingredients.map((i) => i.id));

      for (const r of recipes) {
        const recipe = await tx.recipe.create({
          data: { menuItemName: r.menu_item_name },
        });
        const validLines = (r.lines || []).filter((l) =>
          ingredientIds.has(l.ingredient_id)
        );
        if (validLines.length > 0) {
          await tx.recipeLine.createMany({
            data: validLines.map((l) => ({
              recipeId: recipe.id,
              ingredientId: l.ingredient_id,
              quantity: l.quantity,
              displayUnit: l.display_unit ?? null,
            })),
          });
        }
      }

      const menuPriceEntries = Object.entries(demoMenuPrices).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number'
      );
      if (menuPriceEntries.length > 0) {
        await tx.menuPrice.createMany({
          data: menuPriceEntries.map(([menuItemName, price]) => ({
            menuItemName,
            price,
          })),
        });
      }

      if (demoSalesRecords.length > 0) {
        await tx.salesRecord.createMany({
          data: demoSalesRecords.map((s) => {
            const ts = s.timestamp ? new Date(s.timestamp) : null;
            return {
              itemName: s.item_name,
              unitsSold: s.units_sold,
              revenue: s.revenue,
              ...(ts && !isNaN(ts.getTime()) ? { timestamp: ts } : {}),
            };
          }),
        });
      }

      await tx.setting.upsert({
        where: { key: 'marginGoal' },
        create: { key: 'marginGoal', value: String(demoMarginGoal) },
        update: { value: String(demoMarginGoal) },
      });

      await tx.setting.upsert({
        where: { key: 'demoMode' },
        create: { key: 'demoMode', value: 'true' },
        update: { value: 'true' },
      });
    });

    return NextResponse.json({ ok: true, demoMode: true });
  } catch (e) {
    console.error('Admin load-demo-data POST:', e);
    return NextResponse.json(
      { error: 'Failed to load demo data' },
      { status: 500 }
    );
  }
}
