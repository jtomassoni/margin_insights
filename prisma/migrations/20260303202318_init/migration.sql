-- CreateTable
CREATE TABLE "ingredients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_type" TEXT NOT NULL,
    "cost_per_unit" DOUBLE PRECISION NOT NULL,
    "kind" TEXT DEFAULT 'ingredient',
    "waste_factor" DOUBLE PRECISION,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "menu_item_name" TEXT NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_lines" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "ingredient_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "display_unit" TEXT,

    CONSTRAINT "recipe_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_prices" (
    "menu_item_name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "menu_prices_pkey" PRIMARY KEY ("menu_item_name")
);

-- CreateTable
CREATE TABLE "menu_margin_goals" (
    "menu_item_name" TEXT NOT NULL,
    "goal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "menu_margin_goals_pkey" PRIMARY KEY ("menu_item_name")
);

-- CreateTable
CREATE TABLE "sales_records" (
    "id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "units_sold" INTEGER NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "recipes_menu_item_name_key" ON "recipes"("menu_item_name");

-- CreateIndex
CREATE UNIQUE INDEX "recipe_lines_recipe_id_ingredient_id_key" ON "recipe_lines"("recipe_id", "ingredient_id");

-- AddForeignKey
ALTER TABLE "recipe_lines" ADD CONSTRAINT "recipe_lines_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_lines" ADD CONSTRAINT "recipe_lines_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
