'use client';

/**
 * Liquor Variance — simple "Bought vs Sold" tracker for bars.
 * See docs/living-todo.md. Not full inventory; manual input only.
 */
import { useCallback, useEffect, useState } from 'react';

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

export default function LiquorVarianceTab() {
  const [entries, setEntries] = useState<LiquorVarianceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [itemName, setItemName] = useState('');
  const [boughtBottles, setBoughtBottles] = useState('');
  const [soldBottles, setSoldBottles] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/liquor-variance');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

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

  const computed = entries.map(computeVariance);
  const totalVarianceBottles = computed.reduce((s, c) => s + c.variance_bottles, 0);
  const totalVariancePct =
    computed.length > 0
      ? (totalVarianceBottles /
          Math.max(
            computed.reduce((s, c) => s + (c.used ?? c.bought_bottles), 0),
            1
          )) *
        100
      : 0;

  return (
    <div className="liquor-variance-tab">
      <form onSubmit={handleSubmit} className="liquor-variance-form">
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
        <div className="liquor-variance-form-row">
          <label>
            <span>Item name</span>
            <input
              type="text"
              placeholder="e.g. Tito&apos;s Vodka 750ml"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="liquor-variance-form-row">
          <label>
            <span>Bought bottles</span>
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

      {computed.length > 0 && (
        <>
          <div className="liquor-variance-callout">
            <strong>Variance detected:</strong> {totalVarianceBottles} bottles (
            {totalVariancePct.toFixed(1)}%)
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Bought</th>
                  <th>Sold</th>
                  <th>Variance (bottles)</th>
                  <th>Variance %</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {computed.map((c) => (
                  <tr key={c.id}>
                    <td>{c.item_name}</td>
                    <td className="num">{c.bought_bottles}</td>
                    <td className="num">{c.sold_bottles}</td>
                    <td className="num">{c.variance_bottles}</td>
                    <td className="num">{c.variance_pct.toFixed(1)}%</td>
                    <td>
                      {Math.abs(c.variance_pct) >= BIG_VARIANCE_PCT && (
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

      {!loading && entries.length === 0 && (
        <p className="liquor-variance-empty">
          No entries yet. Add items above to track bought vs sold variance.
        </p>
      )}
    </div>
  );
}
