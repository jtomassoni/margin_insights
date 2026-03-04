'use client';

/**
 * Snapshot insights — seasonal sales patterns, cost trends.
 */
import { useCallback, useEffect, useState } from 'react';

/** Shorten "Jan 2026 – Feb 2026" to "Jan–Feb" for mobile */
function formatPeriodShort(period: string): string {
  return period.replace(/\s*\d{4}\s*/g, '').replace(/\s+/g, ' ').trim() || period;
}

interface SeasonalInsight {
  type: 'seasonal_sales';
  item_name: string;
  period_a: string;
  period_b: string;
  units_a: number;
  units_b: number;
  change_pct: number;
  message: string;
}

interface CostTrendInsight {
  type: 'cost_trend';
  ingredient_name: string;
  period_a: string;
  period_b: string;
  cost_a: number;
  cost_b: number;
  change_pct: number;
  message: string;
}

type SnapshotInsight = SeasonalInsight | CostTrendInsight;

interface InsightsResponse {
  insights: SnapshotInsight[];
  seasonal_count: number;
  cost_trend_count: number;
  has_timestamped_sales: boolean;
  snapshots_with_ranges: number;
}

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

export default function SnapshotInsightsTab() {
  const isMobile = useIsMobile();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/snapshot-insights');
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="snapshot-insights-loading">Loading insights…</p>;
  }

  if (error) {
    return (
      <p className="snapshot-insights-error" role="alert">
        {error}
      </p>
    );
  }

  if (!data) return null;

  const { insights, has_timestamped_sales, snapshots_with_ranges } = data;

  const seasonal = insights.filter((i): i is SeasonalInsight => i.type === 'seasonal_sales');
  const costTrendsRaw = insights.filter((i): i is CostTrendInsight => i.type === 'cost_trend');
  // Deduplicate: same ingredient, same periods, same change
  const seen = new Set<string>();
  const costTrends = costTrendsRaw.filter((i) => {
    const key = `${i.ingredient_name}|${i.period_a}|${i.period_b}|${i.change_pct}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const needsSetup =
    snapshots_with_ranges < 2 ||
    (!has_timestamped_sales && seasonal.length === 0);

  return (
    <div className="snapshot-insights-tab">
      {needsSetup && (
        <div className="snapshot-insights-setup">
          <h4>To get insights</h4>
          <ul>
            {snapshots_with_ranges < 2 && (
              <li>
                Create at least 2 cost snapshots and assign date ranges to them (Manage snapshots tab).
              </li>
            )}
            {!has_timestamped_sales && (
              <li>
                Import sales data with timestamps (e.g. from a POS CSV) to see seasonal sales patterns like &quot;sold more in July vs January&quot;.
              </li>
            )}
          </ul>
        </div>
      )}

      {insights.length === 0 && !needsSetup && (
        <p className="snapshot-insights-empty">
          No significant patterns detected. Add more snapshots with date ranges and timestamped sales to uncover trends.
        </p>
      )}

      {seasonal.length > 0 && (
        <section className="snapshot-insights-section">
          <h4>Seasonal sales</h4>
          <p className="snapshot-insights-section-desc">
            Items that sold noticeably more or less in one period vs another.
          </p>
          <ul className="snapshot-insights-list">
            {seasonal.map((i, idx) => (
              <li key={idx} className="snapshot-insights-item">
                <span className={i.change_pct > 0 ? 'snapshot-insights-up' : 'snapshot-insights-down'}>
                  {i.change_pct > 0 ? '+' : ''}{i.change_pct.toFixed(0)}%
                </span>
                {' '}
                {i.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      {costTrends.length > 0 && (
        <section className="snapshot-insights-section">
          <h4>Cost trends</h4>
          <p className="snapshot-insights-section-desc">
            Ingredients whose cost changed significantly between snapshot periods.
          </p>
          <ul className="snapshot-insights-list snapshot-insights-list--cost">
            {costTrends.map((i, idx) => (
              <li key={idx} className="snapshot-insights-item snapshot-insights-item--cost">
                <span className={i.change_pct > 0 ? 'snapshot-insights-up' : 'snapshot-insights-down'}>
                  {i.change_pct > 0 ? '+' : ''}{i.change_pct.toFixed(0)}%
                </span>
                <div className="snapshot-insights-cost-content">
                  <span className="snapshot-insights-cost-name">{i.ingredient_name}</span>
                  <span className="snapshot-insights-cost-detail">
                    ${i.cost_a.toFixed(2)} → ${i.cost_b.toFixed(2)}
                    <span className="snapshot-insights-cost-period">
                      {isMobile ? `${formatPeriodShort(i.period_a)} → ${formatPeriodShort(i.period_b)}` : `${i.period_a} → ${i.period_b}`}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
