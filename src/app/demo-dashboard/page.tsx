'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SalesRecord } from '@/insight-engine/models/SalesRecord';
import type { Ingredient } from '@/insight-engine/models/Ingredient';
import type { Recipe } from '@/insight-engine/models/Recipe';
import {
  demoSalesRecords,
  buildDemoIngredientsAndRecipes,
  demoMarginGoal,
  demoMenuPrices,
} from '@/data/demoData';
import { costPerServing } from '@/insight-engine/services/costCalculator';
import { computeMargins, type ItemMarginRow } from '@/insight-engine/services/marginEngine';
import { suggestPrice } from '@/insight-engine/services/pricingEngine';
import { runQuadrantAnalysis } from '@/insight-engine/services/quadrantAnalysis';
import { buildProfitLeakReport } from '@/insight-engine/reports/profitLeakReport';
import { QuadrantChart, getQuadrantInsight } from './QuadrantChart';
import { ContributionBarChart, LostProfitBarChart, MarginRealityRadar, RevenueDonut } from './Charts';

const uid = () => Math.random().toString(36).slice(2, 11);

const DashboardPage = () => {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [demoError, setDemoError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [sortKey, setSortKey] = useState<keyof ItemMarginRow>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState<'margins' | 'leaks' | 'pricing' | 'quadrant'>('leaks');
  const [marginGoal, setMarginGoal] = useState(demoMarginGoal);
  const [menuPrices, setMenuPrices] = useState<Record<string, number>>(() => ({ ...demoMenuPrices }));
  /** Per-item target margin (decimal). When missing, use default marginGoal. */
  const [menuMarginGoal, setMenuMarginGoal] = useState<Record<string, number>>({});

  const startDemo = useCallback(() => {
    setDemoError(null);
    try {
      setSalesRecords(demoSalesRecords);
      const { ingredients: demoIngredients, recipes: demoRecipes } = buildDemoIngredientsAndRecipes();
      setIngredients(demoIngredients);
      setRecipes(demoRecipes);
      setMarginGoal(demoMarginGoal);
      setMenuPrices({ ...demoMenuPrices });
      setMenuMarginGoal({});
    } catch (e) {
      setDemoError('Could not load demo data.');
    }
  }, []);

  useEffect(() => {
    startDemo();
  }, [startDemo]);

  const uniqueItemNames = useMemo(() => {
    const set = new Set(salesRecords.map((r) => r.item_name.trim()));
    return Array.from(set).sort();
  }, [salesRecords]);

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

  return (
    <div className="dashboard">
      <Link href="/" className="link-home">← Back to home</Link>
      <h1>Demo dashboard</h1>

      <section className="dashboard-section dashboard-section-compact">
        {demoError && <p style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>{demoError}</p>}
        {salesRecords.length > 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Using sample data: {salesRecords.length} sales records, {uniqueItemNames.length} unique items.
          </p>
        )}
      </section>

      {salesRecords.length > 0 && (
        <>
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
                  <h3 className="profit-leak-hero-title">Where your money is leaking</h3>
                  {leakReport.items.length > 0 ? (
                    <>
                      <p className="profit-leak-hero-p">
                        Right now you're leaving about <strong>${leakReport.summary.estimated_lost_profit_per_month.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> on the table every month — that's how much more you'd make if those items were priced to hit your {(marginGoal * 100).toFixed(0)}% target margin. {leakReport.summary.bottom_margin_skus} menu items are below target; you're selling them but not keeping enough of what you make.
                      </p>
                      <p className="profit-leak-hero-p">
                        The numbers don't lie: the same figures you see in your <strong>Margins</strong> tab (revenue, cost per serving, margin %) add up to this leak. Below are the exact items and what we estimate you'd gain per month if you raised prices to hit your target. You can check the <strong>Price suggestions</strong> tab for the recommended price per item.
                      </p>
                      {leakReport.summary.strategic_candidate_count > 0 && (
                        <p className="profit-leak-hero-p">
                          Some of these are <strong>high-volume, low-margin</strong> items — they might be intentional loss leaders (e.g. drinks or sides that bring people in who then buy higher-margin items). We flag those separately so you can decide: fix the price or keep them as traffic drivers.
                        </p>
                      )}
                      {leakReport.items.length > 0 && (
                        <p className="profit-leak-hero-p profit-leak-hero-culprits">
                          Biggest culprits: <strong>{leakReport.items.slice(0, 3).map((i) => `${i.item_name} ($${i.estimated_lost_profit_per_month.toFixed(0)}/mo)`).join(', ')}</strong>.
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="profit-leak-hero-p">
                      No bottom-margin items in this period — your lowest-margin items are still above the threshold we use to flag leaks. Check the <strong>Margins</strong> and <strong>Quadrant</strong> views to see how everything stacks up.
                    </p>
                  )}
                </div>
                {leakReport.items.length > 0 && (leakReport.summary.items_to_fix_count > 0 || leakReport.summary.strategic_candidate_count > 0) && (
                  <div className="leak-high-level" aria-label="High-level picture of profit leak">
                    <h4 className="leak-high-level-title">High-level picture</h4>
                    <div className="leak-high-level-grid">
                      <div className="leak-high-level-card leak-high-level-fix">
                        <span className="leak-high-level-value">${leakReport.summary.lost_from_items_to_fix.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="leak-high-level-label">
                          from {leakReport.summary.items_to_fix_count} item{leakReport.summary.items_to_fix_count !== 1 ? 's' : ''} to fix
                          {(() => {
                            const toFixItems = leakReport.items.filter((i) => i.role === 'to_fix');
                            const names = toFixItems.map((i) => i.item_name);
                            if (names.length === 0) return null;
                            if (names.length <= 3) return <>: <strong>{names.join(', ')}</strong></>;
                            return <>: <strong>{names.slice(0, 2).join(', ')} and {names.length - 2} more</strong></>;
                          })()}
                        </span>
                        <span className="leak-high-level-desc">Raise prices to capture this; no strategic reason to keep these low.</span>
                      </div>
                      <div className="leak-high-level-card leak-high-level-strategic">
                        <span className="leak-high-level-value">${leakReport.summary.lost_from_strategic_candidates.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="leak-high-level-label">
                          from {leakReport.summary.strategic_candidate_count} possible loss leader{leakReport.summary.strategic_candidate_count !== 1 ? 's' : ''}
                          {(() => {
                            const strategicItems = leakReport.items.filter((i) => i.role === 'strategic_candidate');
                            const names = strategicItems.map((i) => i.item_name);
                            if (names.length === 0) return null;
                            if (names.length <= 3) return <>: <strong>{names.join(', ')}</strong></>;
                            return <>: <strong>{names.slice(0, 2).join(', ')} and {names.length - 2} more</strong></>;
                          })()}
                        </span>
                        <span className="leak-high-level-desc">High volume, low margin — OK if they bring in customers who buy high-margin items; otherwise consider raising.</span>
                      </div>
                    </div>
                  </div>
                )}
                {leakReport.items.length > 0 && (
                  <>
                    <div className="actionable-strip">
                      <strong>Do this:</strong>{' '}
                      {leakReport.summary.items_to_fix_count > 0
                        ? `Raise prices on the ${leakReport.summary.items_to_fix_count} "to fix" item${leakReport.summary.items_to_fix_count !== 1 ? 's' : ''} below to capture about $${leakReport.summary.lost_from_items_to_fix.toFixed(0)}/month.`
                        : 'Review the items below.'}
                      {leakReport.summary.strategic_candidate_count > 0 && (
                        <> The {leakReport.summary.strategic_candidate_count} possible loss leader{leakReport.summary.strategic_candidate_count !== 1 ? 's' : ''} are flagged — keep them low only if they drive other sales.</>
                      )}
                      {' '}Use the <strong>Price suggestions</strong> tab for exact numbers.
                    </div>
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
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
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

          {/* Raw data: one collapsible at the bottom */}
          <section className="dashboard-section collapsible raw-data-section">
            <details>
              <summary>Wanna mess with the raw data and see the charts change?</summary>
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
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={marginGoal * 100}
                      onChange={(e) => setMarginGoal(Math.max(0, Math.min(1, (parseFloat(e.target.value) || 0) / 100)))}
                      style={{ width: '5rem' }}
                    />
                  </div>
                </div>
                <div className="sub-section">
                  <h3>Ingredients ({ingredients.length})</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    Add ingredients with cost per unit. Then assign them to menu items in Recipe builder.
                  </p>
                  {ingredients.map((ing) => (
                    <div key={ing.id} className="form-row">
                      <input placeholder="Name" value={ing.name} onChange={(e) => updateIngredient(ing.id, { name: e.target.value })} />
                      <select value={ing.unit_type} onChange={(e) => updateIngredient(ing.id, { unit_type: e.target.value as Ingredient['unit_type'] })}>
                        <option value="oz">oz</option>
                        <option value="ml">ml</option>
                        <option value="grams">grams</option>
                        <option value="count">count</option>
                        <option value="lb">lb</option>
                        <option value="each">each</option>
                      </select>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>$</span>
                        <input type="number" step="0.01" min={0} placeholder="0.00" value={ing.cost_per_unit || ''} onChange={(e) => updateIngredient(ing.id, { cost_per_unit: parseFloat(e.target.value) || 0 })} style={{ width: '5rem' }} />
                      </span>
                      <button type="button" className="btn btn-secondary" onClick={() => removeIngredient(ing.id)}>Remove</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-primary" onClick={addIngredient}>+ Add ingredient</button>
                </div>
                <div className="sub-section">
                  <h3>Recipe builder (price &amp; margin per item)</h3>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    For each menu item, add ingredients and quantity per serving. Set price and target margin per item (or use the default margin from above).
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {uniqueItemNames.slice(0, 30).map((name) => {
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
                            type="number"
                            min={0}
                            step={0.5}
                            value={name in menuPrices ? menuPrices[name] : ''}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === '') {
                                setMenuPrices((p) => {
                                  const next = { ...p };
                                  delete next[name];
                                  return next;
                                });
                                return;
                              }
                              setMenuPrices((p) => ({ ...p, [name]: parseFloat(raw) || 0 }));
                            }}
                            placeholder="0"
                            aria-label={`Price for ${name}`}
                          />
                        </label>
                        <label>
                          <span>Target</span>
                          <input
                            type="number"
                            className="recipe-builder-target-input"
                            min={0}
                            max={100}
                            step={1}
                            value={menuMarginGoal[name] != null ? Math.round(menuMarginGoal[name] * 100) : ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === '') {
                                setMenuMarginGoal((m) => {
                                  const next = { ...m };
                                  delete next[name];
                                  return next;
                                });
                                return;
                              }
                              const pct = Math.max(0, Math.min(100, parseFloat(v) || 0));
                              setMenuMarginGoal((m) => ({ ...m, [name]: pct / 100 }));
                            }}
                            placeholder={String(Math.round(marginGoal * 100))}
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
              })}
              {uniqueItemNames.length > 30 && <p style={{ color: 'var(--text-muted)' }}>Showing first 30 items. Add recipes for the rest the same way.</p>}
                  </div>
                </div>
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
