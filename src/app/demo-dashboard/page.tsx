'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import LandingHeader from '@/components/LandingHeader';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SalesRecord } from '@/insight-engine/models/SalesRecord';
import type { Ingredient } from '@/insight-engine/models/Ingredient';
import type { Recipe } from '@/insight-engine/models/Recipe';
import {
  demoMarginGoal,
  getDemoSalesForBar,
  getDemoSalesForRestaurant,
  buildDemoIngredientsAndRecipesForBar,
  buildDemoIngredientsAndRecipesForRestaurant,
  getDemoMenuPricesForBar,
  getDemoMenuPricesForRestaurant,
} from '@/data/demoData';
import { costPerServing } from '@/insight-engine/services/costCalculator';
import { computeMargins, type ItemMarginRow } from '@/insight-engine/services/marginEngine';
import { suggestPrice } from '@/insight-engine/services/pricingEngine';
import { runQuadrantAnalysis } from '@/insight-engine/services/quadrantAnalysis';
import { buildProfitLeakReport } from '@/insight-engine/reports/profitLeakReport';
import { QuadrantChart, getQuadrantInsight } from './QuadrantChart';
import { ContributionBarChart, LostProfitBarChart, MarginRealityRadar, RevenueDonut } from './Charts';

const uid = () => Math.random().toString(36).slice(2, 11);

