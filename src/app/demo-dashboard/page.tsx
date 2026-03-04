'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SalesRecord } from '@/insight-engine/models/SalesRecord';
import type { Ingredient, IngredientKind } from '@/insight-engine/models/Ingredient';
import type { Recipe } from '@/insight-engine/models/Recipe';
import { demoMarginGoal } from '@/data/demoData';
import { costPerServing } from '@/insight-engine/services/costCalculator';
import { computeMargins, type ItemMarginRow } from '@/insight-engine/services/marginEngine';
import { suggestPrice } from '@/insight-engine/services/pricingEngine';
import { runQuadrantAnalysis } from '@/insight-engine/services/quadrantAnalysis';
import { buildProfitLeakReport } from '@/insight-engine/reports/profitLeakReport';
import { buildQuickWins, getPrimaryIssue } from '@/insight-engine/utils/overviewData';
import { QuadrantChart, getQuadrantInsight } from './QuadrantChart';
import { ContributionBarChart, LostProfitBarChart, MarginRealityRadar, RevenueDonut } from './Charts';

const uid = () => Math.random().toString(36).slice(2, 11);

const DashboardContent = () => {
  const searchParams = useSearchParams();
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sortKey, setSortKey] = useState<keyof ItemMarginRow>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'margins' | 'leaks' | 'pricing' | 'quadrant'>('leaks');
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [marginGoal, setMarginGoal] = useState(demoMarginGoal);
  const [menuPrices, setMenuPrices] = useState<Record<string, number>>({});
  /** Per-item target margin (decimal). When missing, use default marginGoal. */
  const [menuMarginGoal, setMenuMarginGoal] = useState<Record<string, number>>({});
  /** While editing a number field, hold the raw string so user can delete/retype (key = field id). */
  const [editingNum, setEditingNum] = useState<Record<string, string>>({});
  /** Filter ingredients & maintenance list by name. */
  const [ingredientFilter, setIngredientFilter] = useState('');
  /** Which menu item's recipe is shown in the recipe builder (one at a time). */
  const [selectedRecipeName, setSelectedRecipeName] = useState<string>('');

  const hasCostIngredients = useMemo(
    () => ingredients.some((ing) => ing.name && Number.isFinite(ing.cost_per_unit) && ing.cost_per_unit > 0),
    [ingredients],
  );

  const baseIngredients = useMemo(
    () => ingredients.filter((i) => (i.kind ?? 'ingredient') === 'ingredient'),
    [ingredients],
  );

  const maintenanceIngredients = useMemo(
    () => ingredients.filter((i) => i.kind === 'maintenance'),
    [ingredients],
  );

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
    if (!q) return baseIngredients;
    return baseIngredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [baseIngredients, ingredientFilter]);

  const itemCosts = useMemo(() => {
    const map = new Map<string, number>();
    for (const recipe of recipes) {
      const cost = costPerServing(recipe, ingredients);
      map.set(recipe.menu_item_name, cost);
    }
    return map;
  }, [recipes, ingredients]);

  const marginRows = useMemo(
    () => computeMargins(salesRecords, itemCosts, menuPrices),
    [salesRecords, itemCosts, menuPrices]
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

  const addIngredient = (kind: IngredientKind = 'ingredient') => {
    setIngredients((prev) => [
      ...prev,
      {
        id: uid(),
        name: '',
        unit_type: kind === 'maintenance' ? 'each' : 'oz',
        cost_per_unit: 0,
        kind,
      },
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

  const hasAnyIngredients = ingredients.length > 0;
  const hasAnyMenuItems = recipes.length > 0;

  return (
    <div className="landing demo-page">
      <DashboardHeader slug="demo" />
      <div className="demo-layout">
        <main className="demo-main">
          <section id="overview" className="dashboard-section">
            {!hasAnyIngredients && !hasAnyMenuItems ? (
              <section className="dashboard-empty">
                <h2>Overview</h2>
                <h3>Before the dashboard works</h3>
                <p>
                  The point of Margin Insights is to force a clear understanding of the true cost of everything you sell, so you
                  can spot cost centers and low-margin items immediately. Once we know both cost and sales volume, the reports
                  become very sharp.
                </p>
                <ol>
                  <li>
                    <strong>Add your menu items.</strong> Start with what you sell: name, price, and
                    units sold per period. Upload a POS export or add items manually.
                  </li>
                  <li>
                    <strong>Define ingredients for each item.</strong> For each dish or drink, add what
                    goes into it and how much — e.g. Wings $15: 1 lb chicken, 2 oz buffalo sauce, 2 oz
                    ranch, 2 oz celery. Include maintenance costs (dishwasher, CO₂) where relevant.
                  </li>
                  <li>
                    <strong>Add sales volume.</strong> For each item, enter units sold per month so we
                    can layer profit and volume together in the reporting views.
                  </li>
                </ol>
                <p>
                  Owners think in dishes and drinks, not a pantry list. Add what you sell first, then
                  break each item down into its ingredients and quantities so we can compute true cost
                  per serving.
                </p>
              </section>
            ) : (
              <section className="dashboard-overview-summary">
                <h2>Overview</h2>
                <p>
                  You have <strong>{ingredients.length}</strong> cost components and <strong>{recipes.length}</strong> menu
                  items set up.
                </p>
                <p>
                  Jump into <a href="#reporting">Reporting</a> to see profit leaks and price suggestions, or update your{' '}
                  <a href="#ingredient-management">menu &amp; recipes</a>.
                </p>
              </section>
            )}
          </section>

          <section id="ingredient-management" className="demo-config-raw raw-data-section">
            <details open>
              <summary>Menu items, ingredients &amp; recipes</summary>
              <div className="collapsible-body">
                <div className="sub-section">
                  <h3>Defaults (target margin)</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    Default target margin is used for all menu items unless you set a per-item margin in the recipe builder.
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
                      onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      onBlur={() => {
                        const raw = editingNum['default-margin'];
                        if (raw == null) return;
                        const n = Math.max(0, Math.min(100, parseFloat(raw) || 0));
                        setMarginGoal(n / 100);
                        setEditingNum((prev) => {
                          const next = { ...prev };
                          delete next['default-margin'];
                          return next;
                        });
                      }}
                      style={{ width: '5rem' }}
                      aria-label="Default target margin percent"
                    />
                  </div>
                </div>
                <div className="sub-section">
                  <h3>Ingredients &amp; maintenance costs</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    As you build recipes for each menu item, add the ingredients you need here (chicken,
                    buffalo sauce, tequila, lime) plus maintenance costs (dishwasher, CO₂). Each line
                    can be reused across items.
                  </p>
                  <div className="ingredients-toolbar">
                    <input
                      type="search"
                      placeholder="Search ingredients &amp; maintenance…"
                      value={ingredientFilter}
                      onChange={(e) => setIngredientFilter(e.target.value)}
                      className="ingredients-search"
                      aria-label="Filter ingredients by name"
                    />
                    <button type="button" className="btn btn-primary" onClick={() => addIngredient('ingredient')}>
                      + Add ingredient
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => addIngredient('maintenance')}>
                      + Add maintenance cost
                    </button>
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
                              <input
                                placeholder="Name"
                                value={ing.name}
                                onChange={(e) => updateIngredient(ing.id, { name: e.target.value })}
                                aria-label={`Name for ingredient ${ing.id}`}
                              />
                            </td>
                            <td>
                              <select
                                value={ing.unit_type}
                                onChange={(e) => updateIngredient(ing.id, { unit_type: e.target.value as Ingredient['unit_type'] })}
                                aria-label={`Unit for ${ing.name || 'ingredient'}`}
                              >
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
                                  onFocus={() =>
                                    setEditingNum((e) => ({
                                      ...e,
                                      [`cost-${ing.id}`]: Number.isFinite(ing.cost_per_unit) ? String(ing.cost_per_unit) : '',
                                    }))
                                  }
                                  onChange={(e) => setEditingNum((prev) => ({ ...prev, [`cost-${ing.id}`]: e.target.value }))}
                                  onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                  onBlur={() => {
                                    const raw = editingNum[`cost-${ing.id}`];
                                    if (raw == null) return;
                                    const n = Math.max(0, parseFloat(raw) || 0);
                                    updateIngredient(ing.id, { cost_per_unit: n });
                                    setEditingNum((prev) => {
                                      const next = { ...prev };
                                      delete next[`cost-${ing.id}`];
                                      return next;
                                    });
                                  }}
                                  aria-label={`Cost per unit for ${ing.name || 'ingredient'}`}
                                />
                              </span>
                            </td>
                            <td>
                              <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeIngredient(ing.id)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {filteredIngredients.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', padding: '0.75rem', margin: 0, fontSize: '0.9rem' }}>
                        {ingredientFilter.trim()
                          ? 'No ingredients or maintenance costs match your search.'
                          : 'No ingredients or maintenance costs yet.'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="sub-section">
                  <h3>Recipe builder (cost, price &amp; margin per item)</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    For each dish or drink you sell, add what goes in it and how much — e.g. Wings: 1 lb
                    chicken, 2 oz buffalo sauce, 2 oz ranch. Set price and target margin per item.
                  </p>
                  <div className="recipe-picker">
                    <label htmlFor="recipe-picker-select" className="recipe-picker-label">
                      Edit recipe for
                    </label>
                    <div className="recipe-picker-row">
                      <select
                        id="recipe-picker-select"
                        value={selectedRecipeName}
                        onChange={(e) => setSelectedRecipeName(e.target.value)}
                        className="recipe-picker-select"
                        aria-label="Choose menu item to edit"
                      >
                        {uniqueItemNames.slice(0, 100).map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
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
                    {selectedRecipeName &&
                      (() => {
                        const name = selectedRecipeName;
                        const recipe = getOrCreateRecipe(name);
                        const cost = itemCosts.get(name) ?? 0;
                        const price = menuPrices[name];
                        const targetMarginPct =
                          menuMarginGoal[name] != null ? menuMarginGoal[name] * 100 : marginGoal * 100;
                        const currentMarginPct =
                          price != null && price > 0 && cost >= 0 ? ((price - cost) / price) * 100 : null;
                        const atOrAboveTarget =
                          currentMarginPct != null && currentMarginPct >= targetMarginPct;

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
                                    value={
                                      editingNum[`price-${name}`] ??
                                      (name in menuPrices && Number.isFinite(menuPrices[name])
                                        ? String(menuPrices[name])
                                        : '')
                                    }
                                    onFocus={() =>
                                      setEditingNum((e) => ({
                                        ...e,
                                        [`price-${name}`]:
                                          name in menuPrices && Number.isFinite(menuPrices[name])
                                            ? String(menuPrices[name])
                                            : '',
                                      }))
                                    }
                                    onChange={(e) =>
                                      setEditingNum((prev) => ({
                                        ...prev,
                                        [`price-${name}`]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    onBlur={() => {
                                      const raw = editingNum[`price-${name}`];
                                      if (raw == null) return;
                                      if (raw.trim() === '') {
                                        setMenuPrices((p) => {
                                          const next = { ...p };
                                          delete next[name];
                                          return next;
                                        });
                                      } else {
                                        setMenuPrices((p) => ({
                                          ...p,
                                          [name]: Math.max(0, parseFloat(raw) || 0),
                                        }));
                                      }
                                      setEditingNum((prev) => {
                                        const next = { ...prev };
                                        delete next[`price-${name}`];
                                        return next;
                                      });
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
                                    value={
                                      editingNum[`target-${name}`] ??
                                      (menuMarginGoal[name] != null
                                        ? String(Math.round(menuMarginGoal[name] * 100))
                                        : '')
                                    }
                                    onFocus={() =>
                                      setEditingNum((e) => ({
                                        ...e,
                                        [`target-${name}`]:
                                          menuMarginGoal[name] != null
                                            ? String(Math.round(menuMarginGoal[name] * 100))
                                            : '',
                                      }))
                                    }
                                    onChange={(e) =>
                                      setEditingNum((prev) => ({
                                        ...prev,
                                        [`target-${name}`]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    onBlur={() => {
                                      const raw = editingNum[`target-${name}`];
                                      if (raw == null) return;
                                      if (raw.trim() === '') {
                                        setMenuMarginGoal((m) => {
                                          const next = { ...m };
                                          delete next[name];
                                          return next;
                                        });
                                      } else {
                                        const pct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
                                        setMenuMarginGoal((m) => ({
                                          ...m,
                                          [name]: pct / 100,
                                        }));
                                      }
                                      setEditingNum((prev) => {
                                        const next = { ...prev };
                                        delete next[`target-${name}`];
                                        return next;
                                      });
                                    }}
                                    aria-label={`Target margin % for ${name}`}
                                  />
                                  <span className="input-prefix">%</span>
                                </label>
                                {currentMarginPct != null && (
                                  <span
                                    className={atOrAboveTarget ? 'badge badge-success' : 'badge badge-warn'}
                                    style={{ fontWeight: 600 }}
                                    title={
                                      atOrAboveTarget
                                        ? 'At or above target margin'
                                        : 'Below target margin'
                                    }
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
                                  {ingredients
                                    .filter((i) => i.name)
                                    .map((i) => (
                                      <option key={i.id} value={i.id}>
                                        {i.name} ({i.unit_type})
                                      </option>
                                    ))}
                                </select>
                              </label>
                            </div>
                            <ul className="recipe-builder-lines">
                              {recipe.lines.map((line) => {
                                const ing = ingredients.find(
                                  (i) => i.id === line.ingredient_id,
                                );
                                return (
                                  <li
                                    key={line.ingredient_id}
                                    className="recipe-builder-line"
                                  >
                                    <span>
                                      {ing?.name ?? '?'} × {line.quantity}{' '}
                                      {ing?.unit_type ?? ''}
                                    </span>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{
                                        padding: '0.15rem 0.5rem',
                                        fontSize: '0.8rem',
                                      }}
                                      onClick={() =>
                                        removeRecipeLine(name, line.ingredient_id)
                                      }
                                      aria-label={`Remove ${
                                        ing?.name ?? 'ingredient'
                                      } from recipe`}
                                    >
                                      Remove
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })()}
                    {!selectedRecipeName && uniqueItemNames.length > 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Select a menu item above to edit its recipe.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </details>
          </section>

      {recipes.length > 0 && (
        <>
          <div ref={dashboardRef} className="demo-app-preview">
            <header className="demo-app-header" role="banner">
              <span className="demo-app-header-brand">Margin Insights</span>
              <nav className="demo-app-header-nav" aria-label="App navigation">
                <span className="demo-app-header-active">Dashboard</span>
              </nav>
            </header>
          <section id="reporting" className="dashboard-section">
            <h2>Margin &amp; profit</h2>
            <div className="tabs">
              <button type="button" className={activeTab === 'leaks' ? 'active' : ''} onClick={() => setActiveTab('leaks')}>Profit leak report</button>
              <button type="button" className={activeTab === 'margins' ? 'active' : ''} onClick={() => setActiveTab('margins')}>Margins</button>
              <button type="button" className={activeTab === 'pricing' ? 'active' : ''} onClick={() => setActiveTab('pricing')}>Price suggestions</button>
              <button type="button" className={activeTab === 'quadrant' ? 'active' : ''} onClick={() => setActiveTab('quadrant')}>Quadrant</button>
            </div>

            {activeTab === 'leaks' && (
              <div className="profit-leak-report">
                {leakReport.items.length > 0 ? (
                  <>
                    <div className="profit-leak-summary">
                      <span className="profit-leak-summary-amount">
                        ${leakReport.summary.estimated_lost_profit_per_month.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <span className="profit-leak-summary-text">
                        est. lost per month
                        {' · '}
                        $
                        {(leakReport.summary.estimated_lost_profit_per_month * 12).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        /yr
                        {' · '}
                        {leakReport.summary.bottom_margin_skus} items below {(marginGoal * 100).toFixed(0)}% target
                      </span>
                    </div>
                    <div
                      className={
                        buildQuickWins(leakReport.items, menuPrices).length > 0
                          ? 'profit-leak-main profit-leak-main--with-actions'
                          : 'profit-leak-main'
                      }
                    >
                      <div className="profit-leak-chart">
                        <LostProfitBarChart items={leakReport.items} />
                      </div>
                      {(() => {
                        const quickWins = buildQuickWins(leakReport.items, menuPrices);
                        if (quickWins.length === 0) return null;
                        return (
                          <div className="profit-leak-actions">
                            <h4 className="profit-leak-actions-title">Quick wins</h4>
                            <p className="profit-leak-actions-desc">
                              Raise these prices first to capture the most profit. Tip: Shrinking portions slightly can also help bridge margin gaps without raising prices.
                            </p>
                            <ul className="profit-leak-actions-list">
                              {quickWins.map((w, idx) => (
                                <li key={idx}>
                                  <span className="profit-leak-actions-action">{w.action}</span>
                                  <span className="profit-leak-actions-gain">
                                    +${w.expectedGain.toFixed(0)}/mo
                                  </span>
                                </li>
                              ))}
                            </ul>
                            <button
                              type="button"
                              className="profit-leak-actions-link"
                              onClick={() => setActiveTab('pricing')}
                            >
                              See all price suggestions →
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="profit-leak-table-section">
                      <h4 className="profit-leak-table-title">Leak items</h4>
                      <p className="profit-leak-table-hint">
                        Raise prices or shrink portions slightly to bridge these margin gaps.
                      </p>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Current price</th>
                              <th>Suggested price</th>
                              <th>Est. lost/mo</th>
                              <th>Margin %</th>
                              <th>Units</th>
                              <th>Role</th>
                              <th>Likely cause</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leakReport.items.map((i) => {
                              const currentPrice = i.units_sold > 0 ? i.revenue / i.units_sold : 0;
                              return (
                                <tr key={i.item_name}>
                                  <td className="profit-leak-item-name">{i.item_name}</td>
                                  <td className="num">${currentPrice.toFixed(2)}</td>
                                  <td className="num">${i.suggested_price.toFixed(2)}</td>
                                  <td className="num profit-leak-lost">
                                    ${i.estimated_lost_profit_per_month.toFixed(2)}
                                  </td>
                                  <td className="num">{i.current_margin_pct.toFixed(1)}%</td>
                                  <td className="num">{i.units_sold}</td>
                                  <td>
                                    {i.role === 'strategic_candidate' ? (
                                      <span className="badge badge-strategic" title="High volume, low margin — may be an intentional loss leader">Possible loss leader</span>
                                    ) : (
                                      <span className="badge badge-fix" title="Recommend raising price to hit target margin">Fix price</span>
                                    )}
                                  </td>
                                  <td>
                                    <span className="leak-cause-badge" title={getPrimaryIssue(i)}>
                                      {getPrimaryIssue(i)}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="profit-leak-empty">
                    <span className="profit-leak-empty-amount">0</span>
                    <span className="profit-leak-empty-text">
                      Items below target this period — no profit leaks detected.
                    </span>
                  </div>
                )}
              </div>
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
                        <strong>At a glance:</strong> Your best contributors (green) are {topNames || '—'}. {watchNames ? `Watch: ${watchNames} — raise prices, shrink portions slightly, or reduce cost to hit target margin.` : 'Most items are at or above target margin.'}
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
                                    {belowTarget && s.caution && <span className="badge badge-warn" title="Large price gap = selling at significant loss">Selling at significant loss</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="demo-pricing-note">
                        Per-item target margin when set in recipe builder; otherwise default {(marginGoal * 100).toFixed(0)}%. <strong>Below target:</strong> suggested price and % increase to get there (volume unchanged). Shrinking portions slightly can also help bridge gaps without raising prices. <strong>At/above target:</strong> no change; &quot;Above by X%&quot; = margin above target. Large suggested increases mean you&apos;re selling at a significant loss — those items are flagged.
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
              <span>Margin Insights — free margin insights from your own data.</span>
            </footer>
          </div>
        </>
      )}
        </main>
      </div>
    </div>
  );
};

const DashboardFallback = () => (
  <div className="landing demo-page">
    <DashboardHeader slug="demo" />
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
