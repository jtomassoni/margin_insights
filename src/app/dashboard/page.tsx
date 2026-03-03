'use client';

/**
 * Overview dashboard — answers instantly: what makes money, what costs money, what to change.
 * See docs/living-todo.md for requirements.
 */
import Link from 'next/link';
import { useDashboardData } from '@/context/DashboardDataContext';
import {
  getCategoryMargins,
  getPrimaryIssue,
  buildQuickWins,
} from '@/insight-engine/utils/overviewData';

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtCur = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

function MarginBadge({ pct }: { pct: number }) {
  const status = pct >= 70 ? 'green' : pct >= 55 ? 'yellow' : 'red';
  return <span className={`overview-margin-badge overview-margin-badge--${status}`}>{pct}%</span>;
}

export default function DashboardOverviewPage() {
  const {
    hasAnyIngredients,
    hasAnyMenuItems,
    marginRowsWithPrices,
    leakReport,
    menuPrices,
    menuItemCategories,
  } = useDashboardData();

  const revenue = marginRowsWithPrices.reduce((s, r) => s + r.revenue, 0);
  const totalCost = marginRowsWithPrices.reduce((s, r) => s + r.total_cost, 0);
  const grossProfit = revenue - totalCost;
  const avgMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const opportunityTotal = leakReport.summary.estimated_lost_profit_per_month;

  const topDrivers = [...marginRowsWithPrices]
    .filter((r) => r.contribution_margin > 0)
    .sort((a, b) => b.contribution_margin - a.contribution_margin)
    .slice(0, 3);

  const topLeaks = leakReport.items
    .filter((i) => i.role === 'to_fix')
    .slice(0, 3);

  const quickWins = buildQuickWins(leakReport.items, menuPrices);
  const categoryMargins = getCategoryMargins(marginRowsWithPrices, menuItemCategories);

  if (!hasAnyIngredients && !hasAnyMenuItems) {
    return (
      <div className="demo-layout">
        <main className="demo-main">
          <section className="dashboard-section">
            <section className="dashboard-empty">
              <h2>Overview</h2>
              <h3>Before the dashboard works</h3>
              <p>
                The point of Margin Insights is to force a clear understanding of the true cost of
                everything you sell, so you can spot cost centers and low-margin items immediately.
                Once we know both cost and sales volume, the reports become very sharp.
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
              <div className="dashboard-empty-actions">
                <Link href="/dashboard/ingredients" className="btn btn-primary">
                  Add menu items
                </Link>
              </div>
            </section>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="demo-layout overview-layout">
      <main className="demo-main overview-main">
        {/* 1. PROFIT SNAPSHOT */}
        <section className="overview-section overview-snapshot">
          <h2 className="overview-section-title">Profit Snapshot</h2>
          <div className="overview-snapshot-grid">
            <div className="overview-snapshot-row">
              <span className="overview-snapshot-label">Revenue (period)</span>
              <span className="overview-snapshot-value">{fmtCur(revenue)}</span>
            </div>
            <div className="overview-snapshot-row">
              <span className="overview-snapshot-label">Estimated ingredient cost</span>
              <span className="overview-snapshot-value">{fmtCur(totalCost)}</span>
            </div>
            <div className="overview-snapshot-row">
              <span className="overview-snapshot-label">Estimated gross profit</span>
              <span className="overview-snapshot-value overview-snapshot-profit">{fmtCur(grossProfit)}</span>
            </div>
            <div className="overview-snapshot-row">
              <span className="overview-snapshot-label">Average margin</span>
              <span className="overview-snapshot-value">{Math.round(avgMargin)}%</span>
            </div>
          </div>
          {opportunityTotal > 0 && (
            <div className="overview-opportunity">
              Opportunity detected: <strong>+{fmtCur(opportunityTotal)}</strong>
              <Link href="/dashboard/reporting?tab=pricing" className="overview-view-details-inline"> View details →</Link>
            </div>
          )}
        </section>

        {/* 2. WHAT MAKES YOU MONEY */}
        <section className="overview-section">
          <h2 className="overview-section-title">What Makes You Money</h2>
          <div className="overview-card-list">
            {topDrivers.map((r) => {
              const price = menuPrices[r.item_name] ?? r.price ?? (r.units_sold > 0 ? r.revenue / r.units_sold : 0);
              const profitPerItem = price > 0 ? price - r.cost_per_serving : 0;
              return (
                <div key={r.item_name} className="overview-card">
                  <div className="overview-card-name">{r.item_name}</div>
                  <div className="overview-card-detail">Sold: {fmt(r.units_sold)} · Profit/item: {fmtCur(profitPerItem)}</div>
                  <div className="overview-card-value overview-card-value--positive">Total profit: {fmtCur(r.contribution_margin)}</div>
                </div>
              );
            })}
          </div>
          <Link href="/dashboard/reporting?tab=margins" className="overview-view-details">View details →</Link>
        </section>

        {/* 3. WHAT IS COSTING YOU MONEY */}
        <section className="overview-section">
          <h2 className="overview-section-title">What Is Costing You Money</h2>
          <div className="overview-card-list">
            {topLeaks.map((item) => (
              <div key={item.item_name} className="overview-card overview-card--leak">
                <div className="overview-card-name">{item.item_name}</div>
                <div className="overview-card-detail">Margin: {Math.round(item.current_margin_pct)}% · {getPrimaryIssue(item)}</div>
                <div className="overview-card-value overview-card-value--opportunity">
                  Opportunity: +{fmtCur(item.estimated_lost_profit_per_month)}
                </div>
              </div>
            ))}
          </div>
          <Link href="/dashboard/reporting?tab=leaks" className="overview-view-details">View details →</Link>
        </section>

        {/* 4. WHAT TO CHANGE TOMORROW */}
        <section className="overview-section">
          <h2 className="overview-section-title">What To Change Tomorrow</h2>
          <div className="overview-quick-wins">
            {quickWins.length > 0 ? (
              quickWins.map((w, i) => (
                <div key={i} className="overview-quick-win">
                  <span className="overview-quick-win-action">{w.action}</span>
                  <span className="overview-quick-win-gain">Expected gain: +{fmtCur(w.expectedGain)}/month</span>
                </div>
              ))
            ) : (
              <p className="overview-quick-wins-empty">No quick wins — margins look healthy.</p>
            )}
          </div>
          <Link href="/dashboard/reporting?tab=pricing" className="overview-view-details">View details →</Link>
        </section>

        {/* 5. CATEGORY PERFORMANCE */}
        <section className="overview-section">
          <h2 className="overview-section-title">Category Performance</h2>
          <div className="overview-categories">
            {categoryMargins.slice(0, 6).map((c) => (
              <div key={c.category} className="overview-category-row">
                <span className="overview-category-name">{c.category}</span>
                <MarginBadge pct={c.margin_pct} />
              </div>
            ))}
          </div>
          <Link href="/dashboard/reporting?tab=margins" className="overview-view-details">View details →</Link>
        </section>

        <p className="overview-footer-hint">
          Jump into <Link href="/dashboard/reporting">Reporting</Link> for details,{' '}
          <Link href="/dashboard/sales">enter sales data</Link>, or update your{' '}
          <Link href="/dashboard/ingredients">menu &amp; recipes</Link>.
        </p>
      </main>
    </div>
  );
}
