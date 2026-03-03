'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ContributionBarChart,
  LostProfitBarChart,
  MarginRealityRadar,
  RevenueDonut,
} from '@/app/demo-dashboard/Charts';
import { QuadrantChart, getQuadrantInsight } from '@/app/demo-dashboard/QuadrantChart';
import { suggestPrice } from '@/insight-engine/services/pricingEngine';
import { useDashboardData } from '@/context/DashboardDataContext';
import LiquorVarianceTab from '@/components/LiquorVarianceTab';

const VALID_TABS = ['leaks', 'margins', 'pricing', 'quadrant', 'liquor'] as const;

export default function DashboardReportingPage() {
  const searchParams = useSearchParams();
  const {
    hasAnyMenuItems,
    marginGoal,
    menuMarginGoal,
    marginRowsWithPrices,
    sortedRows,
    leakReport,
    quadrantItems,
    activeTab,
    setActiveTab,
    toggleSort,
  } = useDashboardData();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && VALID_TABS.includes(tab as (typeof VALID_TABS)[number])) {
      setActiveTab(tab as (typeof VALID_TABS)[number]);
    }
  }, [searchParams, setActiveTab]);

  if (!hasAnyMenuItems) {
    return (
      <div className="demo-layout">
        <main className="demo-main">
          <section className="dashboard-section">
            <section className="dashboard-empty">
              <h2>Reporting</h2>
              <p>
                Add your menu items first (what you sell, with price and volume), then define
                ingredients for each. Once you have items with costs and sales volume, the profit leak
                report, margin charts, and price suggestions will appear here.
              </p>
              <div className="dashboard-empty-actions">
                <Link href="/dashboard/ingredients" className="btn btn-primary">
                  Add menu items &amp; recipes
                </Link>
                <Link href="/dashboard" className="btn btn-secondary">
                  Back to overview
                </Link>
              </div>
            </section>
          </section>
        </main>
      </div>
    );
  }

  const targetPct = marginGoal * 100;

  return (
    <div className="demo-layout">
      <main className="demo-main">
        <div className="demo-app-preview">
          <section className="dashboard-section">
            <h2>Margin &amp; profit</h2>
            <div className="tabs">
              <button
                type="button"
                className={activeTab === 'leaks' ? 'active' : ''}
                onClick={() => setActiveTab('leaks')}
              >
                Profit leak report
              </button>
              <button
                type="button"
                className={activeTab === 'margins' ? 'active' : ''}
                onClick={() => setActiveTab('margins')}
              >
                Margins
              </button>
              <button
                type="button"
                className={activeTab === 'pricing' ? 'active' : ''}
                onClick={() => setActiveTab('pricing')}
              >
                Price suggestions
              </button>
              <button
                type="button"
                className={activeTab === 'quadrant' ? 'active' : ''}
                onClick={() => setActiveTab('quadrant')}
              >
                Quadrant
              </button>
              <button
                type="button"
                className={activeTab === 'liquor' ? 'active' : ''}
                onClick={() => setActiveTab('liquor')}
              >
                Liquor variance
              </button>
            </div>

            {activeTab === 'leaks' && (
              <>
                <div className="profit-leak-hero">
                  <h3 className="profit-leak-hero-title">Profit leak</h3>
                  {leakReport.items.length > 0 ? (
                    <div className="leak-stats-grid">
                      <div className="leak-stat">
                        <span className="leak-stat-value">
                          $
                          {leakReport.summary.estimated_lost_profit_per_month.toLocaleString(
                            'en-US',
                            { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                          )}
                        </span>
                        <span className="leak-stat-label">Est. lost per month</span>
                      </div>
                      <div className="leak-stat">
                        <span className="leak-stat-value">
                          {leakReport.summary.bottom_margin_skus}
                        </span>
                        <span className="leak-stat-label">
                          Items below {targetPct.toFixed(0)}% target
                        </span>
                      </div>
                      <div className="leak-stat">
                        <span className="leak-stat-value">
                          {leakReport.items
                            .slice(0, 3)
                            .map(
                              (i) =>
                                `${i.item_name} ($${i.estimated_lost_profit_per_month.toFixed(0)})`
                            )
                            .join(' · ')}
                        </span>
                        <span className="leak-stat-label">Top by lost $</span>
                      </div>
                    </div>
                  ) : (
                    <div className="leak-stats-grid">
                      <div className="leak-stat">
                        <span className="leak-stat-value">0</span>
                        <span className="leak-stat-label">
                          Items below target this period
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                {leakReport.items.length > 0 &&
                  (leakReport.summary.items_to_fix_count > 0 ||
                    leakReport.summary.strategic_candidate_count > 0) && (
                    <div className="leak-high-level" aria-label="Leak breakdown">
                      <div className="leak-high-level-grid">
                        <div className="leak-high-level-card leak-high-level-fix">
                          <span className="leak-high-level-value">
                            $
                            {leakReport.summary.lost_from_items_to_fix.toLocaleString('en-US', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })}
                          </span>
                          <span className="leak-high-level-label">
                            {leakReport.summary.items_to_fix_count} to fix
                            {(() => {
                              const toFixItems = leakReport.items.filter(
                                (i) => i.role === 'to_fix'
                              );
                              const names = toFixItems.map((i) => i.item_name);
                              if (names.length === 0) return null;
                              if (names.length <= 3)
                                return <>: {names.join(', ')}</>;
                              return (
                                <>: {names.slice(0, 2).join(', ')} +{names.length - 2}</>
                              );
                            })()}
                          </span>
                        </div>
                        <div className="leak-high-level-card leak-high-level-strategic">
                          <span className="leak-high-level-value">
                            $
                            {leakReport.summary.lost_from_strategic_candidates.toLocaleString(
                              'en-US',
                              { minimumFractionDigits: 0, maximumFractionDigits: 0 }
                            )}
                          </span>
                          <span className="leak-high-level-label">
                            {leakReport.summary.strategic_candidate_count} possible loss leader
                            {leakReport.summary.strategic_candidate_count !== 1 ? 's' : ''}
                            {(() => {
                              const strategicItems = leakReport.items.filter(
                                (i) => i.role === 'strategic_candidate'
                              );
                              const names = strategicItems.map((i) => i.item_name);
                              if (names.length === 0) return null;
                              if (names.length <= 3)
                                return <>: {names.join(', ')}</>;
                              return (
                                <>: {names.slice(0, 2).join(', ')} +{names.length - 2}</>
                              );
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                {leakReport.items.length > 0 && (
                  <>
                    <p className="leak-next-step">
                      Price suggestions tab → recommended prices per item.
                    </p>
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
                          <td className="num">
                            ${i.estimated_lost_profit_per_month.toFixed(2)}
                          </td>
                          <td>
                            {i.role === 'strategic_candidate' ? (
                              <span
                                className="badge badge-strategic"
                                title="High volume, low margin — may be an intentional loss leader"
                              >
                                Possible loss leader
                              </span>
                            ) : (
                              <span
                                className="badge badge-fix"
                                title="Recommend raising price to hit target margin"
                              >
                                Fix price
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

            {activeTab === 'margins' && (
              <>
                {(() => {
                  const good = sortedRows.filter(
                    (r) =>
                      !Number.isNaN(r.gross_margin_pct) && r.gross_margin_pct >= targetPct
                  );
                  const needAttention = sortedRows.filter(
                    (r) =>
                      !Number.isNaN(r.gross_margin_pct) &&
                      r.gross_margin_pct < targetPct &&
                      r.gross_margin_pct >= targetPct * 0.5
                  );
                  const bad = sortedRows.filter(
                    (r) =>
                      !Number.isNaN(r.gross_margin_pct) &&
                      r.gross_margin_pct < targetPct * 0.5
                  );
                  const topNames = good.slice(0, 3).map((r) => r.item_name).join(', ');
                  const watchNames = [...needAttention, ...bad]
                    .slice(0, 3)
                    .map((r) => r.item_name)
                    .join(', ');
                  return (
                    <>
                      <div className="actionable-strip">
                        <strong>At a glance:</strong> Your best contributors (green) are{' '}
                        {topNames || '—'}.{' '}
                        {watchNames
                          ? `Watch: ${watchNames} — raise prices or reduce cost to hit target margin.`
                          : 'Most items are at or above target margin.'}
                      </div>
                      <div className="dashboard-charts-grid">
                        <ContributionBarChart
                          rows={marginRowsWithPrices}
                          targetMarginPct={targetPct}
                        />
                        <RevenueDonut rows={marginRowsWithPrices} />
                        <MarginRealityRadar
                          rows={marginRowsWithPrices}
                          targetMarginPct={targetPct}
                        />
                      </div>
                      <div className="table-wrap">
                        <table className="sortable">
                          <thead>
                            <tr>
                              <th
                                onClick={() => toggleSort('item_name')}
                                title="Click to sort by item name"
                              >
                                Item
                              </th>
                              <th
                                onClick={() => toggleSort('units_sold')}
                                title="Click to sort by units sold"
                              >
                                Units sold
                              </th>
                              <th
                                onClick={() => toggleSort('revenue')}
                                title="Click to sort by revenue"
                              >
                                Revenue
                              </th>
                              <th
                                onClick={() => toggleSort('cost_per_serving')}
                                title="Click to sort by cost per serving"
                              >
                                Cost/serving
                              </th>
                              <th
                                onClick={() => toggleSort('gross_margin_pct')}
                                title="Click to sort by margin %"
                              >
                                Margin %
                              </th>
                              <th
                                onClick={() => toggleSort('contribution_margin')}
                                title="Click to sort by profit"
                              >
                                Profit
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRows.map((r) => {
                              const marginTier = Number.isNaN(r.gross_margin_pct)
                                ? ''
                                : r.gross_margin_pct >= targetPct
                                  ? 'good'
                                  : r.gross_margin_pct >= targetPct * 0.7
                                    ? 'warn'
                                    : 'bad';
                              return (
                                <tr
                                  key={r.item_name}
                                  className={
                                    marginTier ? `tr-margin-${marginTier}` : ''
                                  }
                                >
                                  <td>{r.item_name}</td>
                                  <td className="num">{r.units_sold}</td>
                                  <td className="num">${r.revenue.toFixed(2)}</td>
                                  <td className="num">
                                    ${r.cost_per_serving.toFixed(2)}
                                  </td>
                                  <td
                                    className={`num ${marginTier ? `td-margin-${marginTier}` : ''}`}
                                  >
                                    {Number.isNaN(r.gross_margin_pct)
                                      ? '—'
                                      : `${r.gross_margin_pct.toFixed(1)}%`}
                                  </td>
                                  <td className="num">
                                    ${r.contribution_margin.toFixed(2)}
                                  </td>
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
                  const pricingRows = marginRowsWithPrices.filter(
                    (r) =>
                      r.cost_per_serving > 0 &&
                      r.price != null &&
                      r.price > 0
                  );
                  const withSuggestion = pricingRows.map((r) => ({
                    row: r,
                    suggestion: suggestPrice(
                      r.cost_per_serving,
                      r.price!,
                      menuMarginGoal[r.item_name] ?? marginGoal
                    ),
                  }));
                  const needRaise = withSuggestion.filter(
                    (x) => x.suggestion.suggested_price > x.suggestion.current_price
                  );
                  const totalGain = needRaise.reduce(
                    (s, x) =>
                      s +
                      (x.suggestion.suggested_price - x.row.price!) *
                        x.row.units_sold,
                    0
                  );
                  const totalGainYear = totalGain * 12;
                  return (
                    <>
                      {needRaise.length > 0 ? (
                        <div className="profit-opportunity-card">
                          <h3 className="profit-opportunity-title">Profit opportunity detected</h3>
                          <div className="profit-opportunity-values">
                            <span className="profit-opportunity-month">
                              +${totalGain.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/month
                            </span>
                            <span className="profit-opportunity-year">
                              +${totalGainYear.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/year
                            </span>
                          </div>
                          <p className="profit-opportunity-hint">
                            Raise prices on {needRaise.length} items to capture this. Start with the highest projected gain below.
                          </p>
                        </div>
                      ) : (
                        <div className="actionable-strip">
                          <strong>Your prices are in line with target margin</strong> — no changes needed.
                        </div>
                      )}
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Item</th>
                              <th>Current price</th>
                              <th>Cost</th>
                              <th>Suggested price</th>
                              <th>Change %</th>
                              <th>Projected gain/month</th>
                              <th>Note</th>
                            </tr>
                          </thead>
                          <tbody>
                            {withSuggestion.map(({ row: r, suggestion: s }) => {
                              const belowTarget =
                                s.suggested_price > s.current_price;
                              const aboveTargetPts =
                                s.current_margin_pct - s.target_margin_pct;
                              const atTarget =
                                !belowTarget && aboveTargetPts < 0.5;
                              const aboveTarget =
                                !belowTarget && aboveTargetPts >= 0.5;
                              const projectedGain = belowTarget
                                ? (s.suggested_price - r.price!) * r.units_sold
                                : 0;
                              return (
                                <tr
                                  key={r.item_name}
                                  className={
                                    belowTarget
                                      ? s.increase_pct > 15
                                        ? 'tr-margin-bad'
                                        : s.increase_pct > 8
                                          ? 'tr-margin-warn'
                                          : ''
                                      : ''
                                  }
                                >
                                  <td>{r.item_name}</td>
                                  <td className="num">
                                    ${s.current_price.toFixed(2)}
                                  </td>
                                  <td className="num">${s.cost.toFixed(2)}</td>
                                  <td className="num">
                                    {belowTarget ? (
                                      `$${s.suggested_price.toFixed(2)}`
                                    ) : (
                                      <span title="Already at or above target margin — no price change suggested">
                                        —
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    className={`num ${belowTarget ? (s.caution ? 'td-margin-bad' : s.increase_pct > 8 ? 'td-margin-warn' : 'td-margin-good') : aboveTarget ? 'td-margin-good' : ''}`}
                                  >
                                    {belowTarget ? (
                                      `+${s.increase_pct.toFixed(1)}%`
                                    ) : atTarget ? (
                                      <span
                                        style={{ color: 'var(--text-muted)' }}
                                      >
                                        At target
                                      </span>
                                    ) : (
                                      <span
                                        style={{ color: 'var(--success)' }}
                                        title="Margin above target; volume may be low for other reasons (location, season, etc.)"
                                      >
                                        Above by {aboveTargetPts.toFixed(1)}%
                                      </span>
                                    )}
                                  </td>
                                  <td className="num">
                                    {belowTarget ? (
                                      <strong className="profit-gain-cell">
                                        +${projectedGain.toFixed(0)}/mo
                                      </strong>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td>
                                    {atTarget && (
                                      <span
                                        className="badge"
                                        style={{
                                          background: 'var(--success-muted)',
                                          color: 'var(--success)',
                                        }}
                                      >
                                        At target
                                      </span>
                                    )}
                                    {aboveTarget && (
                                      <span
                                        className="badge"
                                        style={{
                                          background: 'var(--success-muted)',
                                          color: 'var(--success)',
                                        }}
                                      >
                                        Above target
                                      </span>
                                    )}
                                    {belowTarget && s.caution && (
                                      <span className="badge badge-warn" title="Large price gap vs target margin">
                                        Leaving ~${projectedGain.toFixed(0)}/mo on the table
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="demo-pricing-note">
                        Per-item target margin when set in recipe builder;
                        otherwise default {(marginGoal * 100).toFixed(0)}%.{' '}
                        <strong>Below target:</strong> suggested price and %
                        increase to get there (volume unchanged).{' '}
                        <strong>At/above target:</strong> no change; &quot;Above by
                        X%&quot; = margin above target. Large suggested increases mean you&apos;re selling at a
                        significant loss — those items are flagged.
                      </p>
                    </>
                  );
                })()}
              </>
            )}

            {activeTab === 'liquor' && <LiquorVarianceTab />}

            {activeTab === 'quadrant' && (
              <>
                {(() => {
                  const byQuad = quadrantItems.reduce(
                    (acc, q) => {
                      acc[q.quadrant] = (acc[q.quadrant] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  );
                  const stars = byQuad.high_volume_high_margin || 0;
                  const fix = byQuad.high_volume_low_margin || 0;
                  const niche = byQuad.low_volume_high_margin || 0;
                  const review = byQuad.low_volume_low_margin || 0;
                  return (
                    <div
                      className="actionable-strip"
                      style={{ marginBottom: '1rem' }}
                    >
                      <strong>Your menu at a glance:</strong> {stars} stars
                      (high volume, high margin), {fix} fix or drop (high volume,
                      low margin — may be loss leaders), {niche} comfort items
                      (low volume, high margin — may cost more to store than
                      worth), {review} to review. Hover any dot for a
                      plain-English insight.
                    </div>
                  );
                })()}
                <div className="quadrant-chart-section">
                  <div className="quadrant-how-to-read">
                    <h4
                      style={{
                        margin: '0 0 0.5rem',
                        fontSize: '0.95rem',
                      }}
                    >
                      How to read this chart
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '0.85rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.5,
                      }}
                    >
                      Each dot is a menu item.{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        Left–right
                      </strong>{' '}
                      is volume (how many you sold);{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        bottom–top
                      </strong>{' '}
                      is margin % (how much you keep after cost). The lines split
                      your menu into four quadrants:{' '}
                      <strong style={{ color: 'var(--success)' }}>
                        top-right
                      </strong>{' '}
                      = high volume, high margin (your stars);{' '}
                      <strong style={{ color: 'var(--warn)' }}>
                        bottom-right
                      </strong>{' '}
                      = high volume, low margin (may be loss leaders — OK if they
                      drive other sales, otherwise raise price);{' '}
                      <strong style={{ color: 'var(--text)' }}>
                        top-left
                      </strong>{' '}
                      = low volume, high margin (comfort items; they may cost
                      more to store than they&apos;re worth — regulars might
                      switch to something simpler if you drop them or make them
                      specials only);{' '}
                      <strong style={{ color: 'var(--text-muted)' }}>
                        bottom-left
                      </strong>{' '}
                      = low volume, low margin (review or cut). Hover any dot to
                      see the numbers and a plain-English take.
                    </p>
                  </div>
                  <QuadrantChart
                    items={quadrantItems}
                    getInsight={getQuadrantInsight}
                  />
                </div>
              </>
            )}
          </section>
          <footer className="demo-app-footer" role="contentinfo">
            <span>
              Margin Insights — free margin insights from your own data.
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}
