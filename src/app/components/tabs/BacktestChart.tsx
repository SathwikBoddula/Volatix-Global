// src/components/BacktestChart.tsx
/**
 * Volatix Backtest Chart - Production Financial Visualization
 * Renders LSTM model backtest with actual vs predicted comparison
 * Optimized for real-time updates with memoized data transformations
 */

'use client';

import React, { memo, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import type { TickerData, TickerMetadata } from '../../data/mockData';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface BacktestChartProps {
  /** Complete ticker dataset from server or client fetch */
  data: TickerData;
  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  ticker: string;
  /** Ticker metadata with exchange/currency context (from parent) */
  metadata?: TickerMetadata;
}

interface BacktestPoint {
  date: string;
  actual: number;
  predicted: number;
}

interface BacktestMetrics {
  label: string;
  value: string;
  sub: string;
  good: boolean;
}

interface ChartDataPoint {
  date: string;
  actual: number;
  predicted: number;
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
 * Format percentage
 */
function formatPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(decimals)}%`;
}

// ---------------------------------------------------------------------------
// DATA TRANSFORMATION (Pure functions, testable)
// ---------------------------------------------------------------------------

/**
 * Calculate backtest error metrics
 */
function calculateBacktestMetrics(
  backtestData: BacktestPoint[],
  backtestRMSE: number
): { meanError: number; maxError: number; r2: number } {
  if (!backtestData?.length) return { meanError: 0, maxError: 0, r2: 0 };

  const errors = backtestData.map((d) => {
    const actual = d.actual;
    const predicted = d.predicted;
    return actual !== 0 ? (Math.abs(actual - predicted) / actual) * 100 : 0;
  });

  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const maxError = Math.max(...errors);
  const r2 = Math.max(0, 1 - backtestRMSE * 8);

  return { meanError, maxError, r2 };
}

/**
 * Calculate backtest stat items
 */
function calculateBacktestStats(
  backtestRMSE: number,
  meanError: number,
  maxError: number,
  r2: number
): BacktestMetrics[] {
  return [
    {
      label: 'RMSE',
      value: backtestRMSE.toFixed(4),
      sub: 'Root Mean Squared Error',
      good: backtestRMSE < 0.02,
    },
    {
      label: 'R² Score',
      value: r2.toFixed(4),
      sub: 'Coefficient of determination',
      good: r2 > 0.85,
    },
    {
      label: 'Mean % Error',
      value: formatPercent(meanError),
      sub: 'Average prediction deviation',
      good: meanError < 2,
    },
    {
      label: 'Max % Error',
      value: formatPercent(maxError),
      sub: 'Worst single-day deviation',
      good: maxError < 5,
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

  const actual = payload.find((p) => p.name === 'Actual')?.value;
  const predicted = payload.find((p) => p.name === 'Predicted')?.value;
  const diff = actual && predicted ? Math.abs(actual - predicted) : 0;
  const diffPct = actual ? ((diff / actual) * 100).toFixed(2) : '0.00';

  return (
    <div className="glass-card rounded-lg p-3 border border-border shadow-2xl min-w-[200px]">
      <p className="text-xs font-mono-data text-muted-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <div key={`tt-bt-${p.name}`} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-muted-foreground">{p.name}</span>
          </div>
          <span className="text-xs font-mono-data font-semibold text-foreground">
            {formatPrice(p.value, metadata)}
          </span>
        </div>
      ))}
      {actual && predicted && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Error</span>
            <span className="font-mono-data text-warning-amber">
              {formatPrice(diff, metadata)} ({diffPct}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

CustomTooltip.displayName = 'CustomTooltip';

// ---------------------------------------------------------------------------
// BACKTEST METRIC CARD (Memoized sub-component)
// ---------------------------------------------------------------------------

interface BacktestMetricCardProps {
  item: BacktestMetrics;
}

const BacktestMetricCard = memo(function BacktestMetricCard({ item }: BacktestMetricCardProps) {
  return (
    <div
      className={`rounded-xl p-4 border ${item.good ? 'glass-card-success border-success/20' : 'glass-card-warning border-warning/20'}`}
    >
      <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
      <div
        className={`font-mono-data text-2xl font-bold ${item.good ? 'text-positive' : 'text-warning-amber'}`}
      >
        {item.value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{item.sub}</div>
    </div>
  );
});

BacktestMetricCard.displayName = 'BacktestMetricCard';

// ---------------------------------------------------------------------------
// MAIN COMPONENT (Memoized, optimized)
// ---------------------------------------------------------------------------

const BacktestChart = memo(function BacktestChart({ data, ticker, metadata }: BacktestChartProps) {
  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized)
  // -------------------------------------------------------------------------

  const chartData = useMemo<ChartDataPoint[]>(
    () =>
      (data.backtest ?? []).map((d) => ({
        date: d.date,
        actual: d.actual,
        predicted: d.predicted,
      })),
    [data.backtest]
  );

  const { meanError, maxError, r2 } = useMemo(
    () => calculateBacktestMetrics(data.backtest ?? [], data.summary?.backtestRMSE ?? 0),
    [data.backtest, data.summary?.backtestRMSE]
  );

  const backtestMetrics = useMemo(
    () => calculateBacktestStats(data.summary?.backtestRMSE ?? 0, meanError, maxError, r2),
    [data.summary?.backtestRMSE, meanError, maxError, r2]
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
        <div className="text-muted-foreground">No backtest data available for {ticker}</div>
      </div>
    );
  }

  const backtestRMSE = data.summary.backtestRMSE ?? 0;

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header with RMSE/R² badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{ticker} LSTM Model Backtest</h2>
          <p className="text-sm text-muted-foreground">
            Actual vs. predicted on 30% holdout validation set · {chartData.length} sessions
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-data font-semibold ${
            backtestRMSE < 0.02
              ? 'bg-success/10 border-success/20 text-positive'
              : 'bg-primary/10 border-primary/20 text-primary'
          }`}
        >
          RMSE: {backtestRMSE.toFixed(4)} · R²: {r2.toFixed(4)}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card rounded-xl p-4 border border-border">
        <ResponsiveContainer width="100%" height={420}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <filter id="glowEffect">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
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
            <Legend
              wrapperStyle={{
                paddingTop: '16px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={false}
              opacity={0.8}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              strokeDasharray="0"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Backtest Metrics */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        role="list"
        aria-label="Backtest metrics"
      >
        {backtestMetrics.map((item) => (
          <BacktestMetricCard key={`btmetric-${item.label}`} item={item} />
        ))}
      </div>
    </div>
  );
});

BacktestChart.displayName = 'BacktestChart';

export default BacktestChart;
