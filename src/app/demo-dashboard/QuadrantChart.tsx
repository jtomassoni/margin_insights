'use client';

import { useMemo, useState } from 'react';
import type { QuadrantItem } from '@/insight-engine/services/quadrantAnalysis';

/** Generate plain-language insight for a quadrant item (price/cost derived from revenue & contribution). */
export const getQuadrantInsight = (item: QuadrantItem): string => {
  const price = item.units_sold > 0 ? item.revenue / item.units_sold : 0;
  const costPerUnit = item.units_sold > 0 ? (item.revenue - item.contribution_margin) / item.units_sold : 0;
  const priceStr = price.toFixed(2);
  const costStr = costPerUnit.toFixed(2);
  const q = item.quadrant;
  if (q === 'high_volume_high_margin') {
    return `You sold ${item.units_sold} of these at $${priceStr} each; cost is $${costStr}. You're making good margin on every sale — keep it up.`;
  }
  if (q === 'high_volume_low_margin') {
    return `You sold ${item.units_sold} of these for $${priceStr} each, but they cost you $${costStr} each — you're not making much money on them. That's volume without the margin. Consider raising the price.`;
  }
  if (q === 'low_volume_high_margin') {
    return `Lower volume (${item.units_sold} sold), but when you do sell these at $${priceStr} (cost $${costStr}) you keep a solid margin. Could be a chance to promote or raise price.`;
  }
  return `You sold ${item.units_sold} at $${priceStr} each and cost is $${costStr}. You're barely making anything on these — either raise the price or consider cutting them.`;
};

const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

const PADDING = { left: 56, right: 24, top: 24, bottom: 48 };
const WIDTH = 520;
const HEIGHT = 420;
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

interface QuadrantChartProps {
  items: QuadrantItem[];
  /** Optional: return a short insight for the tooltip (e.g. from getQuadrantInsight). */
  getInsight?: (item: QuadrantItem) => string;
}

const validItems = (items: QuadrantItem[]) =>
  items.filter((i) => i.units_sold >= 0 && !Number.isNaN(i.gross_margin_pct));

