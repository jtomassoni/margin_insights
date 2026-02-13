'use client';

import { useMemo, useState } from 'react';
import type { QuadrantItem } from '@/insight-engine/services/quadrantAnalysis';

/** Clamp tooltip so it stays inside viewport */
const clampTooltip = (x: number, y: number, width: number, height: number) => {
  if (typeof window === 'undefined') return { left: x, top: y };
  const pad = 8;
  let left = x + 12;
  let top = y + 8;
  if (left + width > window.innerWidth - pad) left = window.innerWidth - width - pad;
  if (left < pad) left = pad;
  if (top + height > window.innerHeight - pad) top = window.innerHeight - height - pad;
  if (top < pad) top = pad;
  return { left, top };
};

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
    return `You sold ${item.units_sold} of these for $${priceStr} each, but they cost you $${costStr} each — you're not making much per item. Could be an intentional loss leader (e.g. to drive other sales); otherwise consider raising the price.`;
  }
  if (q === 'low_volume_high_margin') {
    return `Lower volume (${item.units_sold} sold), but solid margin when you do sell ($${priceStr}, cost $${costStr}). These can be comfort items that don't cost much to store — but they may cost more to keep than they're worth; the few regulars who like them might just move to something simpler if they fell off the menu or became specials only.`;
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
    // Strictly symmetric ranges so the median is always at 50% — four equal quadrants (no clamping)
    const volSpread = Math.max(1, Math.max(volMed - Math.min(...volumes), Math.max(...volumes) - volMed) * 1.15);
    const marginSpread = Math.max(10, Math.max(marginMed - Math.min(...margins), Math.max(...margins) - marginMed) * 1.15);
    const vMin = volMed - volSpread;
    const vMax = volMed + volSpread;
    const mMin = marginMed - marginSpread;
    const mMax = marginMed + marginSpread;
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
      high_volume_high_margin: 'rgba(125, 211, 160, 0.12)',
      low_volume_high_margin: 'rgba(125, 211, 160, 0.06)',
      high_volume_low_margin: 'rgba(232, 201, 122, 0.14)',
      low_volume_low_margin: 'rgba(224, 125, 125, 0.08)',
    }),
    []
  );

  if (plotItems.length === 0) {
    return (
      <div className="quadrant-chart-wrap quadrant-chart-wrap--empty" style={{ minHeight: HEIGHT }}>
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
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2" floodColor="var(--text)" />
          </filter>
        </defs>

        {/* Axis labels */}
        <text x={14} y={PADDING.top + PLOT_H / 2} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500" transform={`rotate(-90, 14, ${PADDING.top + PLOT_H / 2})`} style={{ letterSpacing: '0.02em' }}>
          <title>Gross margin % — how much you keep after cost per dollar of revenue</title>
          Margin %
        </text>
        <text x={PADDING.left + PLOT_W / 2} y={HEIGHT - 6} textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="500" style={{ letterSpacing: '0.02em' }}>
          <title>Total units sold in the period — higher is more volume</title>
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
        >
          <title>Low volume, high margin — comfort items; may cost more to store than they're worth; regulars may switch if dropped or specials only</title>
        </rect>
        <rect
          x={xMedian}
          y={PADDING.top}
          width={WIDTH - PADDING.right - xMedian}
          height={yMedian - PADDING.top}
          fill={quadrantFills.high_volume_high_margin}
          className="quadrant-fill"
        >
          <title>High volume, high margin — your stars; keep these items</title>
        </rect>
        <rect
          x={PADDING.left}
          y={yMedian}
          width={xMedian - PADDING.left}
          height={PADDING.top + PLOT_H - yMedian}
          fill={quadrantFills.low_volume_low_margin}
          className="quadrant-fill"
        >
          <title>Low volume, low margin — review or consider cutting</title>
        </rect>
        <rect
          x={xMedian}
          y={yMedian}
          width={WIDTH - PADDING.right - xMedian}
          height={PADDING.top + PLOT_H - yMedian}
          fill={quadrantFills.high_volume_low_margin}
          className="quadrant-fill"
        >
          <title>High volume, low margin — may be loss leaders; fix price or keep as traffic drivers</title>
        </rect>

        {/* Median lines — thin, subtle; cross at center for even quadrants */}
        <line
          x1={xMedian}
          y1={PADDING.top}
          x2={xMedian}
          y2={HEIGHT - PADDING.bottom}
          stroke="var(--text-muted)"
          strokeWidth="1"
          strokeOpacity="0.5"
        />
        <line
          x1={PADDING.left}
          y1={yMedian}
          x2={WIDTH - PADDING.right}
          y2={yMedian}
          stroke="var(--text-muted)"
          strokeWidth="1"
          strokeOpacity="0.5"
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

        {/* Data points: scale via transform so hover doesn't shift layout */}
        {plotItems.map((item) => {
          const cx = PADDING.left + scaleX(item.units_sold);
          const cy = PADDING.top + scaleY(item.gross_margin_pct);
          const r = radius(item.contribution_margin);
          const isHover = hovered?.item_name === item.item_name;
          return (
            <g
              key={item.item_name}
              style={{
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
                transform: `translate(${cx}, ${cy}) scale(${isHover ? 1.35 : 1}) translate(${-cx}, ${-cy})`,
              }}
              onMouseEnter={(e) => {
                setHovered(item);
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (hovered?.item_name !== item.item_name) return;
                setTooltipPos({ x: e.clientX, y: e.clientY });
              }}
              onMouseLeave={() => setHovered(null)}
              onTouchStart={(e) => {
                e.preventDefault();
                const t = e.touches[0];
                setHovered((prev) => (prev?.item_name === item.item_name ? null : item));
                setTooltipPos({ x: t.clientX, y: t.clientY });
              }}
            >
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={item.quadrant.includes('low_margin') ? 'var(--warn)' : 'var(--success)'}
                fillOpacity={isHover ? 1 : 0.85}
                stroke="var(--surface)"
                strokeWidth={isHover ? 2 : 1.25}
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
            ...clampTooltip(tooltipPos.x, tooltipPos.y, 280, 220),
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
            <span>Profit</span>
            <span className="num">${hovered.contribution_margin.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
};
