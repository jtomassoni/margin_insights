'use client';

/**
 * Liquor Variance — "Bought vs Sold" tracker for bars.
 * Simple view: quick calculation. Advanced view: drinks from sales + manual entries.
 * Requires at least one cost snapshot. Only drink items (marked in Menu & Recipes) are included.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDashboardData } from '@/context/DashboardDataContext';
import { getRecipeLiquorData } from '@/insight-engine/utils/recipeLiquor';

interface LiquorVarianceEntry {
  id: string;
  start_date: string;
  end_date: string;
  item_name: string;
  bought_bottles: number;
  sold_bottles: number;
  begin_on_hand_bottles: number | null;
  end_on_hand_bottles: number | null;
  created_at: string;
}

interface ComputedEntry extends LiquorVarianceEntry {
  variance_bottles: number;
  variance_pct: number;
  used?: number;
}

function computeVariance(e: LiquorVarianceEntry): ComputedEntry {
  let variance_bottles: number;
  let used: number | undefined;

  if (e.begin_on_hand_bottles != null && e.end_on_hand_bottles != null) {
    used = e.begin_on_hand_bottles + e.bought_bottles - e.end_on_hand_bottles;
    variance_bottles = used - e.sold_bottles;
  } else {
    variance_bottles = e.bought_bottles - e.sold_bottles;
  }

  const denom = used != null ? Math.max(used, 1) : Math.max(e.bought_bottles, 1);
  const variance_pct = (variance_bottles / denom) * 100;

  return { ...e, variance_bottles, variance_pct, used };
}

const BIG_VARIANCE_PCT = 15;
const DEFAULT_POUR_OZ = 2;
const DEFAULT_BOTTLE_OZ = 25.4; // 750ml

type ViewMode = 'simple' | 'advanced';

interface CostSnapshot {
  id: string;
  name: string;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

function getDateRangeForPreset(preset: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  switch (preset) {
    case 'current-month': {
      const start = `${y}-${pad(m + 1)}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
      return { start, end };
    }
    case 'last-month': {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const start = `${ly}-${pad(lm + 1)}-01`;
      const lastDay = new Date(ly, lm + 1, 0).getDate();
      const end = `${ly}-${pad(lm + 1)}-${pad(lastDay)}`;
      return { start, end };
    }
    case 'last-7-days': {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return {
        start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
      };
    }
    case 'last-30-days': {
      const end = new Date(now);
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return {
        start: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
        end: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
      };
    }
    default:
      return { start: '', end: '' };
  }
}

function getDateRangeForSnapshot(snapshot: CostSnapshot): { start: string; end: string } {
  if (snapshot.start_date && snapshot.end_date) {
    const startD = new Date(snapshot.start_date);
    const endD = new Date(snapshot.end_date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      start: `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-${pad(startD.getDate())}`,
      end: `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`,
    };
  }
  const created = new Date(snapshot.created_at);
  const y = created.getFullYear();
  const m = created.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const start = `${y}-${pad(m + 1)}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
  return { start, end };
}

function aggregateSalesByItem(
  records: { item_name: string; units_sold: number; timestamp?: string }[],
  startDate?: string,
  endDate?: string
): Map<string, number> {
  const map = new Map<string, number>();
  const hasDateFilter = startDate && endDate;
  const start = hasDateFilter ? new Date(startDate + 'T00:00:00').getTime() : 0;
  const end = hasDateFilter ? new Date(endDate + 'T23:59:59').getTime() : Infinity;
  const recordsWithTimestamp = records.filter((r) => r.timestamp);

  records.forEach((r) => {
    if (hasDateFilter && recordsWithTimestamp.length > 0) {
      if (!r.timestamp) return;
      const t = new Date(r.timestamp).getTime();
      if (t < start || t > end) return;
    }
    const key = r.item_name.trim();
    map.set(key, (map.get(key) ?? 0) + r.units_sold);
  });
  return map;
}

export default function LiquorVarianceTab() {
  const {
    salesRecords,
    menuItemIsDrink,
    uniqueItemNames,
    recipes,
    ingredients,
    menuItemPourOz,
    setMenuItemPourOz,
    menuItemBottleOz,
    setMenuItemBottleOz,
  } = useDashboardData();
  const [viewMode, setViewMode] = useState<ViewMode>('simple');
  const [entries, setEntries] = useState<LiquorVarianceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => getDateRangeForPreset('current-month').start);
  const [endDate, setEndDate] = useState(() => getDateRangeForPreset('current-month').end);
  const [itemName, setItemName] = useState('');
  const [boughtBottles, setBoughtBottles] = useState('');
  const [soldBottles, setSoldBottles] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [snapshots, setSnapshots] = useState<CostSnapshot[]>([]);
  const [drinkBought, setDrinkBought] = useState<Record<string, string>>({});
  const [drinkCounted, setDrinkCounted] = useState<Record<string, string>>({});

  const drinkItems = useMemo(
    () => uniqueItemNames.filter((name) => menuItemIsDrink[name]),
    [uniqueItemNames, menuItemIsDrink]
  );
  const salesByItem = useMemo(
    () => aggregateSalesByItem(salesRecords, startDate, endDate),
    [salesRecords, startDate, endDate]
  );

  const recipeByItem = useMemo(
    () => new Map(recipes.map((r) => [r.menu_item_name, r])),
    [recipes]
  );
  const recipeLiquorByItem = useMemo(() => {
    const map = new Map<string, ReturnType<typeof getRecipeLiquorData>>();
    drinkItems.forEach((name) => {
      map.set(name, getRecipeLiquorData(recipeByItem.get(name), ingredients));
    });
    return map;
  }, [drinkItems, recipeByItem, ingredients]);

  const loadSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/cost-snapshots');
      if (!res.ok) return;
      const data = await res.json();
      setSnapshots(Array.isArray(data) ? data : []);
    } catch {
      setSnapshots([]);
    }
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const url = params.toString() ? `/api/liquor-variance?${params}` : '/api/liquor-variance';
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  useEffect(() => {
    if (viewMode === 'advanced') loadEntries();
  }, [viewMode, loadEntries, startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const s = startDate.trim();
    const end = endDate.trim();
    const name = itemName.trim();
    const bought = parseInt(boughtBottles, 10);
    const sold = parseInt(soldBottles, 10);
    if (!s || !end || !name || isNaN(bought) || isNaN(sold)) {
      setError('Fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/liquor-variance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_date: s,
          end_date: end,
          item_name: name,
          bought_bottles: bought,
          sold_bottles: sold,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setItemName('');
      setBoughtBottles('');
      setSoldBottles('');
      loadEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const drinkEntries = useMemo(
    () => entries.filter((e) => menuItemIsDrink[e.item_name]),
    [entries, menuItemIsDrink]
  );

  // Merge saved entries with sales-based drinks for unified variance view
  const allVarianceRows = useMemo(() => {
    const byItem = new Map<
      string,
      { item_name: string; bought: number; sold: number; variance_bottles: number; variance_pct: number; source: 'saved' | 'sales' }
    >();

    // Add saved entries (drinks only) — use computed variance when begin/end on hand exist
    drinkEntries.forEach((e) => {
      const c = computeVariance(e);
      byItem.set(e.item_name, {
        item_name: e.item_name,
        bought: e.bought_bottles,
        sold: e.sold_bottles,
        variance_bottles: c.variance_bottles,
        variance_pct: c.variance_pct,
        source: 'saved',
      });
    });

    // Add/override with sales-based drinks — convert drinks to bottles using oz/drink and oz/bottle
    drinkItems.forEach((name) => {
      const drinksSold = salesByItem.get(name) ?? 0;
      const recipeData = recipeLiquorByItem.get(name);
      const pourOz =
        menuItemPourOz[name] ?? recipeData?.ozPerDrink ?? DEFAULT_POUR_OZ;
      const bottleOz =
        menuItemBottleOz[name] ?? recipeData?.bottleOz ?? DEFAULT_BOTTLE_OZ;
      const bottlesUsed =
        bottleOz > 0 && drinksSold > 0 ? (drinksSold * pourOz) / bottleOz : 0;
      const boughtRaw = drinkBought[name] ?? '';
      const bought = parseFloat(boughtRaw) || 0;
      if (drinksSold > 0 || bought > 0) {
        const variance_bottles = bought - bottlesUsed;
        const denom = Math.max(bought, bottlesUsed, 0.01);
        byItem.set(name, {
          item_name: name,
          bought,
          sold: bottlesUsed,
          variance_bottles,
          variance_pct: (variance_bottles / denom) * 100,
          source: 'sales',
        });
      }
    });

    return Array.from(byItem.values())
      .filter((r) => r.bought > 0 || r.sold > 0)
      .sort((a, b) => Math.abs(b.variance_bottles) - Math.abs(a.variance_bottles));
  }, [drinkEntries, drinkItems, drinkBought, salesByItem, menuItemPourOz, menuItemBottleOz, recipeLiquorByItem]);

  const totalVarianceBottles = allVarianceRows.reduce((s, r) => s + r.variance_bottles, 0);
  const totalDenom = allVarianceRows.reduce(
    (s, r) => s + Math.max(r.bought, r.sold, 1),
    0
  );
  const totalVariancePct =
    totalDenom > 0 ? (totalVarianceBottles / totalDenom) * 100 : 0;

  // Simple view: bought vs sold, instant calculation
  const simpleBought = parseInt(boughtBottles, 10) || 0;
  const simpleSold = parseInt(soldBottles, 10) || 0;
  const simpleVariance = simpleBought - simpleSold;
  const simpleDenom = Math.max(simpleBought, 1);
  const simpleVariancePct = (simpleVariance / simpleDenom) * 100;

  const hasSnapshot = snapshots.length > 0;

  return (
    <div className="liquor-variance-tab">
      {!hasSnapshot && (
        <div className="liquor-variance-require-snapshot">
          <p>
            <strong>Create a cost snapshot first</strong> to use liquor variance.
            Snapshots establish your reporting period and cost baseline. Use the
            Create cost snapshot button in the header.
          </p>
        </div>
      )}

      {hasSnapshot && (
        <>
          <div className="liquor-variance-mode-toggle">
            <button
              type="button"
              className={viewMode === 'simple' ? 'active' : ''}
              onClick={() => setViewMode('simple')}
            >
              Simple
            </button>
            <button
              type="button"
              className={viewMode === 'advanced' ? 'active' : ''}
              onClick={() => setViewMode('advanced')}
            >
              Advanced
            </button>
          </div>

          {viewMode === 'simple' && (
            <div className="liquor-variance-simple">
              <p className="liquor-variance-simple-desc">
                How many bottles did you buy, and how many did the POS say you sold?
              </p>
              <div className="liquor-variance-simple-form">
                <label>
                  <span>Item</span>
                  <select
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="liquor-variance-item-select"
                  >
                    <option value="">— Select drink —</option>
                    {drinkItems.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    {drinkItems.length === 0 && (
                      <option value="" disabled>
                        Add drinks in Menu &amp; Recipes first
                      </option>
                    )}
                  </select>
                </label>
                <label>
                  <span>Bought # of 750 bottles</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={boughtBottles}
                    onChange={(e) => setBoughtBottles(e.target.value)}
                  />
                </label>
                <label>
                  <span>Sold (POS)</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={soldBottles}
                    onChange={(e) => setSoldBottles(e.target.value)}
                  />
                </label>
              </div>
              {(simpleBought > 0 || simpleSold > 0) && (
                <div
                  className={`liquor-variance-simple-result ${
                    Math.abs(simpleVariancePct) >= BIG_VARIANCE_PCT
                      ? 'liquor-variance-simple-result--warn'
                      : ''
                  }`}
                >
                  <strong>Variance:</strong> {simpleVariance} bottles (
                  {simpleVariancePct >= 0 ? '+' : ''}
                  {simpleVariancePct.toFixed(1)}%)
                  {itemName.trim() && (
                    <span className="liquor-variance-simple-item"> — {itemName.trim()}</span>
                  )}
                  {Math.abs(simpleVariancePct) >= BIG_VARIANCE_PCT && (
                    <p className="liquor-variance-simple-hint">
                      Possible overpour, comps, or shrink. Track in Advanced view to save history.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {viewMode === 'advanced' && (
            <>
              {/* Period first — everything is time-bound */}
              <div className="liquor-variance-period-section">
                <h4 className="liquor-variance-period-title">Reporting period</h4>
                <p className="liquor-variance-period-desc">
                  All numbers below are for this period. POS sales are filtered by these dates (when your sales data includes timestamps).
                </p>
                <div className="liquor-variance-date-presets">
                  <span className="liquor-variance-date-presets-label">Period:</span>
                  <button
                    type="button"
                    className="liquor-variance-preset-btn"
                    onClick={() => {
                      const { start, end } = getDateRangeForPreset('current-month');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  >
                    Current month
                  </button>
                  <button
                    type="button"
                    className="liquor-variance-preset-btn"
                    onClick={() => {
                      const { start, end } = getDateRangeForPreset('last-month');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  >
                    Last month
                  </button>
                  <button
                    type="button"
                    className="liquor-variance-preset-btn"
                    onClick={() => {
                      const { start, end } = getDateRangeForPreset('last-7-days');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    className="liquor-variance-preset-btn"
                    onClick={() => {
                      const { start, end } = getDateRangeForPreset('last-30-days');
                      setStartDate(start);
                      setEndDate(end);
                    }}
                  >
                    Last 30 days
                  </button>
                </div>
                {snapshots.length > 0 && (
                  <div className="liquor-variance-snapshot-select">
                    <label>
                      <span>From cost snapshot:</span>
                      <select
                        value=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) return;
                          const snap = snapshots.find((s) => s.id === id);
                          if (snap) {
                            const { start, end } = getDateRangeForSnapshot(snap);
                            setStartDate(start);
                            setEndDate(end);
                          }
                        }}
                        className="liquor-variance-snapshot-select-input"
                      >
                        <option value="">— Select snapshot —</option>
                        {snapshots.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
                <div className="liquor-variance-form-row">
                  <label>
                    <span>Start date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    <span>End date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                    />
                  </label>
                </div>
              </div>

              {drinkItems.length > 0 && (
                <div className="liquor-variance-drinks-from-sales">
                  <h4 className="liquor-variance-drinks-title">
                    In this period ({startDate} to {endDate}): POS sales → oz → bottles
                  </h4>
                  <p className="liquor-variance-drinks-desc">
                    POS said we sold X drinks. That translates to Y oz of liquor (from recipe oz/drink). Oz ÷ bottle size = bottles used. Enter bottles bought and bottles counted (physical inventory) to reconcile.
                  </p>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Sold (drinks)</th>
                          <th>Oz/drink</th>
                          <th>Oz/bottle</th>
                          <th>Oz used</th>
                          <th>Bottles used</th>
                          <th>Bought</th>
                          <th>Expected remaining</th>
                          <th>Bottles counted</th>
                          <th>Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drinkItems.map((name) => {
                          const drinksSold = salesByItem.get(name) ?? 0;
                          const recipeData = recipeLiquorByItem.get(name);
                          const pourOz =
                            menuItemPourOz[name] ??
                            recipeData?.ozPerDrink ??
                            DEFAULT_POUR_OZ;
                          const bottleOz =
                            menuItemBottleOz[name] ??
                            recipeData?.bottleOz ??
                            DEFAULT_BOTTLE_OZ;
                          const pourFromRecipe =
                            menuItemPourOz[name] == null &&
                            (recipeData?.fromRecipe ?? false);
                          const bottleFromRecipe =
                            menuItemBottleOz[name] == null &&
                            (recipeData?.fromRecipe ?? false);
                          const totalOz = drinksSold * pourOz;
                          const bottlesUsed =
                            bottleOz > 0 ? totalOz / bottleOz : 0;
                          const boughtRaw = drinkBought[name] ?? '';
                          const bought = parseFloat(boughtRaw) || 0;
                          const expectedRemaining = Math.max(0, bought - bottlesUsed);
                          const countedRaw = drinkCounted[name] ?? '';
                          const counted = parseFloat(countedRaw);
                          const hasCounted = !Number.isNaN(counted) && countedRaw !== '';
                          const variance = hasCounted ? counted - expectedRemaining : null;
                          const variancePct =
                            variance != null && expectedRemaining > 0
                              ? (variance / expectedRemaining) * 100
                              : null;
                          return (
                            <tr key={name}>
                              <td>{name}</td>
                              <td className="num">{drinksSold}</td>
                              <td>
                                {pourFromRecipe ? (
                                  <span
                                    className="liquor-variance-from-recipe"
                                    title="From recipe (qty × unit cost)"
                                  >
                                    {pourOz.toFixed(1)}
                                    <button
                                      type="button"
                                      className="liquor-variance-override-btn"
                                      onClick={() =>
                                        setMenuItemPourOz((p) => ({
                                          ...p,
                                          [name]: pourOz,
                                        }))
                                      }
                                      aria-label={`Override oz/drink for ${name}`}
                                    >
                                      ✎
                                    </button>
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min={0.1}
                                    step={0.25}
                                    placeholder={String(pourOz)}
                                    value={
                                      menuItemPourOz[name] !== undefined
                                        ? String(menuItemPourOz[name])
                                        : ''
                                    }
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (!Number.isNaN(v) && v > 0) {
                                        setMenuItemPourOz((prev) => ({
                                          ...prev,
                                          [name]: v,
                                        }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (Number.isNaN(v) || v <= 0) {
                                        setMenuItemPourOz((prev) => {
                                          const next = { ...prev };
                                          delete next[name];
                                          return next;
                                        });
                                      }
                                    }}
                                    className="liquor-variance-oz-input"
                                    aria-label={`Oz per drink for ${name}`}
                                  />
                                )}
                              </td>
                              <td>
                                {bottleFromRecipe ? (
                                  <span
                                    className="liquor-variance-from-recipe"
                                    title="From recipe (ingredient bottle size)"
                                  >
                                    {bottleOz.toFixed(1)}
                                    <button
                                      type="button"
                                      className="liquor-variance-override-btn"
                                      onClick={() =>
                                        setMenuItemBottleOz((p) => ({
                                          ...p,
                                          [name]: bottleOz,
                                        }))
                                      }
                                      aria-label={`Override oz/bottle for ${name}`}
                                    >
                                      ✎
                                    </button>
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    min={0.1}
                                    step={0.1}
                                    placeholder={String(bottleOz)}
                                    value={
                                      menuItemBottleOz[name] !== undefined
                                        ? String(menuItemBottleOz[name])
                                        : ''
                                    }
                                    onChange={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (!Number.isNaN(v) && v > 0) {
                                        setMenuItemBottleOz((prev) => ({
                                          ...prev,
                                          [name]: v,
                                        }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const v = parseFloat(e.target.value);
                                      if (Number.isNaN(v) || v <= 0) {
                                        setMenuItemBottleOz((prev) => {
                                          const next = { ...prev };
                                          delete next[name];
                                          return next;
                                        });
                                      }
                                    }}
                                    className="liquor-variance-oz-input"
                                    aria-label={`Oz per bottle for ${name}`}
                                  />
                                )}
                              </td>
                              <td className="num" title="Drinks sold × oz/drink">
                                {drinksSold > 0 ? totalOz.toFixed(1) : '—'}
                              </td>
                              <td className="num" title={`${totalOz.toFixed(1)} oz ÷ ${bottleOz} oz`}>
                                {drinksSold > 0 ? bottlesUsed.toFixed(2) : '—'}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  placeholder="0"
                                  value={drinkBought[name] ?? ''}
                                  onChange={(e) =>
                                    setDrinkBought((prev) => ({
                                      ...prev,
                                      [name]: e.target.value,
                                    }))
                                  }
                                  className="liquor-variance-bought-input"
                                  aria-label={`Bottles bought in period for ${name}`}
                                />
                              </td>
                              <td className="num" title="Bought − bottles used = what should remain">
                                {boughtRaw !== '' && drinksSold > 0
                                  ? expectedRemaining.toFixed(2)
                                  : boughtRaw !== ''
                                    ? bought.toFixed(2)
                                    : '—'}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.5}
                                  placeholder="Count"
                                  value={drinkCounted[name] ?? ''}
                                  onChange={(e) =>
                                    setDrinkCounted((prev) => ({
                                      ...prev,
                                      [name]: e.target.value,
                                    }))
                                  }
                                  className="liquor-variance-bought-input"
                                  aria-label={`Bottles counted (physical inventory) for ${name}`}
                                  title="Physical count — how many bottles did you actually have?"
                                />
                              </td>
                              <td className="num">
                                {hasCounted && variance != null ? (
                                  <span
                                    className={
                                      Math.abs(variancePct ?? 0) >= BIG_VARIANCE_PCT
                                        ? 'liquor-variance-cell-warn'
                                        : ''
                                    }
                                    title="Counted − expected. Negative = less than expected (possible overpour/shrink)"
                                  >
                                    {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                                    {variancePct != null && expectedRemaining > 0
                                      ? ` (${variance >= 0 ? '+' : ''}${variancePct.toFixed(1)}%)`
                                      : ''}
                                  </span>
                                ) : (
                                  <span className="liquor-variance-cell-muted" title="Enter bottles counted to see variance">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="liquor-variance-form">
        <h4 className="liquor-variance-form-title">Manual entry (optional)</h4>
        <div className="liquor-variance-form-row">
          <label>
            <span>Item</span>
            <select
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
              className="liquor-variance-item-select"
            >
              <option value="">— Select drink —</option>
              {drinkItems.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {drinkItems.length === 0 && (
                <option value="" disabled>
                  Add drinks in Menu &amp; Recipes first
                </option>
              )}
            </select>
          </label>
        </div>
        <div className="liquor-variance-form-row">
          <label>
            <span>Bought # of 750 bottles</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={boughtBottles}
              onChange={(e) => setBoughtBottles(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Sold bottles</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={soldBottles}
              onChange={(e) => setSoldBottles(e.target.value)}
              required
            />
          </label>
        </div>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add entry'}
        </button>
      </form>

      {error && (
        <div className="liquor-variance-error" role="alert">
          {error}
        </div>
      )}

      {allVarianceRows.length > 0 && (
        <>
          <div className="liquor-variance-callout">
            <strong>Variance detected:</strong> {totalVarianceBottles} bottles (
            {totalVariancePct.toFixed(1)}%)
            {allVarianceRows.some((r) => r.source === 'sales') && (
              <span className="liquor-variance-callout-note">
                {' '}
                — includes Sales data
              </span>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Bought # of 750 bottles</th>
                  <th>Sold</th>
                  <th>Variance (bottles)</th>
                  <th>Variance %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allVarianceRows.map((r) => (
                  <tr key={r.item_name}>
                    <td>{r.item_name}</td>
                    <td className="num">{r.bought}</td>
                    <td className="num">{r.sold}</td>
                    <td className="num">{r.variance_bottles}</td>
                    <td className="num">{r.variance_pct.toFixed(1)}%</td>
                    <td>
                      {Math.abs(r.variance_pct) >= BIG_VARIANCE_PCT && (
                        <span
                          className="badge badge-warn"
                          title="Possible overpour, comps, or shrink"
                        >
                          Potential overpour/comps/shrink
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!loading && drinkEntries.length === 0 && drinkItems.length === 0 && (
        <p className="liquor-variance-empty">
          No drink items yet. Mark items as &quot;Drink&quot; in Menu &amp; Recipes, then add sales data.
        </p>
      )}
      {!loading && drinkEntries.length === 0 && drinkItems.length > 0 && (
        <p className="liquor-variance-empty">
          Enter # of 750 bottles bought for each drink above, or add manual entries below.
        </p>
      )}
            </>
          )}
        </>
      )}
    </div>
  );
}
