# Margin Insights — Living TODO

> **Golden Rule:** The Overview dashboard answers instantly: (1) What makes me the most money, (2) What is costing me money, (3) What should I change tomorrow.

---

## Non-goals

- No full BI dashboard — keep it minimal
- No heavy charts above the fold
- Minimal UI — compact cards, 10-second scan

---

## Milestones

### Step 0 — Living TODO doc
- [x] Create docs/living-todo.md
- [x] Goal, non-goals, milestones, data/UI requirements

### Step 1 — Overview dashboard (above the fold)
- [x] A) Profit Snapshot — revenue, cost, gross profit, avg margin %, opportunity
- [x] B) What Makes You Money — top 3 by total profit
- [x] C) What Is Costing You Money — top 3 profit leaks
- [x] D) What To Change Tomorrow — quick wins (max 3)
- [x] E) Category Performance — 4–6 categories, margin % with color signals
- [x] All visible above the fold on laptop + mobile
- [x] "View details →" links on each card

### Step 2 — Price suggestions improvements
- [x] Replace top callout with "Profit opportunity detected" card ($/month + $/year)
- [x] Add column: Projected monthly gain per item
- [x] Replace "Selling at significant loss" with concrete $ statement

### Step 3 — Liquor Variance (V1: manual input)
- [x] Prisma model: liquor_variance_entries
- [x] API: GET/POST liquor variance entries
- [x] New page/tab: Liquor variance under Margin & profit
- [x] UI: date range, item name, bought, sold, variance computation
- [x] Badge for big variances: "Potential overpour/comps/shrink"

### Step 4 — Notes for future (doc only)
- [x] Add Next Features notes to living-todo.md

---

## Data / computation requirements

- **Overview:** Uses `marginRowsWithPrices`, `leakReport`, `menuPrices` from DashboardDataContext
- **Profit snapshot:** revenue, totalCost, grossProfit, avgMargin, opportunityTotal
- **Top drivers:** sorted by `contribution_margin`, top 3
- **Top leaks:** `leakReport.items` where `role === 'to_fix'`, top 3
- **Quick wins:** `buildQuickWins(leakReport.items, menuPrices)`, max 3
- **Category margins:** `getCategoryMargins(marginRowsWithPrices)`, 4–6 categories

---

## UI requirements

- **Mobile-first:** Touch targets min 44px, single column on mobile
- **10-second scan:** Owner can answer the 3 questions in one glance
- **Color signals:** Green > 70%, Yellow 55–70%, Red < 55%
- **Opportunity numbers:** Must stand out (bold, accent color)
- **Compact cards:** Minimal tables, no clutter

---

## Next features backlog

1. **Portion cost drift detection** — Requires `ingredient_cost_history` snapshots to track cost changes over time
2. **Theoretical vs actual cost variance** — Fryer oil allocation, waste tracking; compare recipe cost to actual usage
3. **Supplier invoice ingestion** — Sysco/US Foods integration to auto-update ingredient costs (10x value)
4. **Liquor variance v1.1** — Beginning/ending on-hand bottles (model ready)
