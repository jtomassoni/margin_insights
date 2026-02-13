'use client';

import { useState } from 'react';
import type { ItemMarginRow } from '@/insight-engine/services/marginEngine';
import type { ProfitLeakItem } from '@/insight-engine/reports/profitLeakReport';

const clampTooltip = (x: number, y: number, w = 260, h = 180) => {
  if (typeof window === 'undefined') return { left: x + 12, top: y + 8 };
  const pad = 8;
  let left = x + 12;
  let top = y + 8;
  if (left + w > window.innerWidth - pad) left = window.innerWidth - w - pad;
  if (left < pad) left = pad;
  if (top + h > window.innerHeight - pad) top = window.innerHeight - h - pad;
  if (top < pad) top = pad;
  return { left, top };
};

const marginColor = (pct: number, targetPct: number) => {
  if (Number.isNaN(pct)) return 'var(--text-muted)';
  if (pct >= targetPct) return 'var(--success)';
  if (pct >= targetPct * 0.7) return 'var(--warn)';
  return 'var(--danger)';
};

/** Horizontal bar chart: profit (per item × volume) by item, colored by margin %. Top N items. */
export const ContributionBarChart = ({
  rows,
  targetMarginPct,
  maxBars = 12,
}: {
  rows: ItemMarginRow[];
  targetMarginPct: number;
  maxBars?: number;
}) => {
  const [hovered, setHovered] = useState<ItemMarginRow | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const sorted = [...rows]
    .filter((r) => r.contribution_margin > 0)
    .sort((a, b) => b.contribution_margin - a.contribution_margin)
    .slice(0, maxBars);
  const max = Math.max(...sorted.map((r) => r.contribution_margin), 1);
  const barHeight = 20;
  const gap = 6;
  const height = sorted.length * (barHeight + gap) - gap;
  const barStart = 110;
  const barMaxWidth = 140;
  const chartWidth = 280;

  return (
    <div className="chart-card">
      <h4 className="chart-title" title="Profit per item × units sold; bars colored by margin % vs target">Profit (per item × volume)</h4>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="bar-chart-svg"
        onMouseLeave={() => setHovered(null)}
      >
        {sorted.map((r, i) => {
          const w = (r.contribution_margin / max) * barMaxWidth;
          const y = i * (barHeight + gap);
          const fill = marginColor(r.gross_margin_pct, targetMarginPct);
          const isHover = hovered?.item_name === r.item_name;
          return (
            <g
              key={r.item_name}
              onMouseEnter={(e) => {
                setHovered(r);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (hovered?.item_name === r.item_name) setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                setHovered((prev) => (prev?.item_name === r.item_name ? null : r));
                setTooltipPos({ x: t.clientX, y: t.clientY });
              }}
              style={{ cursor: 'pointer' }}
            >
              <text x="0" y={y + 14} fontSize="11" fill="var(--text)" className="chart-label">
                {r.item_name.length > 18 ? r.item_name.slice(0, 17) + '…' : r.item_name}
              </text>
              <rect
                x={barStart}
                y={y}
                width={w}
                height={barHeight - 2}
                rx="3"
                fill={fill}
                opacity={isHover ? 1 : 0.9}
                stroke={isHover ? 'var(--text-muted)' : 'transparent'}
                strokeWidth={1}
              />
              <text x={barStart + w + 4} y={y + 14} fontSize="10" fill="var(--text-muted)">
                ${r.contribution_margin.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div
          className="quadrant-tooltip"
          style={{ position: 'fixed', ...clampTooltip(tooltipPos.x, tooltipPos.y), pointerEvents: 'none' }}
          role="tooltip"
        >
          <div className="quadrant-tooltip-name">{hovered.item_name}</div>
          <div className="quadrant-tooltip-row">
            <span>Profit</span>
            <span className="num">${hovered.contribution_margin.toFixed(2)}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Revenue</span>
            <span className="num">${hovered.revenue.toFixed(2)}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Units sold</span>
            <span className="num">{hovered.units_sold}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Margin</span>
            <span className="num">{Number.isNaN(hovered.gross_margin_pct) ? '—' : `${hovered.gross_margin_pct.toFixed(1)}%`}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Cost/serving</span>
            <span className="num">${hovered.cost_per_serving.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

/** Horizontal bar chart: estimated lost profit per month (leak items). */
export const LostProfitBarChart = ({ items }: { items: ProfitLeakItem[] }) => {
  const [hovered, setHovered] = useState<ProfitLeakItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) => b.estimated_lost_profit_per_month - a.estimated_lost_profit_per_month).slice(0, 10);
  const max = Math.max(...sorted.map((i) => i.estimated_lost_profit_per_month), 1);
  const barHeight = 22;
  const gap = 6;
  const height = sorted.length * (barHeight + gap) - gap;
  const barStart = 110;
  const barMaxWidth = 140;
  const chartWidth = 280;

  return (
    <div className="chart-card">
      <h4 className="chart-title" title="Estimated profit left on the table per month if prices stay below target">Where the leak is biggest (est. $/month)</h4>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="bar-chart-svg"
        onMouseLeave={() => setHovered(null)}
      >
        {sorted.map((i, idx) => {
          const w = (i.estimated_lost_profit_per_month / max) * barMaxWidth;
          const y = idx * (barHeight + gap);
          const isHover = hovered?.item_name === i.item_name;
          return (
            <g
              key={i.item_name}
              onMouseEnter={(e) => {
                setHovered(i);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (hovered?.item_name === i.item_name) setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                setHovered((prev) => (prev?.item_name === i.item_name ? null : i));
                setTooltipPos({ x: t.clientX, y: t.clientY });
              }}
              style={{ cursor: 'pointer' }}
            >
              <text x="0" y={y + 14} fontSize="11" fill="var(--text)" className="chart-label">
                {i.item_name.length > 18 ? i.item_name.slice(0, 17) + '…' : i.item_name}
              </text>
              <rect
                x={barStart}
                y={y}
                width={w}
                height={barHeight - 2}
                rx="3"
                fill="var(--danger)"
                opacity={isHover ? 1 : 0.85}
                stroke={isHover ? 'var(--text-muted)' : 'transparent'}
                strokeWidth={1}
              />
              <text x={barStart + w + 4} y={y + 14} fontSize="10" fill="var(--text-muted)">
                ${i.estimated_lost_profit_per_month.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div
          className="quadrant-tooltip"
          style={{ position: 'fixed', ...clampTooltip(tooltipPos.x, tooltipPos.y), pointerEvents: 'none' }}
          role="tooltip"
        >
          <div className="quadrant-tooltip-name">{hovered.item_name}</div>
          <div className="quadrant-tooltip-row">
            <span>Est. lost/month</span>
            <span className="num">${hovered.estimated_lost_profit_per_month.toFixed(2)}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Current margin</span>
            <span className="num">{hovered.current_margin_pct.toFixed(1)}%</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Units sold</span>
            <span className="num">{hovered.units_sold}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Suggested price</span>
            <span className="num">${hovered.suggested_price.toFixed(2)}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Revenue</span>
            <span className="num">${hovered.revenue.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

type DonutSegment = { name: string; value: number };

/** Donut: revenue share by item (top N, rest as "Other"). */
export const RevenueDonut = ({ rows, topN = 8 }: { rows: ItemMarginRow[]; topN?: number }) => {
  const [hovered, setHovered] = useState<DonutSegment | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const total = rows.reduce((s, r) => s + r.revenue, 0);
  if (total <= 0) return null;
  const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
  const top = sorted.slice(0, topN);
  const other = sorted.slice(topN).reduce((s, r) => s + r.revenue, 0);
  const segments: DonutSegment[] = other > 0 ? [...top.map((r) => ({ name: r.item_name, value: r.revenue })), { name: 'Other', value: other }] : top.map((r) => ({ name: r.item_name, value: r.revenue }));
  const colors = ['var(--accent)', 'var(--success)', 'var(--warn)', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#60a5fa', 'var(--text-muted)'];
  let acc = 0;
  const size = 200;
  const r = 72;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="chart-card revenue-mix-card">
      <div className="revenue-mix-header">
        <h4 className="chart-title" title="Share of total revenue by item; hover a slice or legend for details">Revenue mix</h4>
        <div className="revenue-mix-total" aria-label={`Total revenue ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}>
          Total revenue <strong>${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
        </div>
      </div>
      <div className="donut-wrap">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="donut-svg revenue-donut-svg"
          onMouseLeave={() => setHovered(null)}
        >
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const angle = 2 * Math.PI * pct;
            const start = 2 * Math.PI * acc;
            acc += pct;
            const x1 = cx + r * Math.cos(start - Math.PI / 2);
            const y1 = cy + r * Math.sin(start - Math.PI / 2);
            const x2 = cx + r * Math.cos(start + angle - Math.PI / 2);
            const y2 = cy + r * Math.sin(start + angle - Math.PI / 2);
            const large = angle > Math.PI ? 1 : 0;
            const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
            const isHover = hovered?.name === seg.name;
            return (
              <path
                key={seg.name}
                d={d}
                fill={colors[i % colors.length]}
                opacity={isHover ? 1 : 0.9}
                stroke="var(--bg)"
                strokeWidth={2}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setHovered(seg);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (hovered?.name === seg.name) setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.52} fill="var(--surface)" pointerEvents="none" />
        </svg>
        <div className="donut-legend">
          {segments.map((seg, i) => {
            const isHover = hovered?.name === seg.name;
            const pct = (seg.value / total) * 100;
            return (
              <div
                key={seg.name}
                className="donut-legend-item"
                style={{
                  cursor: 'pointer',
                  /* Hover: background only, no padding/margin change to avoid shifting other legend items */
                  ...(isHover ? { backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)' } : {}),
                }}
                onMouseEnter={(e) => {
                  setHovered(seg);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (hovered?.name === seg.name) setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseLeave={() => setHovered(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setHovered(hovered?.name === seg.name ? null : seg);
                }}
              >
                <span className="donut-dot" style={{ background: colors[i % colors.length] }} />
                <span className="donut-label" title={seg.name}>{seg.name.length > 16 ? seg.name.slice(0, 15) + '…' : seg.name}</span>
                <span className="donut-meta">
                  <span className="donut-pct">{pct.toFixed(1)}%</span>
                  <span className="donut-revenue">${seg.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {hovered && (
        <div
          className="quadrant-tooltip"
          style={{ position: 'fixed', ...clampTooltip(tooltipPos.x, tooltipPos.y, 220, 120), pointerEvents: 'none' }}
          role="tooltip"
        >
          <div className="quadrant-tooltip-name">{hovered.name}</div>
          <div className="quadrant-tooltip-row">
            <span>Revenue</span>
            <span className="num">${hovered.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Share of total</span>
            <span className="num">{((hovered.value / total) * 100).toFixed(1)}%</span>
          </div>
        </div>
      )}
    </div>
  );
};

/** Radar chart: "where you really are" — mix of revenue/units from high vs low margin, with heatmap background. */
export const MarginRealityRadar = ({
  rows,
  targetMarginPct,
}: {
  rows: ItemMarginRow[];
  targetMarginPct: number;
}) => {
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalUnits = rows.reduce((s, r) => s + r.units_sold, 0);
  const highMargin = (m: number) => !Number.isNaN(m) && m >= targetMarginPct;

  const revenueFromHigh = rows.filter((r) => highMargin(r.gross_margin_pct)).reduce((s, r) => s + r.revenue, 0);
  const revenueFromLow = totalRevenue - revenueFromHigh;
  const unitsFromHigh = rows.filter((r) => highMargin(r.gross_margin_pct)).reduce((s, r) => s + r.units_sold, 0);
  const itemCountHigh = rows.filter((r) => highMargin(r.gross_margin_pct)).length;
  const revenueWeightedMargin = totalRevenue > 0
    ? rows.reduce((s, r) => s + (r.gross_margin_pct * r.revenue), 0) / totalRevenue
    : 0;

  const pctRevenueHigh = totalRevenue > 0 ? (revenueFromHigh / totalRevenue) * 100 : 0;
  const pctUnitsHigh = totalUnits > 0 ? (unitsFromHigh / totalUnits) * 100 : 0;
  const pctRevenueLow = totalRevenue > 0 ? (revenueFromLow / totalRevenue) * 100 : 0;
  const pctItemsHigh = rows.length > 0 ? (itemCountHigh / rows.length) * 100 : 0;
  const weightedMarginCapped = Math.min(100, Math.max(0, revenueWeightedMargin));

  const axes = [
    { label: 'Revenue from high margin', short: 'Rev high', value: pctRevenueHigh },
    { label: 'Units from high margin', short: 'Units high', value: pctUnitsHigh },
    { label: 'Weighted avg margin %', short: 'Avg margin', value: weightedMarginCapped },
    { label: 'Menu items at target %', short: 'Items @ target', value: pctItemsHigh },
    { label: 'Revenue away from low margin', short: 'Rev not low', value: 100 - pctRevenueLow },
  ];

  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 82;
  const n = axes.length;
  const angleStep = (2 * Math.PI) / n;
  const toPoint = (angle: number, r: number) => ({
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  });

  const heatLevels = [20, 40, 60, 80, 100];
  const dataPoints = axes.map((a, i) => toPoint(i * angleStep, (a.value / 100) * radius));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  if (totalRevenue <= 0 && totalUnits <= 0) return null;

  const overallScore = (pctRevenueHigh + pctUnitsHigh + weightedMarginCapped + (100 - pctRevenueLow)) / 4;
  const fillColor = overallScore >= 60 ? 'var(--success)' : overallScore >= 35 ? 'var(--warn)' : 'var(--danger)';

  return (
    <div className="chart-card margin-reality-radar">
      <h4 className="chart-title" title="Where your sales and revenue really sit — high vs low margin">
        Where you really are
      </h4>
      <p className="margin-reality-subtitle">
        {pctRevenueLow > 50 ? (
          <strong style={{ color: 'var(--warn)' }}>Most of your revenue comes from low-margin items.</strong>
        ) : pctRevenueHigh >= 50 ? (
          <span style={{ color: 'var(--success)' }}>Most revenue is from high-margin items.</span>
        ) : (
          <span>Revenue is split between high- and low-margin items.</span>
        )}
      </p>
      <div className="radar-wrap">
        <svg viewBox={`0 0 ${size} ${size}`} className="radar-svg">
          <defs>
            <linearGradient id="radar-heat-inner" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--success)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--success)" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="radar-heat-outer" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {heatLevels.slice().reverse().map((level) => {
            const r = (level / 100) * radius;
            const pts = Array.from({ length: n }, (_, i) => toPoint(i * angleStep, r));
            const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
            const isInner = level >= 60;
            return (
              <path
                key={level}
                d={path}
                fill={isInner ? 'url(#radar-heat-inner)' : 'url(#radar-heat-outer)'}
                stroke="var(--border)"
                strokeOpacity="0.4"
                strokeWidth="0.5"
              />
            );
          })}
          {heatLevels.map((level) => {
            const r = (level / 100) * radius;
            const pts = Array.from({ length: n }, (_, i) => toPoint(i * angleStep, r));
            return (
              <polygon
                key={`grid-${level}`}
                points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="var(--text-muted)"
                strokeOpacity="0.25"
                strokeWidth="0.5"
              />
            );
          })}
          {axes.map((_, i) => {
            const p = toPoint(i * angleStep, radius);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={p.x}
                y2={p.y}
                stroke="var(--text-muted)"
                strokeOpacity="0.3"
                strokeWidth="0.5"
              />
            );
          })}
          <path
            d={dataPath}
            fill={fillColor}
            fillOpacity="0.35"
            stroke={fillColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {axes.map((a, i) => {
            const p = toPoint(i * angleStep, radius + 14);
            const anchor = p.x < cx - 5 ? 'end' : p.x > cx + 5 ? 'start' : 'middle';
            return (
              <text
                key={i}
                x={p.x}
                y={p.y}
                textAnchor={anchor}
                fill="var(--text-muted)"
                fontSize="8"
                className="radar-label"
              >
                {a.short}
              </text>
            );
          })}
        </svg>
        <ul className="radar-legend">
          {axes.map((a, i) => (
            <li key={i}>
              <span className="radar-legend-label">{a.label}</span>
              <span className="radar-legend-value">{a.value.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
