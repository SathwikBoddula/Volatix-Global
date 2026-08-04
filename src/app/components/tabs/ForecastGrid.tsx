// src/components/ForecastGrid.tsx
/**
 * Volatix Forecast Grid - Production Financial Visualization
 * Renders 7-day LSTM forecast with confidence intervals and signals
 * Optimized for real-time updates with memoized data transformations
 */

'use client';

import React, { memo, useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle } from 'lucide-react';
import type { TickerData, TickerMetadata } from '../../data/mockData';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface ForecastGridProps {
  /** Complete ticker dataset from server or client fetch */
  data: TickerData;
  /** Display symbol for UI (e.g., "NVDA", "RELIANCE.NS") */
  ticker: string;
  /** Ticker metadata with exchange/currency/timezone information */
  metadata?: TickerMetadata;
}

interface ForecastRowData {
  date: string;
  predicted: number;
  low: number;
  high: number;
  confidence: number;
}

interface ForecastTableRow extends ForecastRowData {
  deltaFromToday: number;
  deltaFromPrev: number;
  signal: string;
  signalColor: string;
  isUp: boolean;
  isPrevUp: boolean;
}

interface ForecastSummary {
  totalReturn: number;
  maxGain: number;
  isPositiveOutlook: boolean;
  finalDay: ForecastRowData | null;
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

/**
 * Calculate forecast summary metrics
 */
function calculateForecastSummary(
  forecast: ForecastRowData[],
  currentPrice: number
): ForecastSummary {
  if (!forecast?.length) {
    return {
      totalReturn: 0,
      maxGain: 0,
      isPositiveOutlook: false,
      finalDay: null,
    };
  }

  const finalDay = forecast[forecast.length - 1];
  const totalReturn =
    currentPrice !== 0 ? ((finalDay.predicted - currentPrice) / currentPrice) * 100 : 0;

  const maxGain = Math.max(
    ...forecast.map((f) =>
      currentPrice !== 0 ? ((f.predicted - currentPrice) / currentPrice) * 100 : 0
    )
  );

  return {
    totalReturn,
    maxGain,
    isPositiveOutlook: totalReturn > 0,
    finalDay,
  };
}

/**
 * Calculate enriched forecast table rows
 */
function calculateForecastTableRows(
  forecast: ForecastRowData[],
  currentPrice: number
): ForecastTableRow[] {
  if (!forecast?.length) return [];

  return forecast.map((row, idx) => {
    const deltaFromToday =
      currentPrice !== 0 ? ((row.predicted - currentPrice) / currentPrice) * 100 : 0;
    const prevPrice = idx === 0 ? currentPrice : forecast[idx - 1].predicted;
    const deltaFromPrev = prevPrice !== 0 ? ((row.predicted - prevPrice) / prevPrice) * 100 : 0;
    const isUp = deltaFromToday >= 0;
    const isPrevUp = deltaFromPrev >= 0;

    let signal: string;
    if (row.confidence > 75) {
      signal = isUp ? 'Strong Buy' : 'Strong Sell';
    } else {
      signal = isUp ? 'Buy' : 'Sell';
    }

    const signalColor = signal.includes('Buy')
      ? 'text-positive bg-success/10 border-success/20'
      : 'text-negative bg-danger/10 border-danger/20';

    return {
      ...row,
      deltaFromToday,
      deltaFromPrev,
      signal,
      signalColor,
      isUp,
      isPrevUp,
    };
  });
}

/**
 * Get confidence bar color class
 */
function getConfidenceColor(confidence: number): string {
  if (confidence > 75) return 'bg-success';
  if (confidence > 60) return 'bg-primary';
  return 'bg-warning';
}

// ---------------------------------------------------------------------------
// FORECAST TABLE ROW (Memoized sub-component)
// ---------------------------------------------------------------------------

interface ForecastTableRowProps {
  row: ForecastTableRow;
  index: number;
  currentPrice: number;
  metadata?: TickerMetadata;
}

const ForecastTableRow = memo(function ForecastTableRow({
  row,
  index,
  currentPrice: _currentPrice,
  metadata,
}: ForecastTableRowProps) {
  return (
    <tr
      key={`forecast-row-${row.date}`}
      className="border-b border-border/50 hover:bg-white/3 transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-mono-data font-bold text-primary">
            {index + 1}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 font-mono-data text-xs text-foreground">
          <Calendar size={12} className="text-muted-foreground" aria-hidden="true" />
          {row.date}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono-data text-sm font-bold text-foreground">
          {formatPrice(row.predicted, metadata)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`font-mono-data text-xs font-semibold ${row.isUp ? 'text-positive' : 'text-negative'}`}
        >
          {formatPercent(row.deltaFromToday)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className={`font-mono-data text-xs ${row.isPrevUp ? 'text-positive' : 'text-negative'}`}
        >
          {formatPercent(row.deltaFromPrev)}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="font-mono-data text-xs text-muted-foreground">
          {formatPrice(row.low, metadata)} – {formatPrice(row.high, metadata)}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full ${getConfidenceColor(row.confidence)}`}
              style={{ width: `${Math.min(100, Math.max(0, row.confidence))}%` }}
            />
          </div>
          <span className="font-mono-data text-xs text-foreground">
            {row.confidence.toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full border font-mono-data ${row.signalColor}`}
        >
          {row.signal}
        </span>
      </td>
    </tr>
  );
});

ForecastTableRow.displayName = 'ForecastTableRow';

// ---------------------------------------------------------------------------
// MAIN COMPONENT (Memoized, optimized)
// ---------------------------------------------------------------------------

const ForecastGrid = memo(function ForecastGrid({ data, ticker, metadata }: ForecastGridProps) {
  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized)
  // -------------------------------------------------------------------------

  const forecast = data.forecast ?? [];
  const currentPrice = data.summary?.currentPrice ?? 0;

  const summary = useMemo(
    () => calculateForecastSummary(forecast, currentPrice),
    [forecast, currentPrice]
  );

  const tableRows = useMemo(
    () => calculateForecastTableRows(forecast, currentPrice),
    [forecast, currentPrice]
  );

  // Guard against missing data
  if (!data.summary || !forecast.length) {
    return (
      <div className="glass-card rounded-xl border border-border p-8 text-center">
        <div className="text-muted-foreground">No forecast data available for {ticker}</div>
      </div>
    );
  }

  const { totalReturn, maxGain, isPositiveOutlook, finalDay } = summary;

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Header with outlook badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{ticker} 7-Day LSTM Forecast</h2>
          <p className="text-sm text-muted-foreground">
            Predicted closing prices for next 7 business days · 100-day lookback window
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-data font-semibold ${
            isPositiveOutlook
              ? 'bg-success/10 border-success/20 text-positive'
              : 'bg-danger/10 border-danger/20 text-negative'
          }`}
        >
          {isPositiveOutlook ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          7-Day Outlook: {formatPercent(totalReturn)}
        </div>
      </div>

      {/* Summary Banner */}
      <div
        className={`rounded-xl p-4 border flex items-center justify-between ${
          isPositiveOutlook
            ? 'glass-card-success border-success/20'
            : 'glass-card-danger border-danger/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPositiveOutlook ? 'bg-success/20' : 'bg-danger/20'}`}
          >
            {isPositiveOutlook ? (
              <TrendingUp size={18} className="text-positive" aria-hidden="true" />
            ) : (
              <TrendingDown size={18} className="text-negative" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              AI Trajectory: {isPositiveOutlook ? 'Bullish' : 'Bearish'} over 7-day horizon
            </p>
            <p className="text-xs text-muted-foreground">
              From {formatPrice(currentPrice, metadata)} →{' '}
              {formatPrice(finalDay?.predicted ?? 0, metadata)} · Peak at{' '}
              {formatPrice(currentPrice * (1 + maxGain / 100), metadata)}
            </p>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs text-muted-foreground">Confidence</div>
          <div className="font-mono-data text-lg font-bold text-foreground">
            {finalDay?.confidence.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="glass-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Day
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Predicted Close
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Δ from Today
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Δ from Prev
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Range (Low–High)
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                Signal
              </th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, idx) => (
              <ForecastTableRow
                key={`forecast-row-${row.date}`}
                row={row}
                index={idx}
                currentPrice={currentPrice}
                metadata={metadata}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2 px-4 py-3 rounded-lg border border-warning/20 bg-warning/5"
        role="alert"
      >
        <AlertTriangle
          size={14}
          className="text-warning-amber flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <p className="text-xs text-muted-foreground">
          LSTM predictions are generated from historical price patterns and are not financial
          advice. Model accuracy degrades beyond 3–5 days. Always validate against fundamental
          analysis before executing trades.
        </p>
      </div>
    </div>
  );
});

ForecastGrid.displayName = 'ForecastGrid';

export default ForecastGrid;