export type DemoVariant = 'bar' | 'restaurant';
export type DemoScenario = 'good' | 'bad';

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get('type');
  const scenarioParam = searchParams.get('scenario');
  const [demoVariant, setDemoVariant] = useState<DemoVariant>(() =>
    typeParam === 'bar' ? 'bar' : 'restaurant'
  );
  const [demoScenario, setDemoScenario] = useState<DemoScenario>(() =>
    scenarioParam === 'good' ? 'good' : 'bad'
  );
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sortKey, setSortKey] = useState<keyof ItemMarginRow>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'margins' | 'leaks' | 'pricing' | 'quadrant'>('leaks');
  const [dashboardRevealed, setDashboardRevealed] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [marginGoal, setMarginGoal] = useState(demoMarginGoal);
  const [menuPrices, setMenuPrices] = useState<Record<string, number>>({});
  /** Per-item target margin (decimal). When missing, use default marginGoal. */
  const [menuMarginGoal, setMenuMarginGoal] = useState<Record<string, number>>({});
  /** While editing a number field, hold the raw string so user can delete/retype (key = field id). */
  const [editingNum, setEditingNum] = useState<Record<string, string>>({});
  /** Filter ingredients list by name. */
  const [ingredientFilter, setIngredientFilter] = useState('');
  /** Which menu item's recipe is shown in the recipe builder (one at a time). */
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>('');

  const startDemo = useCallback((variant: DemoVariant, scenario: DemoScenario) => {
    setDemoError(null);
    try {
      const sales = variant === 'bar' ? getDemoSalesForBar() : getDemoSalesForRestaurant();
      const { ingredients: demoIngredients, recipes: demoRecipes } =
        variant === 'bar' ? buildDemoIngredientsAndRecipesForBar() : buildDemoIngredientsAndRecipesForRestaurant();
      const prices = variant === 'bar' ? getDemoMenuPricesForBar(scenario) : getDemoMenuPricesForRestaurant(scenario);
      setSalesRecords(sales);
      setIngredients(demoIngredients);
      setRecipes(demoRecipes);
      setMarginGoal(demoMarginGoal);
      setMenuPrices({ ...prices });
      setMenuMarginGoal({});
      setEditingNum({});
    } catch (e) {
      setDemoError('Could not load demo data.');
    }
  }, []);

  useEffect(() => {
    startDemo(demoVariant, demoScenario);
  }, [demoVariant, demoScenario, startDemo]);

  const switchVariant = (variant: DemoVariant) => {
    if (variant === demoVariant) return;
    setDemoVariant(variant);
    const url = new URL(window.location.href);
    url.searchParams.set('type', variant);
    window.history.replaceState({}, '', url.toString());
  };

  const switchScenario = (scenario: DemoScenario) => {
    if (scenario === demoScenario) return;
    setDemoScenario(scenario);
    const url = new URL(window.location.href);
    url.searchParams.set('scenario', scenario);
    window.history.replaceState({}, '', url.toString());
  };

  const uniqueItemNames = useMemo(() => {
    const set = new Set(salesRecords.map((r) => r.item_name.trim()));
    return Array.from(set).sort();
  }, [salesRecords]);

  /** Keep selected recipe in sync when menu items load or change. */
  useEffect(() => {
    if (uniqueItemNames.length === 0) {
      setSelectedRecipeName('');
      return;
    }
    if (!selectedRecipeName || !uniqueItemNames.includes(selectedRecipeName)) {
      setSelectedRecipeName(uniqueItemNames[0]);
    }
  }, [uniqueItemNames.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps -- only when list identity changes

  const filteredIngredients = useMemo(() => {
    const q = ingredientFilter.trim().toLowerCase();
    if (!q) return ingredients;
    return ingredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [ingredients, ingredientFilter]);

  const itemCosts = useMemo(() => {
    const map = new Map<string, number>();
    for (const recipe of recipes) {
      const cost = costPerServing(recipe, ingredients);
      map.set(recipe.menu_item_name, cost);
    }
    return map;
  }, [recipes, ingredients]);

  const marginRows = useMemo(
    () => computeMargins(salesRecords, itemCosts),
    [salesRecords, itemCosts]
  );

  /** Rows with price overridden by menu prices when set (for margin goal / pricing). */
  const marginRowsWithPrices = useMemo(
    () =>
      marginRows.map((r) => ({
        ...r,
        price: menuPrices[r.item_name] ?? r.price,
      })),
    [marginRows, menuPrices]
  );

  const sortedRows = useMemo(() => {
    const rows = [...marginRowsWithPrices];
    rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      if (typeof aVal === 'string' && typeof bVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return 0;
    });
    return rows;
  }, [marginRowsWithPrices, sortKey, sortDir]);

  const leakReport = useMemo(
    () => buildProfitLeakReport(marginRowsWithPrices, marginGoal, menuMarginGoal),
    [marginRowsWithPrices, marginGoal, menuMarginGoal]
  );
  const quadrantItems = useMemo(
    () => runQuadrantAnalysis(marginRowsWithPrices),
    [marginRowsWithPrices]
  );

  const addIngredient = () => {
    setIngredients((prev) => [
      ...prev,
      { id: uid(), name: '', unit_type: 'oz', cost_per_unit: 0 },
    ]);
  };

  const updateIngredient = (id: string, patch: Partial<Ingredient>) => {
    setIngredients((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((i) => i.id !== id));
    setRecipes((prev) =>
      prev.map((r) => ({
        ...r,
        lines: r.lines.filter((l) => l.ingredient_id !== id),
      }))
    );
  };

  const getOrCreateRecipe = (menuItemName: string): Recipe => {
    const existing = recipes.find((r) => r.menu_item_name === menuItemName);
    if (existing) return existing;
    return { menu_item_name: menuItemName, lines: [] };
  };

  const setRecipe = (menuItemName: string, recipe: Recipe) => {
    setRecipes((prev) => {
      const rest = prev.filter((r) => r.menu_item_name !== menuItemName);
      if (recipe.lines.length === 0) return rest;
      return [...rest, recipe];
    });
  };

  const addRecipeLine = (menuItemName: string, ingredientId: string, quantity: number) => {
    const recipe = getOrCreateRecipe(menuItemName);
    const existing = recipe.lines.find((l) => l.ingredient_id === ingredientId);
    const newLines = existing
      ? recipe.lines.map((l) => (l.ingredient_id === ingredientId ? { ...l, quantity } : l))
      : [...recipe.lines, { ingredient_id: ingredientId, quantity }];
    setRecipe(menuItemName, { ...recipe, lines: newLines });
  };

  const removeRecipeLine = (menuItemName: string, ingredientId: string) => {
    const recipe = getOrCreateRecipe(menuItemName);
    setRecipe(menuItemName, { ...recipe, lines: recipe.lines.filter((l) => l.ingredient_id !== ingredientId) });
  };

  const toggleSort = (key: keyof ItemMarginRow) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else setSortKey(key);
  };

  const showDashboard = () => {
    setDashboardRevealed(true);
    setTimeout(() => {
      dashboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <div className="landing demo-page">
      <LandingHeader />
      <div className="demo-layout">
        <aside className="demo-sidebar" aria-label="Demo configuration">
          <p className="demo-sidebar-label">Admin / config</p>
          <Link href="/" className="link-home">← Back to home</Link>
          <div className="demo-badge" role="status" aria-label="This page is a demo">
            Interactive demo — sample data only
          </div>
          <div className="demo-sidebar-hero">
            <h1 className="demo-hero-title">See your true margin in minutes</h1>
            <p className="demo-hero-sub">
              Pick a menu type and scenario below, then click <strong>Show me the dashboard</strong> to see your report. Imagine this with your own POS data.
            </p>
          </div>

          <section className="demo-chooser demo-chooser--compact">
            <h2 className="demo-chooser-title">Configure demo</h2>
            <p className="demo-chooser-subtitle">Pick a menu type, then choose which scenario to explore.</p>
            <div className="demo-chooser-menu-type">
              <span className="demo-chooser-label">Menu type</span>
              <div className="demo-variant-tabs" role="tablist" aria-label="Demo type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoVariant === 'bar'}
                  className={demoVariant === 'bar' ? 'active' : ''}
                  onClick={() => switchVariant('bar')}
                >
                  Bar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoVariant === 'restaurant'}
                  className={demoVariant === 'restaurant' ? 'active' : ''}
                  onClick={() => switchVariant('restaurant')}
                >
                  Restaurant
                </button>
              </div>
              <p className="demo-chooser-hint">
                {demoVariant === 'bar' ? 'Drinks, pour cost, cocktails.' : 'Food, entrees, kitchen.'}
              </p>
            </div>

            <div className="demo-chooser-scenario demo-chooser-scenario--compact">
              <span className="demo-chooser-label">Scenario</span>
              <p className="demo-chooser-scenario-desc">Compare a healthy operation vs one with profit leaks. Click either to switch.</p>
              <div className="demo-scenario-toggles" role="tablist" aria-label="Good vs bad operation">
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoScenario === 'good'}
                  className={`demo-scenario-toggle demo-scenario-toggle--good ${demoScenario === 'good' ? 'active' : ''}`}
                  onClick={() => switchScenario('good')}
                >
                  Good
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={demoScenario === 'bad'}
                  className={`demo-scenario-toggle demo-scenario-toggle--bad ${demoScenario === 'bad' ? 'active' : ''}`}
                  onClick={() => switchScenario('bad')}
                >
                  Bad
                </button>
              </div>
            </div>

            {salesRecords.length > 0 && (
              <div className="demo-chooser-cta-wrap">
                <button
                  type="button"
                  className="btn btn-primary demo-chooser-cta"
                  onClick={showDashboard}
                >
                  Show me the dashboard
                </button>
                <p className="demo-chooser-cta-hint">See your margin report, charts & price suggestions</p>
              </div>
            )}

            {demoError && <p className="demo-chooser-error">{demoError}</p>}
            {salesRecords.length > 0 && (
              <p className="demo-chooser-data-hint">
                {salesRecords.length} records, {uniqueItemNames.length} {demoVariant === 'bar' ? 'drinks' : 'items'}.
              </p>
            )}

            <details className="demo-how-to">
              <summary>How to read the dashboard</summary>
              <p>Profit leak: items below target margin and estimated $ lost. Margins: per-item cost vs price. Price suggestions: raise prices to hit target. Quadrant: volume (left–right) vs margin % (bottom–top); top-right = stars, bottom-right = fix or loss leaders.</p>
            </details>

            {salesRecords.length > 0 && (
              <section className="demo-config-raw raw-data-section">
                <details>
                  <summary>Ingredients &amp; recipes — optional tweaks</summary>
                  <div className="collapsible-body">
                    <div className="sub-section">
                      <h3>Defaults (target margin)</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        Default target margin is used for all {demoVariant === 'bar' ? 'drinks' : 'menu items'} unless you set a per-item margin in the recipe builder.
                      </p>
                      <div className="form-row">
                        <label htmlFor="default-margin">Default target margin (%)</label>
                        <input
                          id="default-margin"
                          type="text"
                          inputMode="numeric"
                          placeholder="75"
                          value={editingNum['default-margin'] ?? String(Math.round(marginGoal * 100))}
                          onFocus={() => setEditingNum((e) => ({ ...e, 'default-margin': String(Math.round(marginGoal * 100)) }))}
                          onChange={(e) => setEditingNum((prev) => ({ ...prev, 'default-margin': e.target.value }))}
                          onBlur={() => {
                            const raw = editingNum['default-margin'];
                            if (raw == null) return;
                            const n = Math.max(0, Math.min(100, parseFloat(raw) || 0));
                            setMarginGoal(n / 100);
                            setEditingNum((prev) => { const next = { ...prev }; delete next['default-margin']; return next; });
                          }}
                          style={{ width: '5rem' }}
                          aria-label="Default target margin percent"
                        />
                      </div>
                    </div>
                    <div className="sub-section">
                      <h3>{demoVariant === 'bar' ? 'Drink ingredients' : 'Ingredients'} ({ingredients.length})</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        {demoVariant === 'bar'
                          ? 'Spirits, mixers, beer, wine — cost per unit. Assign them to each drink in the recipe builder to see pour cost and margin.'
                          : 'Kitchen ingredients with cost per unit. Assign them to menu items in the recipe builder.'}
                      </p>
                      <div className="ingredients-toolbar">
                        <input
                          type="search"
                          placeholder="Search ingredients…"
                          value={ingredientFilter}
                          onChange={(e) => setIngredientFilter(e.target.value)}
                          className="ingredients-search"
                          aria-label="Filter ingredients by name"
                        />
                        <button type="button" className="btn btn-primary" onClick={addIngredient}>+ Add ingredient</button>
                      </div>
                      <div className="ingredients-table-wrap">
                        <table className="ingredients-table">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Unit</th>
                              <th>Cost</th>
                              <th aria-hidden>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredIngredients.map((ing) => (
                              <tr key={ing.id}>
                                <td>
                                  <input placeholder="Name" value={ing.name} onChange={(e) => updateIngredient(ing.id, { name: e.target.value })} aria-label={`Name for ingredient ${ing.id}`} />
                                </td>
                                <td>
                                  <select value={ing.unit_type} onChange={(e) => updateIngredient(ing.id, { unit_type: e.target.value as Ingredient['unit_type'] })} aria-label={`Unit for ${ing.name || 'ingredient'}`}>
                                    <option value="oz">oz</option>
                                    <option value="ml">ml</option>
                                    <option value="grams">grams</option>
                                    <option value="count">count</option>
                                    <option value="lb">lb</option>
                                    <option value="each">each</option>
                                  </select>
                                </td>
                                <td>
                                  <span className="input-with-prefix">
                                    <span className="input-prefix">$</span>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="0.00"
                                      value={editingNum[`cost-${ing.id}`] ?? (Number.isFinite(ing.cost_per_unit) ? String(ing.cost_per_unit) : '')}
                                      onFocus={() => setEditingNum((e) => ({ ...e, [`cost-${ing.id}`]: Number.isFinite(ing.cost_per_unit) ? String(ing.cost_per_unit) : '' }))}
                                      onChange={(e) => setEditingNum((prev) => ({ ...prev, [`cost-${ing.id}`]: e.target.value }))}
                                      onBlur={() => {
                                        const raw = editingNum[`cost-${ing.id}`];
                                        if (raw == null) return;
                                        const n = Math.max(0, parseFloat(raw) || 0);
                                        updateIngredient(ing.id, { cost_per_unit: n });
                                        setEditingNum((prev) => { const next = { ...prev }; delete next[`cost-${ing.id}`]; return next; });
                                      }}
                                      aria-label={`Cost per unit for ${ing.name || 'ingredient'}`}
                                    />
                                  </span>
                                </td>
                                <td>
                                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeIngredient(ing.id)}>Remove</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredIngredients.length === 0 && (
                          <p style={{ color: 'var(--text-muted)', padding: '0.75rem', margin: 0, fontSize: '0.9rem' }}>
                            {ingredientFilter.trim() ? 'No ingredients match your search.' : 'No ingredients yet.'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="sub-section">
                      <h3>Recipe builder ({demoVariant === 'bar' ? 'pour cost & price per drink' : 'price & margin per item'})</h3>
                      <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                        {demoVariant === 'bar'
                          ? 'For each drink, add ingredients (e.g. oz tequila, oz lime) and quantity per serving. Set price and target margin per drink (or use the default above).'
                          : 'For each menu item, add ingredients and quantity per serving. Set price and target margin per item (or use the default margin from above).'}
                      </p>
                      <div className="recipe-picker">
                        <label htmlFor="recipe-picker-select" className="recipe-picker-label">Edit recipe for</label>
                        <div className="recipe-picker-row">
                          <select
                            id="recipe-picker-select"
                            value={selectedRecipeName}
                            onChange={(e) => setSelectedRecipeName(e.target.value)}
                            className="recipe-picker-select"
                            aria-label="Choose menu item to edit"
                          >
                            {uniqueItemNames.slice(0, 100).map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                          <div className="recipe-picker-nav">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={!selectedRecipeName || uniqueItemNames.indexOf(selectedRecipeName) <= 0}
                              onClick={() => {
                                const idx = uniqueItemNames.indexOf(selectedRecipeName);
                                if (idx > 0) setSelectedRecipeName(uniqueItemNames[idx - 1]);
                              }}
                              aria-label="Previous item"
                            >
                              ←
                            </button>
                            <span className="recipe-picker-count">
                              {selectedRecipeName ? `${uniqueItemNames.indexOf(selectedRecipeName) + 1} / ${uniqueItemNames.length}` : '—'}
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={!selectedRecipeName || uniqueItemNames.indexOf(selectedRecipeName) >= uniqueItemNames.length - 1}
                              onClick={() => {
                                const idx = uniqueItemNames.indexOf(selectedRecipeName);
                                if (idx >= 0 && idx < uniqueItemNames.length - 1) setSelectedRecipeName(uniqueItemNames[idx + 1]);
                              }}
                              aria-label="Next item"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="recipe-builder-single">
              {selectedRecipeName && (() => {
                const name = selectedRecipeName;
                const recipe = getOrCreateRecipe(name);
                const cost = itemCosts.get(name) ?? 0;
                const price = menuPrices[name];
                const targetMarginPct = menuMarginGoal[name] != null ? menuMarginGoal[name] * 100 : marginGoal * 100;
                const currentMarginPct = price != null && price > 0 && cost >= 0
                  ? ((price - cost) / price) * 100
                  : null;
                const atOrAboveTarget = currentMarginPct != null && currentMarginPct >= targetMarginPct;
                return (
                  <div key={name} className="recipe-builder-item">
                    <div className="recipe-builder-item-header">
                      <div className="recipe-builder-item-title-row">
                        <strong>{name}</strong>
                        <span className="recipe-builder-cost">
                          Cost/serving: <strong>${cost.toFixed(2)}</strong>
                        </span>
                      </div>
                      <div className="recipe-builder-item-controls">
                        <label>
                          <span>Price</span>
                          <span className="input-prefix">$</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={editingNum[`price-${name}`] ?? (name in menuPrices && Number.isFinite(menuPrices[name]) ? String(menuPrices[name]) : '')}
                            onFocus={() => setEditingNum((e) => ({ ...e, [`price-${name}`]: name in menuPrices && Number.isFinite(menuPrices[name]) ? String(menuPrices[name]) : '' }))}
                            onChange={(e) => setEditingNum((prev) => ({ ...prev, [`price-${name}`]: e.target.value }))}
                            onBlur={() => {
                              const raw = editingNum[`price-${name}`];
                              if (raw == null) return;
                              if (raw.trim() === '') {
                                setMenuPrices((p) => { const next = { ...p }; delete next[name]; return next; });
                              } else {
                                setMenuPrices((p) => ({ ...p, [name]: Math.max(0, parseFloat(raw) || 0) }));
                              }
                              setEditingNum((prev) => { const next = { ...prev }; delete next[`price-${name}`]; return next; });
                            }}
                            aria-label={`Price for ${name}`}
                          />
                        </label>
                        <label>
                          <span>Target</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="recipe-builder-target-input"
                            placeholder={String(Math.round(marginGoal * 100))}
                            value={editingNum[`target-${name}`] ?? (menuMarginGoal[name] != null ? String(Math.round(menuMarginGoal[name] * 100)) : '')}
                            onFocus={() => setEditingNum((e) => ({ ...e, [`target-${name}`]: menuMarginGoal[name] != null ? String(Math.round(menuMarginGoal[name] * 100)) : '' }))}
                            onChange={(e) => setEditingNum((prev) => ({ ...prev, [`target-${name}`]: e.target.value }))}
                            onBlur={() => {
                              const raw = editingNum[`target-${name}`];
                              if (raw == null) return;
                              if (raw.trim() === '') {
                                setMenuMarginGoal((m) => { const next = { ...m }; delete next[name]; return next; });
                              } else {
                                const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
                                setMenuMarginGoal((m) => ({ ...m, [name]: pct / 100 }));
                              }
                              setEditingNum((prev) => { const next = { ...prev }; delete next[`target-${name}`]; return next; });
                            }}
                            aria-label={`Target margin % for ${name}`}
                          />
                          <span className="input-prefix">%</span>
                        </label>
                        {currentMarginPct != null && (
                          <span
                            className={atOrAboveTarget ? 'badge badge-success' : 'badge badge-warn'}
                            style={{ fontWeight: 600 }}
                            title={atOrAboveTarget ? 'At or above target margin' : 'Below target margin'}
                          >
                            Margin {currentMarginPct.toFixed(1)}% {atOrAboveTarget ? '✓' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="recipe-builder-item-ingredients">
                      <label className="recipe-builder-add-ingredient-label">
                        <select
                          className="recipe-builder-add-select"
                          onChange={(e) => {
                            const id = e.target.value;
                            if (!id) return;
                            const q = prompt('Quantity per serving?');
                            if (q != null) addRecipeLine(name, id, parseFloat(q) || 0);
                            e.target.value = '';
                          }}
                          aria-label={`Add ingredient to ${name}`}
                        >
                          <option value="">+ Add ingredient</option>
                          {ingredients.filter((i) => i.name).map((i) => (
                            <option key={i.id} value={i.id}>{i.name} ({i.unit_type})</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <ul className="recipe-builder-lines">
                      {recipe.lines.map((line) => {
                        const ing = ingredients.find((i) => i.id === line.ingredient_id);
                        return (
                          <li key={line.ingredient_id} className="recipe-builder-line">
                            <span>{ing?.name ?? '?'} × {line.quantity} {ing?.unit_type ?? ''}</span>
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.15rem 0.5rem', fontSize: '0.8rem' }} onClick={() => removeRecipeLine(name, line.ingredient_id)} aria-label={`Remove ${ing?.name ?? 'ingredient'} from recipe`}>Remove</button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })()}
              {!selectedRecipeName && uniqueItemNames.length > 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Select a menu item above to edit its recipe.</p>
              )}
                      </div>
                    </div>
                  </div>
                </details>
              </section>
            )}
          </section>
        </aside>

        <main className="demo-main">
      {salesRecords.length > 0 && (
        <>
          {!dashboardRevealed && (
            <div className="demo-placeholder" aria-hidden>
              <p className="demo-placeholder-text">Pick your menu type and scenario above, then click <strong>Show me the dashboard</strong> to see your margin report.</p>
            </div>
          )}
          <div
            ref={dashboardRef}
            className={`demo-app-preview ${!dashboardRevealed ? 'demo-app-preview--hidden' : ''}`}
            aria-hidden={!dashboardRevealed}
          >
            <header className="demo-app-header" role="banner">
              <span className="demo-app-header-brand">Margin Insights</span>
              <nav className="demo-app-header-nav" aria-label="App navigation">
                <span className="demo-app-header-active">Dashboard</span>
              </nav>
            </header>
          <section className="dashboard-section">
            <h2>Margin &amp; profit</h2>
            <div className="tabs">
              <button type="button" className={activeTab === 'leaks' ? 'active' : ''} onClick={() => setActiveTab('leaks')}>Profit leak report</button>
              <button type="button" className={activeTab === 'margins' ? 'active' : ''} onClick={() => setActiveTab('margins')}>Margins</button>
              <button type="button" className={activeTab === 'pricing' ? 'active' : ''} onClick={() => setActiveTab('pricing')}>Price suggestions</button>
              <button type="button" className={activeTab === 'quadrant' ? 'active' : ''} onClick={() => setActiveTab('quadrant')}>Quadrant</button>
            </div>

            {activeTab === 'leaks' && (
              <>
                <div className="profit-leak-hero">
                  <h3 className="profit-leak-hero-title">Profit leak</h3>
                  {leakReport.items.length > 0 ? (
                    <div className="leak-stats-grid">
                      <div className="leak-stat">
                        <span className="leak-stat-value">${leakReport.summary.estimated_lost_profit_per_month.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="leak-stat-label">Est. lost per month</span>
                      </div>
                      <div className="leak-stat">
                        <span className="leak-stat-value">{leakReport.summary.bottom_margin_skus}</span>
                        <span className="leak-stat-label">Items below {(marginGoal * 100).toFixed(0)}% target</span>
                      </div>
                      <div className="leak-stat">
                        <span className="leak-stat-value">{leakReport.items.slice(0, 3).map((i) => `${i.item_name} ($${i.estimated_lost_profit_per_month.toFixed(0)})`).join(' · ')}</span>
                        <span className="leak-stat-label">Top by lost $</span>
                      </div>
                    </div>
                  ) : (
                    <div className="leak-stats-grid">
                      <div className="leak-stat">
                        <span className="leak-stat-value">0</span>
                        <span className="leak-stat-label">Items below target this period</span>
                      </div>
                    </div>
                  )}
                </div>
                {leakReport.items.length > 0 && (leakReport.summary.items_to_fix_count > 0 || leakReport.summary.strategic_candidate_count > 0) && (
                  <div className="leak-high-level" aria-label="Leak breakdown">
                    <div className="leak-high-level-grid">
                      <div className="leak-high-level-card leak-high-level-fix">
                        <span className="leak-high-level-value">${leakReport.summary.lost_from_items_to_fix.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="leak-high-level-label">
                          {leakReport.summary.items_to_fix_count} to fix
                          {(() => {
                            const toFixItems = leakReport.items.filter((i) => i.role === 'to_fix');
                            const names = toFixItems.map((i) => i.item_name);
                            if (names.length === 0) return null;
                            if (names.length <= 3) return <>: {names.join(', ')}</>;
                            return <>: {names.slice(0, 2).join(', ')} +{names.length - 2}</>;
                          })()}
                        </span>
                      </div>
                      <div className="leak-high-level-card leak-high-level-strategic">
                        <span className="leak-high-level-value">${leakReport.summary.lost_from_strategic_candidates.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="leak-high-level-label">
                          {leakReport.summary.strategic_candidate_count} possible loss leader{leakReport.summary.strategic_candidate_count !== 1 ? 's' : ''}
                          {(() => {
                            const strategicItems = leakReport.items.filter((i) => i.role === 'strategic_candidate');
                            const names = strategicItems.map((i) => i.item_name);
                            if (names.length === 0) return null;
                            if (names.length <= 3) return <>: {names.join(', ')}</>;
                            return <>: {names.slice(0, 2).join(', ')} +{names.length - 2}</>;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {leakReport.items.length > 0 && (
                  <>
                    <p className="leak-next-step">Price suggestions tab → recommended prices per item.</p>
                    <LostProfitBarChart items={leakReport.items} />
                  </>
                )}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Current margin %</th>
                        <th>Units sold</th>
                        <th>Suggested price</th>
                        <th>Est. lost/month</th>
                        <th>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leakReport.items.map((i) => (
                        <tr key={i.item_name}>
                          <td>{i.item_name}</td>
                          <td className="num">{i.current_margin_pct.toFixed(1)}%</td>
                          <td className="num">{i.units_sold}</td>
                          <td className="num">${i.suggested_price.toFixed(2)}</td>
                          <td className="num">${i.estimated_lost_profit_per_month.toFixed(2)}</td>
                          <td>
                            {i.role === 'strategic_candidate' ? (
                              <span className="badge badge-strategic" title="High volume, low margin — may be an intentional loss leader">Possible loss leader</span>
                            ) : (
                              <span className="badge badge-fix" title="Recommend raising price to hit target margin">Fix price</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'margins' && (
              <>
                {(() => {
                  const targetPct = marginGoal * 100;
                  const good = sortedRows.filter((r) => !Number.isNaN(r.gross_margin_pct) && r.gross_margin_pct >= targetPct);
                  const needAttention = sortedRows.filter((r) => !Number.isNaN(r.gross_margin_pct) && r.gross_margin_pct < targetPct && r.gross_margin_pct >= targetPct * 0.5);
                  const bad = sortedRows.filter((r) => !Number.isNaN(r.gross_margin_pct) && r.gross_margin_pct < targetPct * 0.5);
                  const topNames = good.slice(0, 3).map((r) => r.item_name).join(', ');
                  const watchNames = [...needAttention, ...bad].slice(0, 3).map((r) => r.item_name).join(', ');
                  return (
                    <>
                      <div className="actionable-strip">
                        <strong>At a glance:</strong> Your best contributors (green) are {topNames || '—'}. {watchNames ? `Watch: ${watchNames} — raise prices or reduce cost to hit target margin.` : 'Most items are at or above target margin.'}
                      </div>
                      <div className="dashboard-charts-grid">
                        <ContributionBarChart rows={marginRowsWithPrices} targetMarginPct={targetPct} />
                        <RevenueDonut rows={marginRowsWithPrices} />
                        <MarginRealityRadar rows={marginRowsWithPrices} targetMarginPct={targetPct} />
                      </div>
                      <div className="table-wrap">
                        <table className="sortable">
                          <thead>
                            <tr>
                              <th onClick={() => toggleSort('item_name')} title="Click to sort by item name">Item</th>
                              <th onClick={() => toggleSort('units_sold')} title="Click to sort by units sold">Units sold</th>
                              <th onClick={() => toggleSort('revenue')} title="Click to sort by revenue">Revenue</th>
                              <th onClick={() => toggleSort('cost_per_serving')} title="Click to sort by cost per serving">Cost/serving</th>
                              <th onClick={() => toggleSort('gross_margin_pct')} title="Click to sort by margin %">Margin %</th>
                              <th onClick={() => toggleSort('contribution_margin')} title="Click to sort by profit">Profit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRows.map((r) => {
                              const marginTier = Number.isNaN(r.gross_margin_pct) ? '' : r.gross_margin_pct >= targetPct ? 'good' : r.gross_margin_pct >= targetPct * 0.7 ? 'warn' : 'bad';
                              return (
                                <tr key={r.item_name} className={marginTier ? `tr-margin-${marginTier}` : ''}>
                                  <td>{r.item_name}</td>
                                  <td className="num">{r.units_sold}</td>
                                  <td className="num">${r.revenue.toFixed(2)}</td>
                                  <td className="num">${r.cost_per_serving.toFixed(2)}</td>
                                  <td className={`num ${marginTier ? `td-margin-${marginTier}` : ''}`}>{Number.isNaN(r.gross_margin_pct) ? '—' : `${r.gross_margin_pct.toFixed(1)}%`}</td>
                                  <td className="num">${r.contribution_margin.toFixed(2)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </>
            )}

            {activeTab === 'pricing' && (
              <>
                {(() => {
                  const pricingRows = marginRowsWithPrices.filter((r) => r.cost_per_serving > 0 && r.price != null && r.price > 0);
                  const withSuggestion = pricingRows.map((r) => ({ row: r, suggestion: suggestPrice(r.cost_per_serving, r.price!, menuMarginGoal[r.item_name] ?? marginGoal) }));
                  const needRaise = withSuggestion.filter((x) => x.suggestion.suggested_price > x.suggestion.current_price);
                  const totalGain = needRaise.reduce((s, x) => s + (x.suggestion.suggested_price - x.row.price!) * x.row.units_sold, 0);
                  return (
                    <>
                      <div className="actionable-strip">
                        <strong>Do this:</strong> {needRaise.length > 0 ? `Raise prices on ${needRaise.length} items to capture ~$${totalGain.toFixed(0)}/month. Start with the highest increase % below.` : 'Your prices are in line with target margin — no changes needed.'}
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Current price</th>
                              <th>Cost</th>
                              <th>Suggested price</th>
                              <th>Change %</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {withSuggestion.map(({ row: r, suggestion: s }) => {
                              const belowTarget = s.suggested_price > s.current_price;
                              const aboveTargetPts = s.current_margin_pct - s.target_margin_pct;
                              const atTarget = !belowTarget && aboveTargetPts < 0.5;
                              const aboveTarget = !belowTarget && aboveTargetPts >= 0.5;
                              return (
                                <tr key={r.item_name} className={belowTarget ? (s.increase_pct > 15 ? 'tr-margin-bad' : s.increase_pct > 8 ? 'tr-margin-warn' : '') : ''}>
                                  <td>{r.item_name}</td>
                                  <td className="num">${s.current_price.toFixed(2)}</td>
                                  <td className="num">${s.cost.toFixed(2)}</td>
                                  <td className="num">
                                    {belowTarget ? (
                                      `$${s.suggested_price.toFixed(2)}`
                                    ) : (
                                      <span title="Already at or above target margin — no price change suggested">—</span>
                                    )}
                                  </td>
                                  <td className={`num ${belowTarget ? (s.caution ? 'td-margin-bad' : s.increase_pct > 8 ? 'td-margin-warn' : 'td-margin-good') : aboveTarget ? 'td-margin-good' : ''}`}>
                                    {belowTarget ? (
                                      `+${s.increase_pct.toFixed(1)}%`
                                    ) : atTarget ? (
                                      <span style={{ color: 'var(--text-muted)' }}>At target</span>
                                    ) : (
                                      <span style={{ color: 'var(--success)' }} title="Margin above target; volume may be low for other reasons (location, season, etc.)">Above by {aboveTargetPts.toFixed(1)}%</span>
                                    )}
                                  </td>
                                  <td>
                                    {atTarget && <span className="badge" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>At target</span>}
                                    {aboveTarget && <span className="badge" style={{ background: 'var(--success-muted)', color: 'var(--success)' }}>Above target</span>}
                                    {belowTarget && s.capped && <span className="badge capped">Capped +12%</span>}
                                    {belowTarget && s.caution && <span className="badge badge-warn">Caution &gt;15%</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="demo-pricing-note">
                        Per-item target margin when set in recipe builder; otherwise default {(marginGoal * 100).toFixed(0)}%. <strong>Below target:</strong> suggested price and % increase to get there (volume unchanged). <strong>At/above target:</strong> no change; &quot;Above by X%&quot; = margin above target. The <strong>12% cap</strong> limits the &quot;first step&quot; suggested increase so we don&apos;t recommend a 40% hike in one go; the <strong>lost profit</strong> number above is the full gap to your {(marginGoal * 100).toFixed(0)}% target (no cap). Items needing &gt;15% increase are flagged for caution.
                      </p>
                    </>
                  );
                })()}
              </>
            )}

            {activeTab === 'quadrant' && (
              <>
                {(() => {
                  const byQuad = quadrantItems.reduce((acc, q) => { acc[q.quadrant] = (acc[q.quadrant] || 0) + 1; return acc; }, {} as Record<string, number>);
                  const stars = byQuad.high_volume_high_margin || 0;
                  const fix = byQuad.high_volume_low_margin || 0;
                  const niche = byQuad.low_volume_high_margin || 0;
                  const review = byQuad.low_volume_low_margin || 0;
                  return (
                    <div className="actionable-strip" style={{ marginBottom: '1rem' }}>
                      <strong>Your menu at a glance:</strong> {stars} stars (high volume, high margin), {fix} fix or drop (high volume, low margin — may be loss leaders), {niche} comfort items (low volume, high margin — may cost more to store than worth), {review} to review. Hover any dot for a plain-English insight.
                    </div>
                  );
                })()}
                <div className="quadrant-chart-section">
                  <div className="quadrant-how-to-read">
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>How to read this chart</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      Each dot is a menu item. <strong style={{ color: 'var(--text)' }}>Left–right</strong> is volume (how many you sold); <strong style={{ color: 'var(--text)' }}>bottom–top</strong> is margin % (how much you keep after cost). The lines split your menu into four quadrants: <strong style={{ color: 'var(--success)' }}>top-right</strong> = high volume, high margin (your stars); <strong style={{ color: 'var(--warn)' }}>bottom-right</strong> = high volume, low margin (may be loss leaders — OK if they drive other sales, otherwise raise price); <strong style={{ color: 'var(--text)' }}>top-left</strong> = low volume, high margin (comfort items; they may cost more to store than they're worth — regulars might switch to something simpler if you drop them or make them specials only); <strong style={{ color: 'var(--text-muted)' }}>bottom-left</strong> = low volume, low margin (review or cut). Hover any dot to see the numbers and a plain-English take.
                    </p>
                  </div>
                  <QuadrantChart items={quadrantItems} getInsight={getQuadrantInsight} />
                </div>
              </>
            )}
          </section>

            <footer className="demo-app-footer" role="contentinfo">
              <span>Margin Insights — Dashboard</span>
            </footer>
          </div>

          <footer className="demo-footer section">
            <p className="demo-footer-text">
              When you&apos;re ready for your own data, <Link href="/#pricing" className="demo-footer-cta">see pricing</Link> — $249/month or $2,000 once for lifetime access (limited offer).
            </p>
          </footer>
        </>
      )}
        </main>
      </div>
    </div>
  );
};

const DashboardFallback = () => (
  <div className="landing demo-page">
    <LandingHeader />
    <div className="demo-layout" style={{ padding: '2rem', textAlign: 'center' }}>
      <p>Loading demo…</p>
    </div>
  </div>
);

export default function DemoDashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}
