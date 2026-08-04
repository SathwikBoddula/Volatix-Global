// src/components/MovingAveragesChart.tsx
/**
 * Volatix Moving Averages Chart - Production Financial Visualization
 * Renders MA100, MA200, MA250 with close price, exchange-aware formatting
 * Optimized for real-time updates with memoized data transformations
 */

'use client';

import React, { memo, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
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

interface MovingAveragesChartProps {
  /** Complete ticker dataset from server or client fetch */
  data: TickerData;
  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  ticker: string;
  /** Ticker metadata with exchange/currency/timezone information */
  metadata?: TickerMetadata;
}

type MAKey = 'close' | 'ma100' | 'ma200' | 'ma250';

interface MAConfig {
  key: MAKey;
  label: string;
  color: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity?: number;
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
// CHART DATA TRANSFORMATION (Pure functions, testable)
// ---------------------------------------------------------------------------

interface ChartDataPoint {
  date: string;
  close: number;
  ma100: number;
  ma200: number;
  ma250: number;
}

/**
 * Transform history data for chart rendering
 * Takes last N points, reverses for chronological order (oldest first)
 */
function transformChartData(history: TickerData['history'], maxPoints = 250): ChartDataPoint[] {
  if (!history?.length) return [];

  return history
    .slice(-maxPoints)
    .reverse()
    .map((row) => ({
      date: row.date,
      close: row.close,
      ma100: row.ma100,
      ma200: row.ma200,
      ma250: row.ma250,
    }));
}

/**
 * Calculate MA deviation percentage
 */
function calculateMADeviation(currentPrice: number, maValue: number): number {
  if (maValue === 0 || !Number.isFinite(currentPrice) || !Number.isFinite(maValue)) {
    return 0;
  }
  return ((currentPrice - maValue) / maValue) * 100;
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
    <div className="glass-card rounded-lg p-3 border border-border shadow-2xl min-w-[180px]">
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
// MA SUMMARY CARD (Memoized sub-component)
// ---------------------------------------------------------------------------

interface MASummaryCardProps {
  label: string;
  value: number;
  period: string;
  color: string;
  borderClass: string;
  deviation: number;
  metadata?: TickerMetadata;
}

const MASummaryCard = memo(function MASummaryCard({
  label,
  value,
  period,
  color,
  borderClass,
  deviation,
  metadata,
}: MASummaryCardProps) {
  return (
    <div className={`glass-card rounded-xl p-4 border ${borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
          {label}
        </span>
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      </div>
      <div className="font-mono-data text-2xl font-bold text-foreground">
        {formatPrice(value, metadata)}
      </div>
      <div
        className={`text-xs font-mono-data mt-1 ${deviation >= 0 ? 'text-positive' : 'text-negative'}`}
      >
        Price is {deviation >= 0 ? '+' : ''}
        {deviation.toFixed(2)}% {deviation >= 0 ? 'above' : 'below'} {period} avg
      </div>
    </div>
  );
});

MASummaryCard.displayName = 'MASummaryCard';

// ---------------------------------------------------------------------------
// MAIN COMPONENT (Memoized, optimized)
// ---------------------------------------------------------------------------

const MovingAveragesChart = memo(function MovingAveragesChart({
  data,
  ticker,
  metadata,
}: MovingAveragesChartProps) {
  // -------------------------------------------------------------------------
  // STATE (Minimal - only UI toggles)
  // -------------------------------------------------------------------------
  const [visibleMA, setVisibleMA] = React.useState<Record<MAKey, boolean>>({
    close: true,
    ma100: true,
    ma200: true,
    ma250: true,
  });

  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized)
  // -------------------------------------------------------------------------

  const chartData = useMemo(() => transformChartData(data.history, 250), [data.history]);

  const summary = data.summary;

  // All hooks must be called unconditionally before any early return
  const maConfigs = useMemo<MAConfig[]>(
    () => [
      {
        key: 'close',
        label: 'Close Price',
        color: 'var(--foreground)',
        strokeWidth: 1.5,
        opacity: 0.6,
      },
      { key: 'ma100', label: 'MA 100', color: 'var(--primary)', strokeWidth: 2 },
      { key: 'ma200', label: 'MA 200', color: 'var(--accent)', strokeWidth: 2 },
      {
        key: 'ma250',
        label: 'MA 250',
        color: 'var(--warning)',
        strokeWidth: 1.5,
        strokeDasharray: '5 3',
      },
    ],
    []
  );

  const maDeviations = useMemo(
    () => ({
      ma100: calculateMADeviation(summary?.currentPrice ?? 0, summary?.ma100 ?? 0),
      ma200: calculateMADeviation(summary?.currentPrice ?? 0, summary?.ma200 ?? 0),
      ma250: calculateMADeviation(summary?.currentPrice ?? 0, summary?.ma250 ?? 0),
    }),
    [summary?.currentPrice, summary?.ma100, summary?.ma200, summary?.ma250]
  );

  const toggleMA = useCallback((key: MAKey) => {
    setVisibleMA((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // X-axis interval calculation
  const xAxisInterval = useMemo(
    () => Math.max(1, Math.floor(chartData.length / 8)),
    [chartData.length]
  );

  // Guard against missing data
  if (!summary || !chartData.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-8 text-center">
        <div className="text-muted-foreground">No moving average data available for {ticker}</div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header with toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{ticker} Moving Averages</h2>
          <p className="text-sm text-muted-foreground">
            100-day, 200-day, and 250-day rolling averages
          </p>
        </div>
        <div
          className="flex items-center gap-2 flex-wrap"
          role="group"
          aria-label="Moving average visibility"
        >
          {maConfigs.map((cfg) => (
            <button
              key={`toggle-${cfg.key}`}
              onClick={() => toggleMA(cfg.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border ${
                visibleMA[cfg.key]
                  ? 'border-border/50 text-foreground bg-muted/50'
                  : 'border-border/30 text-muted-foreground bg-transparent opacity-50'
              }`}
              aria-pressed={visibleMA[cfg.key]}
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color }} />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="maGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
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
            {visibleMA.close && (
              <Line
                type="monotone"
                dataKey="close"
                name="Close Price"
                stroke="var(--foreground)"
                strokeWidth={1.5}
                dot={false}
                opacity={0.6}
              />
            )}
            {visibleMA.ma100 && (
              <Line
                type="monotone"
                dataKey="ma100"
                name="MA 100"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
            )}
            {visibleMA.ma200 && (
              <Line
                type="monotone"
                dataKey="ma200"
                name="MA 200"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
              />
            )}
            {visibleMA.ma250 && (
              <Line
                type="monotone"
                dataKey="ma250"
                name="MA 250"
                stroke="var(--warning)"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* MA Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MASummaryCard
          label="MA 100"
          value={summary.ma100}
          period="100-day"
          color="var(--primary)"
          borderClass="border-primary/20"
          deviation={maDeviations.ma100}
          metadata={metadata}
        />
        <MASummaryCard
          label="MA 200"
          value={summary.ma200}
          period="200-day"
          color="var(--accent)"
          borderClass="border-accent/20"
          deviation={maDeviations.ma200}
          metadata={metadata}
        />
        <MASummaryCard
          label="MA 250"
          value={summary.ma250}
          period="250-day"
          color="var(--warning)"
          borderClass="border-warning/20"
          deviation={maDeviations.ma250}
          metadata={metadata}
        />
      </div>
    </div>
  );
});

MovingAveragesChart.displayName = 'MovingAveragesChart';

export default MovingAveragesChart;
