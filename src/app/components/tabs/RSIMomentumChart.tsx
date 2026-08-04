// src/components/RSIMomentumChart.tsx
/**
 * Volatix RSI Momentum Chart - Production Financial Visualization
 * Renders RSI(14) with overbought/oversold zones and price context
 * Optimized for real-time updates with memoized data transformations
 */

'use client';

import React, { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { TickerData, TickerMetadata } from '../../data/mockData';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface RSIMomentumChartProps {
  /** Complete ticker dataset from server or client fetch */
  data: TickerData;
  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  ticker: string;
  /** Ticker metadata with exchange/currency/timezone information */
  metadata?: TickerMetadata;
}

interface ChartDataPoint {
  date: string;
  close: number;
  rsi: number;
}

interface RSIDistributionItem {
  label: string;
  count: number;
  pct: string;
  colorClass: string;
  bgClass: string;
}

// ---------------------------------------------------------------------------
// FORMATTING UTILITIES (Exchange-aware, pure functions, no external deps)
// ---------------------------------------------------------------------------

/**
 * Format price using ticker's currency and locale conventions
 * Falls back to USD if metadata unavailable
 */
function formatPrice(
  value: number,
  metadata?: TickerMetadata,
  options: { compact?: boolean; sign?: boolean } = {}
): string {
  const currency = metadata?.currency ?? 'USD';
  const locale =
    metadata?.ticker.exchange === 'NSE' || metadata?.ticker.exchange === 'BSE' ? 'en-IN' : 'en-US';

  if (!Number.isFinite(value)) return '—';

  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'INR' ? 2 : 2,
    maximumFractionDigits: currency === 'INR' ? 2 : 4,
    notation: options.compact ? 'compact' : 'standard',
    compactDisplay: 'short',
  });

  let formatted = formatter.format(value);

  if (options.sign && value > 0) {
    formatted = `+${formatted}`;
  }

  return formatted;
}

// ---------------------------------------------------------------------------
// DATA TRANSFORMATION (Pure functions, testable)
// ---------------------------------------------------------------------------

/**
 * Transform history data for chart rendering
 * Takes last N points, reverses for chronological order (oldest first)
 */
function transformChartData(history: TickerData['history'], maxPoints = 180): ChartDataPoint[] {
  if (!history?.length) return [];

  return history
    .slice(-maxPoints)
    .reverse()
    .map((row) => ({
      date: row.date,
      close: row.close,
      rsi: row.rsi,
    }));
}

/**
 * Calculate RSI distribution counts
 */
function calculateRSIDistribution(data: ChartDataPoint[]): {
  overbought: number;
  oversold: number;
  neutral: number;
} {
  if (!data.length) return { overbought: 0, oversold: 0, neutral: 0 };

  let overbought = 0;
  let oversold = 0;

  for (const point of data) {
    if (point.rsi > 70) overbought++;
    else if (point.rsi < 30) oversold++;
  }

  return {
    overbought,
    oversold,
    neutral: data.length - overbought - oversold,
  };
}

/**
 * Get RSI state label and color
 */
function getRSIState(rsi: number): { label: string; color: string } {
  if (rsi > 70) return { label: 'OVERBOUGHT', color: 'var(--danger)' };
  if (rsi < 30) return { label: 'OVERSOLD', color: 'var(--success)' };
  return { label: 'NEUTRAL', color: 'var(--muted-foreground)' };
}

// ---------------------------------------------------------------------------
// TOOLTIP COMPONENT (Memoized, pure)
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
  metadata?: TickerMetadata;
}

