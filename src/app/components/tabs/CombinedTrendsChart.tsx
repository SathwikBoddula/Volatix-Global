// src/components/CombinedTrendsChart.tsx
/**
 * Volatix Combined Trends Chart - Production Financial Visualization
 * Renders MA100 vs MA200 crossover analysis with spread metrics
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
} from 'recharts';
import type { TickerData, TickerMetadata } from '../../data/mockData';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface CombinedTrendsChartProps {
  /** Complete ticker dataset from server or client fetch */
  data: TickerData;
  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  ticker: string;
  /** Ticker metadata with exchange/currency context (from upgraded parent) */
  metadata?: TickerMetadata;
}

interface CrossoverEvent {
  date: string;
  type: 'golden' | 'death';
}

interface SpreadMetric {
  label: string;
  value: string;
  positive: boolean;
  isSpread: boolean;
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
 * Format percentage with sign
 */
function formatPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

// ---------------------------------------------------------------------------
// DATA TRANSFORMATION (Pure functions, testable)
// ---------------------------------------------------------------------------

interface ChartDataPoint {
  date: string;
  close: number;
  ma100: number;
  ma200: number;
}

/**
 * Transform history data for chart rendering
 * Takes last N points, reverses for chronological order (oldest first)
 */
function transformChartData(history: TickerData['history'], maxPoints = 200): ChartDataPoint[] {
  if (!history?.length) return [];

  return history
    .slice(-maxPoints)
    .reverse()
    .map((row) => ({
      date: row.date,
      close: row.close,
      ma100: row.ma100,
      ma200: row.ma200,
    }));
}

/**
 * Detect golden/death crossovers in MA data
 */
function detectCrossovers(data: ChartDataPoint[]): CrossoverEvent[] {
  if (!data.length) return [];

  const crossovers: CrossoverEvent[] = [];

  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];

    // Golden cross: MA100 crosses above MA200
    if (prev.ma100 < prev.ma200 && curr.ma100 >= curr.ma200) {
      crossovers.push({ date: curr.date, type: 'golden' });
    }
    // Death cross: MA100 crosses below MA200
    else if (prev.ma100 > prev.ma200 && curr.ma100 <= curr.ma200) {
      crossovers.push({ date: curr.date, type: 'death' });
    }
  }

  return crossovers;
}

/**
 * Calculate spread metrics from summary
 */
