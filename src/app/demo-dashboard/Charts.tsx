'use client';

import { useState } from 'react';
import type { ItemMarginRow } from '@/insight-engine/services/marginEngine';
import type { ProfitLeakItem } from '@/insight-engine/reports/profitLeakReport';

const marginColor = (pct: number, targetPct: number) => {
  if (Number.isNaN(pct)) return 'var(--text-muted)';
  if (pct >= targetPct) return 'var(--success)';
  if (pct >= targetPct * 0.7) return 'var(--warn)';
  return 'var(--danger)';
};

/** Horizontal bar chart: contribution margin by item, colored by margin %. Top N items. */
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
      <h4 className="chart-title">Top contribution margin (profit per item × volume)</h4>
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
          style={{ position: 'fixed', left: tooltipPos.x + 12, top: tooltipPos.y + 8, pointerEvents: 'none' }}
          role="tooltip"
        >
          <div className="quadrant-tooltip-name">{hovered.item_name}</div>
          <div className="quadrant-tooltip-row">
            <span>Contribution</span>
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
      <h4 className="chart-title">Where the leak is biggest (est. $/month)</h4>
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
          style={{ position: 'fixed', left: tooltipPos.x + 12, top: tooltipPos.y + 8, pointerEvents: 'none' }}
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
  const r = 48;
  const cx = 70;
  const cy = 70;

  return (
    <div className="chart-card">
      <h4 className="chart-title">Revenue mix</h4>
      <div className="donut-wrap">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          className="donut-svg"
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
                strokeWidth={isHover ? 2 : 1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  setHovered(seg);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => {
                  if (hovered?.name === seg.name) setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
              />
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.55} fill="var(--surface)" pointerEvents="none" />
        </svg>
        <div className="donut-legend">
          {segments.slice(0, 6).map((seg, i) => {
            const isHover = hovered?.name === seg.name;
            return (
              <div
                key={seg.name}
                className="donut-legend-item"
                style={isHover ? { backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius)', margin: '0 -0.25rem', padding: '0.25rem' } : undefined}
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
                  if (e.key === 'Enter' || e.key === ' ') {
                    setHovered(hovered?.name === seg.name ? null : seg);
                  }
                }}
                style={{ cursor: 'pointer', ...(isHover ? { backgroundColor: 'var(--surface)', borderRadius: 'var(--radius)', margin: '0 -0.25rem', padding: '0.25rem' } : {}) }}
              >
                <span className="donut-dot" style={{ background: colors[i % colors.length] }} />
                <span className="donut-label" title={seg.name}>{seg.name.length > 14 ? seg.name.slice(0, 13) + '…' : seg.name}</span>
                <span className="donut-pct">{((seg.value / total) * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </div>
      {hovered && (
        <div
          className="quadrant-tooltip"
          style={{ position: 'fixed', left: tooltipPos.x + 12, top: tooltipPos.y + 8, pointerEvents: 'none' }}
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
