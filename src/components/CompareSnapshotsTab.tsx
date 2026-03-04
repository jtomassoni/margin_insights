'use client';

/**
 * Compare cost snapshots — see how ingredient costs have changed over time.
 */
import { useCallback, useEffect, useState } from 'react';

function useIsMobile(breakpoint = 600) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    setIsMobile(mq.matches);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}
import type { Ingredient } from '@/insight-engine/models/Ingredient';

interface SnapshotSummary {
  id: string;
  name: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  line_count: number;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`;
}

/** Shorter format for mobile: "2/28–3/30" */
function formatDateRangeShort(start: string | null, end: string | null): string {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  return `${s.getMonth() + 1}/${s.getDate()}–${e.getMonth() + 1}/${e.getDate()}`;
}

function snapshotDisplayLabel(s: SnapshotSummary): string {
  const range = formatDateRange(s.start_date, s.end_date);
  return range || s.name;
}

interface SnapshotLine {
  ingredient_id: string;
  ingredient_name: string;
  unit_type: string;
  cost_per_unit: number;
}

interface SnapshotDetail {
  id: string;
  name: string;
  created_at: string;
  start_date: string | null;
  end_date: string | null;
  lines: SnapshotLine[];
}

function formatCreatedAt(created_at: string): string {
  return new Date(created_at).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Shorter format for mobile header: "Mar 3" */
function formatCreatedAtShort(created_at: string): string {
  return new Date(created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function snapshotDetailDisplayLabel(s: SnapshotDetail | null): string {
  if (!s) return 'Loading…';
  const range = formatDateRange(s.start_date, s.end_date);
  return range || s.name;
}

type CompareSource = { type: 'current' } | { type: 'snapshot'; id: string };

function buildCostMap(
  source: CompareSource,
  snapshot: SnapshotDetail | null,
  ingredients: Ingredient[]
): Map<string, { name: string; cost: number }> {
  const map = new Map<string, { name: string; cost: number }>();
  if (source.type === 'current') {
    for (const i of ingredients) {
      map.set(i.id, { name: i.name, cost: i.cost_per_unit });
    }
  } else if (snapshot) {
    for (const l of snapshot.lines) {
      map.set(l.ingredient_id, { name: l.ingredient_name, cost: l.cost_per_unit });
    }
  }
  return map;
}

export default function CompareSnapshotsTab({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceA, setSourceA] = useState<CompareSource>({ type: 'snapshot', id: '' });
  const [sourceB, setSourceB] = useState<CompareSource>({ type: 'current' });
  const [snapshotA, setSnapshotA] = useState<SnapshotDetail | null>(null);
  const [snapshotB, setSnapshotB] = useState<SnapshotDetail | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cost-snapshots');
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSnapshots(data);
      // Default: Compare = most recent snapshot, To = current costs (now)
      if (data.length > 0 && sourceA.type === 'snapshot' && !sourceA.id) {
        setSourceA({ type: 'snapshot', id: data[0].id });
      }
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  const idA = sourceA.type === 'snapshot' ? sourceA.id : null;
  useEffect(() => {
    if (!idA) {
      setSnapshotA(null);
      return;
    }
    setLoadingA(true);
    fetch(`/api/cost-snapshots/${idA}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSnapshotA)
      .catch(() => setSnapshotA(null))
      .finally(() => setLoadingA(false));
  }, [idA]);

  const idB = sourceB.type === 'snapshot' ? sourceB.id : null;
  useEffect(() => {
    if (!idB) {
      setSnapshotB(null);
      return;
    }
    setLoadingB(true);
    fetch(`/api/cost-snapshots/${idB}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSnapshotB)
      .catch(() => setSnapshotB(null))
      .finally(() => setLoadingB(false));
  }, [idB]);

  const mapA = buildCostMap(sourceA, snapshotA, ingredients);
  const mapB = buildCostMap(sourceB, snapshotB, ingredients);

  const isMobile = useIsMobile();
  const labelA = sourceA.type === 'current' ? 'Current costs' : snapshotDetailDisplayLabel(snapshotA);
  const labelB = sourceB.type === 'current' ? 'Current costs' : snapshotDetailDisplayLabel(snapshotB);
  const labelAShort = sourceA.type === 'snapshot' && snapshotA
    ? formatDateRangeShort(snapshotA.start_date, snapshotA.end_date) || 'Snapshot'
    : labelA;
  const labelBShort = sourceB.type === 'snapshot' && snapshotB
    ? formatDateRangeShort(snapshotB.start_date, snapshotB.end_date) || 'Snapshot'
    : labelB;

  const renderSnapshotHeader = (label: string, shortLabel: string, snapshot: SnapshotDetail | null) => {
    const primary = isMobile ? shortLabel : label;
    if (snapshot) {
      return (
        <span className="compare-snapshots-th-content">
          <span className="compare-snapshots-th-primary">{primary}</span>
          {!isMobile && (
            <span className="compare-snapshots-th-sub">Created {formatCreatedAt(snapshot.created_at)}</span>
          )}
          {isMobile && (
            <span className="compare-snapshots-th-sub">{formatCreatedAtShort(snapshot.created_at)}</span>
          )}
        </span>
      );
    }
    return primary;
  };

  const allIds = new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]);
  const rows = Array.from(allIds)
    .map((id) => {
      const a = mapA.get(id);
      const b = mapB.get(id);
      const costA = a?.cost ?? 0;
      const costB = b?.cost ?? 0;
      const change = costB - costA;
      const changePct = costA > 0 ? (change / costA) * 100 : (costB > 0 ? 100 : 0);
      return {
        id,
        name: a?.name ?? b?.name ?? 'Unknown',
        costA,
        costB,
        change,
        changePct,
      };
    })
    .filter((r) => r.costA > 0 || r.costB > 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  const totalA = rows.reduce((s, r) => s + r.costA, 0);
  const totalB = rows.reduce((s, r) => s + r.costB, 0);
  const totalChange = totalB - totalA;
  const totalChangePct = totalA > 0 ? (totalChange / totalA) * 100 : 0;

  const isLoading = loadingA || loadingB;
  const canCompare = !loading && (sourceA.type !== 'snapshot' || snapshotA) && (sourceB.type !== 'snapshot' || snapshotB);
  const hasSnapshots = snapshots.length > 0;

  return (
    <div className="compare-snapshots-tab">
      <div className="compare-snapshots-pickers">
        <label className="compare-snapshots-picker">
          <span className="compare-snapshots-picker-label">Compare</span>
          <select
            aria-label="Compare this period"
            value={sourceA.type === 'current' ? 'current' : sourceA.id}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'current') setSourceA({ type: 'current' });
              else setSourceA({ type: 'snapshot', id: v });
            }}
            className="compare-snapshots-select"
          >
            <option value="current">Current costs</option>
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {snapshotDisplayLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <span className="compare-snapshots-vs">vs</span>
        <label className="compare-snapshots-picker">
          <span className="compare-snapshots-picker-label">To</span>
          <select
            aria-label="To this period"
            value={sourceB.type === 'current' ? 'current' : sourceB.id}
            onChange={(e) => {
              const v = e.target.value;
              if (v === 'current') setSourceB({ type: 'current' });
              else setSourceB({ type: 'snapshot', id: v });
            }}
            className="compare-snapshots-select"
          >
            <option value="current">Current costs</option>
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {snapshotDisplayLabel(s)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!hasSnapshots && !loading && (
        <p className="compare-snapshots-empty">
          No snapshots yet. Create a cost snapshot using the button in the header to compare costs over time.
        </p>
      )}

      {hasSnapshots && canCompare && rows.length > 0 && (
        <>
          <div className={`compare-snapshots-summary ${totalChange > 0 ? 'compare-snapshots-summary--up' : totalChange < 0 ? 'compare-snapshots-summary--down' : ''}`}>
            <span className="compare-snapshots-summary-label">Cost drift</span>
            <span className={`compare-snapshots-summary-value ${totalChange > 0 ? 'compare-snapshots-up' : totalChange < 0 ? 'compare-snapshots-down' : ''}`}>
              {totalChange >= 0 ? '+' : ''}${totalChange.toFixed(2)} ({totalChange >= 0 ? '+' : ''}{totalChangePct.toFixed(1)}%)
            </span>
            <span className="compare-snapshots-summary-context">
              {isMobile ? labelAShort : labelA} → {isMobile ? labelBShort : labelB}
            </span>
          </div>
          <div className="table-wrap compare-snapshots-table-wrap">
            <table className="compare-snapshots-table">
              <thead>
                <tr>
                  <th className="compare-snapshots-th-ingredient">Ingredient</th>
                  <th className="num compare-snapshots-th">
                    {renderSnapshotHeader(labelA, labelAShort, sourceA.type === 'snapshot' ? snapshotA : null)}
                  </th>
                  <th className="num compare-snapshots-th">
                    {renderSnapshotHeader(labelB, labelBShort, sourceB.type === 'snapshot' ? snapshotB : null)}
                  </th>
                  <th className="num compare-snapshots-th-change">Change $</th>
                  <th className="num compare-snapshots-th-change">Change %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="num">${r.costA.toFixed(2)}</td>
                    <td className="num">${r.costB.toFixed(2)}</td>
                    <td className={`num ${r.change > 0 ? 'compare-snapshots-up' : r.change < 0 ? 'compare-snapshots-down' : ''}`}>
                      {r.change >= 0 ? '+' : ''}${r.change.toFixed(2)}
                    </td>
                    <td className={`num ${r.changePct > 0 ? 'compare-snapshots-up' : r.changePct < 0 ? 'compare-snapshots-down' : ''}`}>
                      {r.changePct >= 0 ? '+' : ''}{r.changePct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {hasSnapshots && canCompare && rows.length === 0 && !isLoading && (
        <p className="compare-snapshots-empty">
          No overlapping ingredients to compare. Add ingredients and create snapshots.
        </p>
      )}
    </div>
  );
}
