// src/components/MACDConvergenceChart.tsx
/**
 * Volatix MACD Convergence Chart - Production Financial Visualization
 * Renders MACD oscillator with histogram divergence and price context
 * Optimized for real-time updates with memoized data transformations
 */

'use client';

import React, { memo, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import type { TickerData, TickerMetadata } from '../../data/mockData';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface MACDConvergenceChartProps {
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
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
}

interface MACDStatItem {
  label: string;
  value: string;
  colorClass: string;
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

/**
 * Format MACD values (4 decimal places)
 */
function formatMACD(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(4)}`;
}

// ---------------------------------------------------------------------------
// DATA TRANSFORMATION (Pure functions, testable)
// ---------------------------------------------------------------------------

/**
 * Transform history data for chart rendering
 * Takes last N points, reverses for chronological order (oldest first)
 */
function transformChartData(history: TickerData['history'], maxPoints = 160): ChartDataPoint[] {
  if (!history?.length) return [];

  return history
    .slice(-maxPoints)
    .reverse()
    .map((row) => ({
      date: row.date,
      close: row.close,
      macdLine: row.macdLine,
      macdSignal: row.macdSignal,
      macdHistogram: row.macdHistogram,
    }));
}

/**
 * Calculate MACD stat items from summary
 */
function calculateMACDStats(
  summary: TickerData['summary'],
  metadata?: TickerMetadata
): MACDStatItem[] {
  if (!summary) return [];

  const { value: macdLine, signal: macdSignal, histogram: macdHist } = summary.macd;
  const isBullish = macdHist >= 0;

  return [
    {
      label: 'MACD Line',
      value: formatMACD(macdLine),
      colorClass: 'text-primary',
    },
    {
      label: 'Signal Line',
      value: formatMACD(macdSignal),
      colorClass: 'text-accent',
    },
    {
      label: 'Histogram',
      value: formatMACD(macdHist),
      colorClass: isBullish ? 'text-positive' : 'text-negative',
    },
    {
      label: 'Trend State',
      value: isBullish ? 'BULLISH' : 'BEARISH',
      colorClass: isBullish ? 'text-positive' : 'text-negative',
    },
  ];
}

// ---------------------------------------------------------------------------
// TOOLTIP COMPONENT (Memoized, pure)
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string; color: string }>;
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

  return (
    <div className="glass-card rounded-lg p-3 border border-border shadow-2xl min-w-[200px]">
      <p className="text-xs font-mono-data text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => {
        const isPrice = p.dataKey === 'close';
        const color = isPrice
          ? 'var(--foreground)'
          : p.dataKey === 'macdLine'
            ? 'var(--primary)'
            : p.dataKey === 'macdSignal'
              ? 'var(--accent)'
              : p.value >= 0
                ? 'var(--success)'
                : 'var(--danger)';
        return (
          <div
            key={`tt-macd-${p.dataKey}`}
            className="flex items-center justify-between gap-4 mb-1"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-xs text-muted-foreground">{p.name}</span>
            </div>
            <span className="text-xs font-mono-data font-semibold text-foreground">
              {isPrice ? formatPrice(p.value, metadata) : formatMACD(p.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// ---------------------------------------------------------------------------
// MACD STAT CARD (Memoized sub-component)
// ---------------------------------------------------------------------------

interface MACDStatCardProps {
  item: MACDStatItem;
}

const MACDStatCard = memo(function MACDStatCard({ item }: MACDStatCardProps) {
  return (
    <div className="glass-card rounded-xl p-4 border border-border">
      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
      <div className={`font-mono-data text-lg font-bold ${item.colorClass}`}>{item.value}</div>
    </div>
  );
});

MACDStatCard.displayName = 'MACDStatCard';

// ---------------------------------------------------------------------------
// HISTOGRAM CELL (Memoized sub-component)
// ---------------------------------------------------------------------------

interface HistogramCellProps {
  entry: ChartDataPoint;
  index: number;
}

const HistogramCell = memo(function HistogramCell({ entry, index }: HistogramCellProps) {
  return (
    <Cell
      key={`hist-cell-${entry.date}-${index}`}
      fill={entry.macdHistogram >= 0 ? 'var(--success)' : 'var(--danger)'}
      fillOpacity={0.7}
    />
  );
});

HistogramCell.displayName = 'HistogramCell';

// ---------------------------------------------------------------------------
// MAIN COMPONENT (Memoized, optimized)
// ---------------------------------------------------------------------------

const MACDConvergenceChart = memo(function MACDConvergenceChart({
  data,
  ticker,
  metadata,
}: MACDConvergenceChartProps) {
  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized)
  // -------------------------------------------------------------------------

  const chartData = useMemo(() => transformChartData(data.history, 160), [data.history]);

  const macdStats = useMemo(
    () => calculateMACDStats(data.summary, metadata),
    [data.summary, metadata]
  );

  // X-axis interval calculation
  const xAxisInterval = useMemo(
    () => Math.max(1, Math.floor(chartData.length / 8)),
    [chartData.length]
  );

  // Guard against missing data
  if (!data.summary || !chartData.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-8 text-center">
        <div className="text-muted-foreground">No MACD data available for {ticker}</div>
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
          <h2 className="text-lg font-semibold text-foreground">{ticker} MACD Trend Convergence</h2>
          <p className="text-sm text-muted-foreground">
            12/26 EMA crossover · Signal line · Histogram divergence
          </p>
        </div>
        <div
          className="flex items-center gap-4 flex-wrap text-xs"
          role="group"
          aria-label="MACD legend"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-primary rounded" aria-hidden="true" />
            <span className="text-muted-foreground">MACD</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-accent rounded" aria-hidden="true" />
            <span className="text-muted-foreground">Signal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success" aria-hidden="true" />
            <div className="w-3 h-3 rounded-sm bg-danger" aria-hidden="true" />
            <span className="text-muted-foreground">Histogram</span>
          </div>
        </div>
      </div>

      {/* Pane 1: Price */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Asset Price
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="macdPriceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
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
              width={65}
            />
            <Tooltip
              content={<CustomTooltip metadata={metadata} />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="close"
              name="Close"
              fill="url(#macdPriceGrad)"
              stroke="var(--primary)"
              strokeWidth={1.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pane 2: MACD + Histogram */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          MACD Oscillator
        </p>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
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
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v.toFixed(2)}
              width={55}
            />
            <Tooltip
              content={<CustomTooltip metadata={metadata} />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar dataKey="macdHistogram" name="Histogram" maxBarSize={4}>
              {chartData.map((entry, index) => (
                <HistogramCell
                  key={`hist-cell-${entry.date}-${index}`}
                  entry={entry}
                  index={index}
                />
              ))}
            </Bar>
            <Line
              type="monotone"
              dataKey="macdLine"
              name="MACD"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="macdSignal"
              name="Signal"
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD Stats */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        role="list"
        aria-label="MACD statistics"
      >
        {macdStats.map((item) => (
          <MACDStatCard key={`macdstat-${item.label}`} item={item} />
        ))}
      </div>
    </div>
  );
});

MACDConvergenceChart.displayName = 'MACDConvergenceChart';

export default MACDConvergenceChart;