function calculateSpreadMetrics(
  summary: TickerData['summary'],
  metadata?: TickerMetadata
): SpreadMetric[] {
  if (!summary) return [];

  const spread = summary.ma100 - summary.ma200;
  const spreadPct = summary.ma200 !== 0 ? (spread / summary.ma200) * 100 : 0;
  const isPositive = spread > 0;

  return [
    {
      label: 'Current Spread',
      value: formatPrice(spread, metadata, { sign: true }),
      positive: isPositive,
      isSpread: true,
    },
    {
      label: 'Spread %',
      value: formatPercent(spreadPct),
      positive: isPositive,
      isSpread: true,
    },
    {
      label: 'MA 100',
      value: formatPrice(summary.ma100, metadata),
      positive: true,
      isSpread: false,
    },
    {
      label: 'MA 200',
      value: formatPrice(summary.ma200, metadata),
      positive: true,
      isSpread: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// TOOLTIP COMPONENT (Memoized, pure)
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
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
      {payload.map((p) => (
        <div key={`tt-${p.name}`} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-muted-foreground">{p.name}</span>
          </div>
          <span className="text-xs font-mono-data font-semibold text-foreground">
            {formatPrice(p.value, metadata)}
          </span>
        </div>
      ))}
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// ---------------------------------------------------------------------------
// SPREAD METRIC CARD (Memoized sub-component)
// ---------------------------------------------------------------------------

interface SpreadMetricCardProps {
  metric: SpreadMetric;
}

const SpreadMetricCard = memo(function SpreadMetricCard({ metric }: SpreadMetricCardProps) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
      <div
        className={`font-mono-data text-sm font-semibold ${
          metric.isSpread
            ? metric.positive
              ? 'text-positive'
              : 'text-negative'
            : 'text-foreground'
        }`}
      >
        {metric.value}
      </div>
    </div>
  );
});

SpreadMetricCard.displayName = 'SpreadMetricCard';

// ---------------------------------------------------------------------------
// CROSSOVER EVENT CARD (Memoized sub-component)
// ---------------------------------------------------------------------------

interface CrossoverEventCardProps {
  event: CrossoverEvent;
}

const CrossoverEventCard = memo(function CrossoverEventCard({ event }: CrossoverEventCardProps) {
  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-data ${
        event.type === 'golden'
          ? 'bg-success/10 border-success/20 text-positive'
          : 'bg-danger/10 border-danger/20 text-negative'
      }`}
    >
      <span>{event.type === 'golden' ? '↑ Golden Cross' : '↓ Death Cross'}</span>
      <span className="text-muted-foreground">{event.date}</span>
    </div>
  );
});

CrossoverEventCard.displayName = 'CrossoverEventCard';

// ---------------------------------------------------------------------------
// MAIN COMPONENT (Memoized, optimized)
// ---------------------------------------------------------------------------

const CombinedTrendsChart = memo(function CombinedTrendsChart({
  data,
  ticker,
  metadata,
}: CombinedTrendsChartProps) {
  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized)
  // -------------------------------------------------------------------------

  const chartData = useMemo(() => transformChartData(data.history, 200), [data.history]);

  const crossovers = useMemo(() => detectCrossovers(chartData), [chartData]);

  const spreadMetrics = useMemo(
    () => calculateSpreadMetrics(data.summary, metadata),
    [data.summary, metadata]
  );

  // X-axis interval calculation — must be above the early return guard
  const xAxisInterval = useMemo(
    () => Math.max(1, Math.floor(chartData.length / 8)),
    [chartData.length]
  );

  // Guard against missing data
  if (!data.summary || !chartData.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-8 text-center">
        <div className="text-muted-foreground">No combined trend data available for {ticker}</div>
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
          <h2 className="text-lg font-semibold text-foreground">{ticker} Combined MA Trends</h2>
          <p className="text-sm text-muted-foreground">
            MA 100 vs MA 200 crossover analysis · 200-day window
          </p>
        </div>
        <div
          className="flex items-center gap-3 flex-wrap"
          role="group"
          aria-label="Crossover legend"
        >
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full bg-success" aria-hidden="true" />
            <span className="text-muted-foreground">Golden Cross (Bullish)</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full bg-danger" aria-hidden="true" />
            <span className="text-muted-foreground">Death Cross (Bearish)</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <ResponsiveContainer width="100%" height={440}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="closeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
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
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatPrice(v, metadata)}
              width={70}
            />
            <Tooltip
              content={<CustomTooltip metadata={metadata} />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Area
              type="monotone"
              dataKey="close"
              name="Close Price"
              fill="url(#closeGrad)"
              stroke="var(--foreground)"
              strokeWidth={1}
              opacity={0.7}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ma100"
              name="MA 100"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ma200"
              name="MA 200"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Crossover Events */}
      {crossovers.length > 0 && (
        <div className="space-y-2" aria-label="Recent crossover events">
          <h3 className="text-sm font-semibold text-foreground">Recent Crossover Events</h3>
          <div className="flex flex-wrap gap-2" role="list">
            {crossovers.slice(-6).map((c) => (
              <CrossoverEventCard key={`cross-${c.date}-${c.type}`} event={c} />
            ))}
          </div>
        </div>
      )}

      {/* MA Spread Analysis */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">
          MA 100 / MA 200 Spread Analysis
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" role="list">
          {spreadMetrics.map((metric) => (
            <SpreadMetricCard key={`spread-${metric.label}`} metric={metric} />
          ))}
        </div>
      </div>
    </div>
  );
});

CombinedTrendsChart.displayName = 'CombinedTrendsChart';

export default CombinedTrendsChart;
