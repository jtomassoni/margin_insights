# POS Profit Intelligence Engine
## Founder Roadmap & Living TODO

---

# 🎯 Core Mission (V1)

Help independent bars and restaurants uncover hidden profit leaks using POS data and ingredient-level cost modeling.

V1 Focus:
- Toast CSV ingestion
- Ingredient-level recipe builder
- Margin & contribution analysis
- Price increase suggestions
- Profit leak detection

NOT in scope:
- Labor analytics
- Multi-tenant architecture
- API integrations
- Industry benchmarking
- Billing automation
- Enterprise features

---

# 🏗 Architecture Plan

## Repo Structure

/insight-engine
  /adapters
    toastCsvAdapter.ts
  /models
    MenuItem.ts
    Ingredient.ts
    Recipe.ts
    SalesRecord.ts
  /services
    costCalculator.ts
    marginEngine.ts
    pricingEngine.ts
    quadrantAnalysis.ts
  /reports
    profitLeakReport.ts
  /ui
    (simple dashboard + recipe builder)
  /docs
    TODO.md

---

# 🥇 PHASE 1: CSV INGESTION

- [ ] Obtain real Toast export samples
- [ ] Define canonical SalesRecord model
- [ ] Build toastCsvAdapter
- [ ] Normalize:
      - item_name
      - units_sold
      - revenue
      - timestamps (optional for now)
- [ ] Validate upload flow
- [ ] Store data per restaurant instance

Deliverable:
Upload → Parsed sales dataset stored.

---

# 🥈 PHASE 2: INGREDIENT & RECIPE ENGINE (LEVEL 2)

## Ingredient Master Table

- [ ] Ingredient name
- [ ] Unit type (oz, ml, grams, count)
- [ ] Cost per unit
- [ ] Optional waste factor (future)

## Recipe Builder

- [ ] Map menu item → list of ingredients
- [ ] Ingredient quantity per menu item
- [ ] Compute true cost per serving

Deliverable:
Each menu item has a computed cost.

---

# 🥉 PHASE 3: MARGIN ENGINE

- [ ] Compute gross margin %
- [ ] Compute contribution margin
- [ ] Aggregate:
      - total profit per item
      - category margin
- [ ] Rank items by:
      - volume
      - margin
      - contribution

Deliverable:
Sortable margin dashboard.

---

# 🏆 PHASE 4: PROFIT LEAK DETECTION

## Quadrant Analysis

- [ ] High volume / Low margin
- [ ] Low volume / Low margin
- [ ] High volume / High margin
- [ ] Low volume / High margin

## Leak Detection Logic

- [ ] Identify bottom 20% margin items
- [ ] Calculate estimated lost profit if raised to target margin
- [ ] Output:
      "You're losing approximately $X/month on Y SKUs."

Deliverable:
Profit Leak Report JSON + simple UI view.

---

# 🧮 PHASE 5: PRICE SUGGESTION ENGINE

Inputs:
- Target margin (default 75%)
- Current cost
- Current price

Logic:
Suggested price = cost / (1 - target_margin)

- [ ] Add safety band (max +12%)
- [ ] Flag items where increase > 15% (requires caution)

Deliverable:
Actionable pricing suggestions.

---

# 🌐 PHASE 6: MARKETING SITE (SIMPLE)

## Landing Page Must Communicate:

- Problem: Profit leaks
- Mechanism: POS + Ingredient modeling
- Outcome: Identify $ lost per month
- CTA: "Upload your POS export"

Sections:
- Hero
- How it works (3 steps)
- Example profit leak report
- Pricing (beta pricing)
- FAQ (data security, no long-term contract)

No overdesign.
No fake enterprise claims.

---

# 🔐 DATA & PRIVACY (V1)

- Store minimal PII
- Do NOT store employee names
- Strip sensitive identifiers
- Restaurant data siloed per instance
- No cross-client aggregation (yet)

Future:
Add anonymized aggregation only with explicit opt-in.

---

# 💰 MONETIZATION PLAN

Victoria:
$99/month (Founding beta)

Next 2 customers:
$149/month

After validation:
$199–$249/month

---

# 🚫 DO NOT BUILD YET

- Multi-tenant auth
- Stripe billing automation
- API integrations
- Benchmarking engine
- Staff performance analytics
- AI chatbot
- Inventory forecasting
- Complex labor modeling

Focus = Profit Leak Engine.

---

# 📊 SUCCESS METRICS

Within 90 days:

- 2 additional paying customers
- Each identifies ≥ $500/month in potential improvement
- Owner logs in at least weekly during review phase

If this does not happen:
Reevaluate wedge.

---

# 🧠 Long Term Vision (Not Now)

- Direct Toast API integration
- Self onboarding
- Automated weekly insight emails
- Cross-market benchmarking
- Industry reports
- S-Corp revenue optimization

But only after validation.

---