const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
  label,
  metadata,
}: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const rsiEntry = payload.find((p) => p.dataKey === 'rsi');
  const rsiVal = rsiEntry?.value ?? 0;
  const { label: state, color: stateColor } = getRSIState(rsiVal);

  return (
    <div className="glass-card rounded-lg p-3 border border-border shadow-2xl min-w-[180px]">
      <p className="text-xs font-mono-data text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={`tt-rsi-${p.dataKey}`} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-muted-foreground">{p.name}</span>
          </div>
          <span className="text-xs font-mono-data font-semibold text-foreground">
            {p.dataKey === 'rsi' ? p.value.toFixed(1) : formatPrice(p.value, metadata)}
          </span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-border">
        <span className="text-xs font-mono-data font-bold" style={{ color: stateColor }}>
          {state}
        </span>
      </div>
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// ---------------------------------------------------------------------------
// RSI DISTRIBUTION CARD (Memoized sub-component)
// ---------------------------------------------------------------------------

interface RSIDistributionCardProps {
  item: RSIDistributionItem;
}

const RSIDistributionCard = memo(function RSIDistributionCard({ item }: RSIDistributionCardProps) {
  return (
    <div className={`rounded-xl p-4 border ${item.bgClass}`}>
      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
      <div className={`font-mono-data text-2xl font-bold ${item.colorClass}`}>{item.count}</div>
      <div className="text-xs font-mono-data text-muted-foreground">{item.pct}% of window</div>
    </div>
  );
});

RSIDistributionCard.displayName = 'RSIDistributionCard';

// ---------------------------------------------------------------------------
// MAIN COMPONENT (Memoized, optimized)
// ---------------------------------------------------------------------------

const RSIMomentumChart = memo(function RSIMomentumChart({
  data,
  ticker,
  metadata,
}: RSIMomentumChartProps) {
  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized)
  // -------------------------------------------------------------------------

  const chartData = useMemo(() => transformChartData(data.history, 180), [data.history]);

  const { overbought, oversold, neutral } = useMemo(
    () => calculateRSIDistribution(chartData),
    [chartData]
  );

  const distributionItems = useMemo<RSIDistributionItem[]>(() => {
    const total = chartData.length || 1;
    return [
      {
        label: 'Overbought Sessions',
        count: overbought,
        pct: ((overbought / total) * 100).toFixed(1),
        colorClass: 'text-negative',
        bgClass: 'bg-danger/10 border-danger/20',
      },
      {
        label: 'Neutral Sessions',
        count: neutral,
        pct: ((neutral / total) * 100).toFixed(1),
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted/50 border-border',
      },
      {
        label: 'Oversold Sessions',
        count: oversold,
        pct: ((oversold / total) * 100).toFixed(1),
        colorClass: 'text-positive',
        bgClass: 'bg-success/10 border-success/20',
      },
    ];
  }, [overbought, oversold, neutral, chartData.length]);

  // X-axis interval calculation — must be above the early return guard
  const xAxisInterval = useMemo(
    () => Math.max(1, Math.floor(chartData.length / 8)),
    [chartData.length]
  );

  // Guard against missing data
  if (!data.summary || !chartData.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-8 text-center">
        <div className="text-muted-foreground">No RSI data available for {ticker}</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header with legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{ticker} RSI Momentum</h2>
          <p className="text-sm text-muted-foreground">
            14-period Relative Strength Index · overbought/oversold zones
          </p>
        </div>
        <div
          className="flex items-center gap-4 flex-wrap text-xs"
          role="group"
          aria-label="RSI zones"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full bg-danger" aria-hidden="true" />
            <span className="text-muted-foreground">Overbought &gt;70</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-1 rounded-full bg-success" aria-hidden="true" />
            <span className="text-muted-foreground">Oversold &lt;30</span>
          </div>
        </div>
      </div>

      {/* Price Context Chart */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">
          Price Context
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="priceGradRSI" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
            <XAxis dataKey="date" hide />
            <YAxis
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatPrice(v, metadata)}
              width={60}
            />
            <Area
              type="monotone"
              dataKey="close"
              name="Close"
              fill="url(#priceGradRSI)"
              stroke="var(--primary)"
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI Chart */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wide">
          RSI (14)
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="rsiOBGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.15} />
                <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rsiOSGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={xAxisInterval}
            />
            <YAxis
              domain={[0, 100]}
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              axisLine={false}
              ticks={[0, 30, 50, 70, 100]}
              width={40}
            />
            <Tooltip
              content={<CustomTooltip metadata={metadata} />}
              wrapperStyle={{ outline: 'none' }}
            />
            <ReferenceArea y1={70} y2={100} fill="var(--danger)" fillOpacity={0.06} />
            <ReferenceArea y1={0} y2={30} fill="var(--success)" fillOpacity={0.06} />
            <ReferenceLine
              y={70}
              stroke="var(--danger)"
              strokeDasharray="4 2"
              strokeWidth={1}
              label={{
                value: 'OB 70',
                position: 'insideTopRight',
                fill: 'var(--danger)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
            />
            <ReferenceLine
              y={30}
              stroke="var(--success)"
              strokeDasharray="4 2"
              strokeWidth={1}
              label={{
                value: 'OS 30',
                position: 'insideBottomRight',
                fill: 'var(--success)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
            />
            <ReferenceLine y={50} stroke="var(--border)" strokeDasharray="2 4" strokeWidth={1} />
            <Line
              type="monotone"
              dataKey="rsi"
              name="RSI(14)"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* RSI Distribution */}
      <div className="grid grid-cols-3 gap-4" role="list" aria-label="RSI distribution">
        {distributionItems.map((item) => (
          <RSIDistributionCard key={`rsidist-${item.label}`} item={item} />
        ))}
      </div>
    </div>
  );
});

RSIMomentumChart.displayName = 'RSIMomentumChart';

export default RSIMomentumChart;