export const QuadrantChart = ({ items, getInsight }: QuadrantChartProps) => {
  const [hovered, setHovered] = useState<QuadrantItem | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const plotItems = useMemo(() => validItems(items), [items]);

  const { scaleX, scaleY, volMedian, marginMedian, volMin, volMax, marginMin, marginMax } = useMemo(() => {
    if (plotItems.length === 0) {
      return {
        scaleX: (_: number) => PLOT_W / 2,
        scaleY: (_: number) => PLOT_H / 2,
        volMedian: 0,
        marginMedian: 0,
        volMin: 0,
        volMax: 1,
        marginMin: 0,
        marginMax: 100,
      };
    }
    const volumes = plotItems.map((i) => i.units_sold);
    const margins = plotItems.map((i) => i.gross_margin_pct);
    const volMed = median(volumes) || 0;
    const marginMed = median(margins) ?? 0;
    const vMin = Math.min(...volumes, volMed) - 0.5;
    const vMax = Math.max(...volumes, volMed) + 0.5;
    const mMin = Math.min(0, ...margins, marginMed) - 5;
    const mMax = Math.max(100, ...margins, marginMed) + 5;
    const rangeVol = vMax - vMin || 1;
    const rangeMarg = mMax - mMin || 1;
    return {
      scaleX: (v: number) => ((v - vMin) / rangeVol) * PLOT_W,
      scaleY: (m: number) => PLOT_H - ((m - mMin) / rangeMarg) * PLOT_H,
      volMedian: volMed,
      marginMedian: marginMed,
      volMin: vMin,
      volMax: vMax,
      marginMin: mMin,
      marginMax: mMax,
    };
  }, [plotItems]);

  const xMedian = PADDING.left + scaleX(volMedian);
  const yMedian = PADDING.top + scaleY(marginMedian);

  const quadrantFills = useMemo(
    () => ({
      high_volume_high_margin: 'rgba(125, 211, 160, 0.18)',
      low_volume_high_margin: 'rgba(125, 211, 160, 0.08)',
      high_volume_low_margin: 'rgba(232, 201, 122, 0.2)',
      low_volume_low_margin: 'rgba(224, 125, 125, 0.12)',
    }),
    []
  );

  if (plotItems.length === 0) {
    return (
      <div className="quadrant-chart-wrap" style={{ minHeight: HEIGHT }}>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          No items to display. Add cost data to see the quadrant view.
        </p>
      </div>
    );
  }

  const maxContrib = Math.max(...plotItems.map((i) => i.contribution_margin), 1);
  const radius = (c: number) => 4 + Math.min(8, (Math.max(0, c) / maxContrib) * 8);

  return (
    <div className="quadrant-chart-wrap">
      <svg
        width="100%"
        height={HEIGHT}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="quadrant-chart-svg"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <filter id="quadrant-dot-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Axis labels */}
        <text x={14} y={PADDING.top + PLOT_H / 2} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="600" transform={`rotate(-90, 14, ${PADDING.top + PLOT_H / 2})`}>
          Margin %
        </text>
        <text x={PADDING.left + PLOT_W / 2} y={HEIGHT - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontWeight="600">
          Volume (units sold)
        </text>

        {/* Quadrant background fills (heat map) */}
        <rect
          x={PADDING.left}
          y={PADDING.top}
          width={xMedian - PADDING.left}
          height={yMedian - PADDING.top}
          fill={quadrantFills.low_volume_high_margin}
          className="quadrant-fill"
        />
        <rect
          x={xMedian}
          y={PADDING.top}
          width={WIDTH - PADDING.right - xMedian}
          height={yMedian - PADDING.top}
          fill={quadrantFills.high_volume_high_margin}
          className="quadrant-fill"
        />
        <rect
          x={PADDING.left}
          y={yMedian}
          width={xMedian - PADDING.left}
          height={PADDING.top + PLOT_H - yMedian}
          fill={quadrantFills.low_volume_low_margin}
          className="quadrant-fill"
        />
        <rect
          x={xMedian}
          y={yMedian}
          width={WIDTH - PADDING.right - xMedian}
          height={PADDING.top + PLOT_H - yMedian}
          fill={quadrantFills.high_volume_low_margin}
          className="quadrant-fill"
        />

        {/* Median lines */}
        <line
          x1={xMedian}
          y1={PADDING.top}
          x2={xMedian}
          y2={HEIGHT - PADDING.bottom}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <line
          x1={PADDING.left}
          y1={yMedian}
          x2={WIDTH - PADDING.right}
          y2={yMedian}
          stroke="var(--border)"
          strokeWidth="1"
          strokeDasharray="4 3"
        />

        {/* Axis ticks - volume (x) */}
        {[volMin, volMedian, volMax].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
          <g key={`v-${v}`}>
            <line
              x1={PADDING.left + scaleX(v)}
              y1={HEIGHT - PADDING.bottom}
              x2={PADDING.left + scaleX(v)}
              y2={HEIGHT - PADDING.bottom + 4}
              stroke="var(--text-muted)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left + scaleX(v)}
              y={HEIGHT - 12}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontSize="10"
            >
              {Number(v) === v && v % 1 === 0 ? v : v.toFixed(1)}
            </text>
          </g>
        ))}
        {/* Axis ticks - margin (y) */}
        {[marginMin, marginMedian, marginMax].filter((m, i, a) => a.indexOf(m) === i).map((m) => (
          <g key={`m-${m}`}>
            <line
              x1={PADDING.left}
              y1={PADDING.top + scaleY(m)}
              x2={PADDING.left - 4}
              y2={PADDING.top + scaleY(m)}
              stroke="var(--text-muted)"
              strokeWidth="1"
            />
            <text
              x={PADDING.left - 8}
              y={PADDING.top + scaleY(m) + 3}
              textAnchor="end"
              fill="var(--text-muted)"
              fontSize="10"
            >
              {Number(m) === m && m % 1 === 0 ? m : m.toFixed(0)}%
            </text>
          </g>
        ))}

        {/* Quadrant labels */}
        <text x={PADDING.left + (xMedian - PADDING.left) / 2} y={PADDING.top + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">
          Low vol / High margin
        </text>
        <text x={xMedian + (WIDTH - PADDING.right - xMedian) / 2} y={PADDING.top + 14} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">
          High vol / High margin
        </text>
        <text x={PADDING.left + (xMedian - PADDING.left) / 2} y={HEIGHT - PADDING.bottom - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">
          Low vol / Low margin
        </text>
        <text x={xMedian + (WIDTH - PADDING.right - xMedian) / 2} y={HEIGHT - PADDING.bottom - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="9" fontWeight="600">
          High vol / Low margin
        </text>

        {/* Data points */}
        {plotItems.map((item) => {
          const cx = PADDING.left + scaleX(item.units_sold);
          const cy = PADDING.top + scaleY(item.gross_margin_pct);
          const r = radius(item.contribution_margin);
          const isHover = hovered?.item_name === item.item_name;
          return (
            <g
              key={item.item_name}
              onMouseEnter={(e) => {
                setHovered(item);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (hovered?.item_name !== item.item_name) return;
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={isHover ? r + 3 : r}
                fill={item.quadrant.includes('low_margin') ? 'var(--warn)' : 'var(--success)'}
                fillOpacity={isHover ? 0.95 : 0.75}
                stroke="var(--bg)"
                strokeWidth={isHover ? 2.5 : 1.5}
                filter="url(#quadrant-dot-shadow)"
                className="quadrant-dot"
              />
            </g>
          );
        })}
      </svg>

      {/* Tooltip (portal-style, positioned over SVG) */}
      {hovered && (
        <div
          className="quadrant-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPos.x + 12,
            top: tooltipPos.y + 8,
            pointerEvents: 'none',
          }}
          role="tooltip"
        >
          <div className="quadrant-tooltip-name">{hovered.item_name}</div>
          {getInsight && (
            <p className="quadrant-tooltip-insight">{getInsight(hovered)}</p>
          )}
          <div className="quadrant-tooltip-row">
            <span>Units sold</span>
            <span className="num">{hovered.units_sold}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Revenue</span>
            <span className="num">${hovered.revenue.toFixed(2)}</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Margin</span>
            <span className="num">{hovered.gross_margin_pct.toFixed(1)}%</span>
          </div>
          <div className="quadrant-tooltip-row">
            <span>Contribution</span>
            <span className="num">${hovered.contribution_margin.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
