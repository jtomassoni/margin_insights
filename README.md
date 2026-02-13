# Margin Insights — POS Profit Intelligence Engine

Help independent bars and restaurants uncover hidden profit leaks using POS data and ingredient-level cost modeling.

## What it does (V1)

- **Toast CSV ingestion** — Upload export; we normalize item name, units sold, revenue.
- **Ingredient-level recipe builder** — Map menu items to ingredients and quantities; compute true cost per serving.
- **Margin & contribution analysis** — Gross margin %, contribution margin, sortable dashboard.
- **Profit leak detection** — Quadrant analysis (HV/HM, HV/LM, LV/HM, LV/LM); bottom 20% margin items with estimated lost profit if raised to target margin.
- **Price suggestions** — Suggested price = cost / (1 - target_margin); 75% default; safety cap +12%; caution flag if increase >15%.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the **Upload your POS export** CTA to go to the dashboard.

## Sample data

Use `public/sample-toast-export.csv` to test. It is **one week** (Mon–Sun) of line-level sales in **Toast Item Selection Details** style, matching what Toast exports from Sales/Finance → Item Selection Details (or similar sales report CSV on lower tiers).

Supported column names (any of these, normalized):

- **Item name**: "Menu Item", "Item Name", "Item", "Name"
- **Quantity**: "Qty", "Quantity", "Units Sold"
- **Revenue**: "Net Amount", "Net Item Amount", "Revenue", "Sales"; or use **Net Price** + **Qty** (revenue = Qty × Net Price)
- **Date** (optional): "Order Date", "Business Date", "Sent Date", "Timestamp"

## Project structure

```
src/
  app/                    # Next.js App Router
    page.tsx              # Landing
    dashboard/page.tsx    # Upload, recipes, margins, leak report, pricing
  insight-engine/
    adapters/
      toastCsvAdapter.ts  # Parse Toast CSV → SalesRecord[]
    models/
      SalesRecord.ts, Ingredient.ts, Recipe.ts, MenuItem.ts
    services/
      costCalculator.ts   # Cost per serving from recipe + ingredients
      marginEngine.ts    # Margins, contribution, category aggregates
      pricingEngine.ts   # Suggested price, safety band, caution flag
      quadrantAnalysis.ts
    reports/
      profitLeakReport.ts
```

## Out of scope (V1)

- Labor analytics, multi-tenant auth, API integrations, benchmarking, billing automation.

## Data & privacy

- Minimal PII; no employee names; data siloed per instance. No cross-client aggregation.
