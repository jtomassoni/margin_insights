## Margin Insights – Manual Mode Product Spec

This doc defines a **“manual mode”** version of Margin Insights that can exist as a fully usable product *before* POS integrations and automated ingestion are built.

The intent is:
- **Free tier / demo:** manual data entry (or simple copy/paste) for menu, costs, recipes, and a basic sales snapshot.
- **Paid tier:** same analysis engine, but fed by **uploaded sales reports**, and later by **automatic POS APIs**.

This spec is grounded in the current implementation – it does not introduce new math, only reshapes inputs and flows around what already exists.

---

### 1. Core promise

> **“Type in your menu, costs, and a simple sales snapshot, and we’ll tell you which items are underpriced, how much profit you’re leaking, and what prices would fix it.”**

Everything else (charts, quadrants, radar) supports this promise.

---

### 2. Data model (reusing existing engine types)

Manual mode should feed the existing engine types directly:

- **SalesRecord**
  - `item_name: string`
  - `units_sold: number`
  - `revenue: number`
  - (Optional) `timestamp?: string` – can be omitted in manual mode; treated as a single period.

- **Ingredient**
  - `id: string`
  - `name: string`
  - `unit_type: 'oz' | 'ml' | 'grams' | 'count' | 'lb' | 'each'`
  - `cost_per_unit: number`

- **Recipe / RecipeLine**
  - `menu_item_name: string` (must match `item_name` in `SalesRecord`).
  - `lines: { ingredient_id: string; quantity: number }[]` (per‑serving quantity).

- **Config**
  - `defaultTargetMargin: number` (decimal, e.g. `0.75`).
  - `perItemTargetMargin: Record<string, number>` (decimal).
  - `menuPrices: Record<string, number>` (overrides POS implied price when set).

The existing services:
- `costPerServing`
- `computeMargins`
- `buildProfitLeakReport`
- `suggestPrice`
- `runQuadrantAnalysis`

remain unchanged; they simply receive **user‑entered** data instead of hard‑coded demo data.

---

### 3. Manual mode user flow (free tier)

#### 3.1. Setup flow (sidebar)

Replace the current “demo variant + scenario” picker with a simpler, linear setup:

1. **Name this menu**
   - Small text input (e.g. “Main bar menu”, “Weekend brunch”).
   - Used only as a label on the dashboard.

2. **Define target margin**
   - Default to `75%`.
   - Copy clarifies this is a **gross margin goal** across food or drinks.

3. **Enter menu items + basic sales snapshot**
   - Minimal requirements to run the engine:
     - **Item name**
     - **Typical price** (per unit)
     - **Units sold in a typical period** (week or month – user chooses label once).
   - From this, the app can compute:
     - `revenue = units_sold × price`.
     - `SalesRecord[]` without needing file uploads.

4. **(Optional but recommended) Add ingredients & recipes**
   - Same ingredient + recipe builder UI you already have.
   - If no recipe is entered for an item, its **cost per serving defaults to 0**, and the UI makes that obvious (“No recipe yet – cost assumed zero”).

5. **Click “Run my margin report”**
   - Triggers the same dashboard view you have today:
     - Profit leak report (default tab).
     - Margins.
     - Price suggestions.
     - Quadrant.

#### 3.2. Ongoing edits

Once the initial setup is done:

- Users can **stay on one page** and iterate:
  - Change prices directly in the recipe builder or margins table.
  - Adjust target margin (global or per item).
  - Refine ingredient costs and recipes.
- Every change immediately recomputes:
  - Cost per serving, margin %, leak report, suggested prices, charts.

Manual mode is effectively a **live spreadsheet with a strong opinionated skin**, but the mental model is “configure once, then tweak and see impact”.

---

### 4. Manual input surfaces (what the user actually types)

#### 4.1. Menu + sales snapshot

**Table: Menu items**

Required columns:
- **Name** (`item_name`)
- **Typical price** (per unit)
- **Units sold in a typical period**

Derived:
- `revenue = price × units_sold` → becomes `SalesRecord.revenue`.

UI expectations:
- Simple, scrollable grid.
- No need for time stamps in manual mode; we treat this as “a representative period”.
- Later, when uploads exist, this table can be **read‑only for uploaded data** but stay editable for scratch mode.

#### 4.2. Ingredients

**Table: Ingredients** (very close to current UI)

- Columns:
  - Name
  - Unit (`oz / ml / grams / count / lb / each`)
  - Cost per unit (USD)
  - Remove
- Optional:
  - A short helper: “You only need the ingredients that affect cost for items in this menu – not your entire pantry.”

Inputs here directly populate `Ingredient[]`.

#### 4.3. Recipes

**Recipe builder** (reused)

- For each menu item:
  - Show:
    - `Cost/serving: $X.XX` (from `costPerServing`).
    - **Price** input (overriding the menu table’s price if changed here).
    - **Target margin %** override (per item).
    - Current margin badge (`Margin X%`, ✓ or warn).
  - Allow:
    - Adding ingredients (choose from ingredient list, prompt for quantity).
    - Removing ingredients.

Inputs here populate `Recipe[]`, `menuPrices`, and `perItemTargetMargin`.

#### 4.4. Target margin configuration

**Global default**
- One numeric input (percent) with copy:
  - “Used for all items unless you set a per‑item target below.”

**Per‑item override**
- Existing **“Target %”** field in the recipe builder.
- Stored as decimal in `perItemTargetMargin`.

---

### 5. Outputs reused from the current dashboard

Manual mode does **not** change the output layer; it only changes how inputs are created.

We keep:

- **Profit leak report**
  - Estimated lost profit per item.
  - Total estimated lost per period.
  - “To fix” vs “possible loss leaders”.
  - Top leaks by lost $ and bar chart.

- **Margins tab**
  - Per‑item margins, cost per serving, profit.
  - Contribution bar chart, revenue donut, radar.

- **Price suggestions tab**
  - Suggested price, change %, caution and cap flags.
  - Total potential gain if all suggestions applied.

- **Quadrant tab**
  - Volume vs margin scatter, with quadrant labels and explanations.

The semantic meaning for a user becomes:
- “Given the menu, prices, and volumes I typed in (even if approximate), this is what my menu economics look like.”

---

### 6. Upgrade path: from manual mode to uploads and APIs

The product stages are:

1. **Manual mode (free) – this spec**
   - All data is typed in or pasted by the user.
   - Data may be stored per session or behind a simple login.

2. **Upload mode (paid) – next**
   - Users can upload CSV exports from POS, which are mapped to `SalesRecord[]`.
   - Manual tables still exist:
     - For reviewing / correcting parsed sales data.
     - For ingredients and recipes (no change).
   - The engine and dashboard stay the same; only `SalesRecord[]` becomes imported instead of hand‑typed.

3. **API mode (paid, later)**
   - Scheduled jobs pull fresh `SalesRecord[]` from POS APIs.
   - The exact same functions (`computeMargins`, `buildProfitLeakReport`, etc.) run on rolling windows (e.g. last 30 days).
   - Additional layers (alerts, history) can be added on top, but they are **not required** to keep the core leak/pricing logic working.

The key design constraint:
- **Do not fork the engine.** Manual, upload, and API modes must all use the same core types and services so the product’s behavior stays consistent as the data source gets more automated.

---

### 7. Non‑goals for manual mode

For clarity, manual mode intentionally does **not** do:

- Direct POS connections.
- Time‑series analysis (no date dimensions in the UI).
- Inventory management or purchase ordering.
- Staff, labor, or tax modeling.

It is explicitly a **“snapshot economic modeler”** for your menu, built on the same leak and pricing logic that later modes will use on live data.

