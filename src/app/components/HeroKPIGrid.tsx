// src/components/HeroKPIGrid.tsx
/**
 * Volatix Hero KPI Grid - Production Market Summary Panel
 * Displays key metrics with exchange-aware formatting, optimized for real-time updates
 */

'use client';

import React, { memo, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart2,
  Target,
  Minus,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type { TickerData, TickerMetadata, NormalizedTicker } from '../data/mockData';

// ---------------------------------------------------------------------------
// TYPES
// ---------------------------------------------------------------------------

interface HeroKPIGridProps {
  data: TickerData;
  ticker: string;
  metadata: TickerMetadata;
}

// ---------------------------------------------------------------------------
// FORMATTING UTILITIES (Exchange-aware, pure functions)
// ---------------------------------------------------------------------------

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

function formatVolume(value: number, metadata?: TickerMetadata): string {
  const locale =
    metadata?.ticker.exchange === 'NSE' || metadata?.ticker.exchange === 'BSE' ? 'en-IN' : 'en-US';

  if (!Number.isFinite(value)) return '—';

  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

function getLastUpdatedString(metadata?: TickerMetadata): string {
  const now = new Date();
  const timeZone = metadata?.timezone ?? 'America/New_York';
  const locale =
    metadata?.ticker.exchange === 'NSE' || metadata?.ticker.exchange === 'BSE' ? 'en-IN' : 'en-US';

  try {
    return (
      now.toLocaleDateString(locale, {
        timeZone,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) +
      ` · ${now.toLocaleTimeString(locale, { timeZone, hour: '2-digit', minute: '2-digit', hour12: true })} ${timeZone}`
    );
  } catch {
    return (
      now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' · 16:00 EST'
    );
  }
}

function getCompanyName(metadata?: TickerMetadata): string {
  if (!metadata) return 'Unknown';

  const names: Record<string, string> = {
    NVDA: 'NVIDIA Corporation',
    AAPL: 'Apple Inc.',
    TSLA: 'Tesla, Inc.',
    MSFT: 'Microsoft Corporation',
    AMZN: 'Amazon.com, Inc.',
    META: 'Meta Platforms, Inc.',
    GOOGL: 'Alphabet Inc.',
    SPY: 'SPDR S&P 500 ETF',
    QQQ: 'Invesco QQQ Trust',
    AMD: 'Advanced Micro Devices',
    RELIANCE: 'Reliance Industries',
    TCS: 'Tata Consultancy Services',
    INFY: 'Infosys Ltd.',
    HDFCBANK: 'HDFC Bank Ltd.',
    TATAMOTORS: 'Tata Motors Ltd.',
    SBIN: 'State Bank of India',
    WIPRO: 'Wipro Ltd.',
  };

  const symbol = metadata.ticker.symbol;
  return names[symbol] ?? `${symbol} Inc.`;
}

function getExchangeName(exchange?: NormalizedTicker['exchange']): string {
  const exchanges: Record<string, string> = {
    NASDAQ: 'NASDAQ',
    NYSE: 'NYSE',
    NSE: 'NSE',
    BSE: 'BSE',
    LSE: 'LSE',
    EURONEXT: 'Euronext',
    TSE: 'TSE',
    HKEX: 'HKEX',
  };
  return exchanges[exchange ?? ''] ?? 'UNKNOWN';
}

// ---------------------------------------------------------------------------
// STATE LOGIC (Pure functions)
// ---------------------------------------------------------------------------

type RSIState = 'overbought' | 'oversold' | 'neutral';
type MACDState = 'bullish' | 'bearish';

function getRSIState(rsi: number): RSIState {
  if (rsi > 70) return 'overbought';
  if (rsi < 30) return 'oversold';
  return 'neutral';
}

function getMACDState(histogram: number): MACDState {
  return histogram > 0 ? 'bullish' : 'bearish';
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

const HeroKPIGrid = memo(function HeroKPIGrid({ data, ticker, metadata }: HeroKPIGridProps) {
  // -------------------------------------------------------------------------
  // DERIVED DATA (Memoized) - ALL HOOKS AT TOP LEVEL
  // -------------------------------------------------------------------------

  const summary = data.summary ?? {};
  const normalizedTicker = metadata.ticker;
  const currentPrice = summary.currentPrice ?? 0;
  const prevClose = summary.prevClose ?? 0;
  const rsi = summary.rsi ?? 50;
  const macd = summary.macd ?? { value: 0, signal: 0, histogram: 0 };
  const ma200 = summary.ma200 ?? 0;
  const backtestRMSE = summary.backtestRMSE ?? 0;
  const dailyHigh = summary.dailyHigh ?? 0;
  const dailyLow = summary.dailyLow ?? 0;
  const volume = summary.volume ?? 0;

  const priceChange = useMemo(() => currentPrice - prevClose, [currentPrice, prevClose]);
  const priceChangePct = useMemo(
    () => (prevClose !== 0 ? (priceChange / prevClose) * 100 : 0),
    [priceChange, prevClose]
  );
  const isPositive = useMemo(() => priceChange >= 0, [priceChange]);
  const ma200Dev = useMemo(
    () => (ma200 !== 0 ? ((currentPrice - ma200) / ma200) * 100 : 0),
    [currentPrice, ma200]
  );
  const rsiState = useMemo(() => getRSIState(rsi), [rsi]);
  const macdState = useMemo(() => getMACDState(macd.histogram), [macd.histogram]);
  const ma200Extended = useMemo(() => Math.abs(ma200Dev) > 15, [ma200Dev]);

  const backtestConfidence = useMemo(() => {
    if (backtestRMSE < 0.02)
      return {
        label: 'HIGH CONFIDENCE',
        className: 'bg-success/20 text-positive border border-success/30',
      };
    if (backtestRMSE < 0.05)
      return {
        label: 'GOOD FIT',
        className: 'bg-primary/10 text-primary border border-primary/20',
      };
    return {
      label: 'MODERATE',
      className: 'bg-warning/10 text-warning-amber border border-warning/30',
    };
  }, [backtestRMSE]);

  const companyName = useMemo(() => getCompanyName(metadata), [metadata]);
  const exchangeName = useMemo(
    () => getExchangeName(normalizedTicker?.exchange),
    [normalizedTicker?.exchange]
  );
  const lastUpdated = useMemo(() => getLastUpdatedString(metadata), [metadata]);

  // -------------------------------------------------------------------------
  // EARLY RETURN (after all hooks)
  // -------------------------------------------------------------------------

  if (!data.summary) {
    return (
      <div className="glass-card rounded-xl border border-border p-8 text-center text-muted-foreground">
        Summary data unavailable for {ticker}
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------

  return (
    <div className="animate-fade-in-up space-y-5">
      {/* Ticker Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center flex-wrap gap-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{ticker}</h1>
            <span
              className={`inline-flex items-center gap-1 text-sm font-mono-data font-semibold px-2.5 py-1 rounded-md ${
                isPositive
                  ? 'bg-success/10 text-positive border border-success/20'
                  : 'bg-danger/10 text-negative border border-danger/20'
              }`}
            >
              {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {formatPercent(priceChangePct)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {companyName} · {exchangeName}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="text-xs text-muted-foreground font-mono-data">Last updated</div>
          <div className="text-xs text-foreground font-mono-data">{lastUpdated}</div>
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {/* Hero Card — Current Price (spans 2 rows on lg+) */}
        <div className="lg:row-span-2 glass-card-cyan rounded-xl p-6 glow-cyan flex flex-col justify-between transition-all duration-300 hover:glow-cyan-strong">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
                Current Price
              </span>
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <TrendingUp size={14} className="text-primary" />
              </div>
            </div>
            <div className="font-mono-data text-5xl font-bold text-foreground tracking-tight mb-1">
              {formatPrice(currentPrice, metadata)}
            </div>
            <div
              className={`flex items-center gap-1.5 font-mono-data text-base font-semibold ${isPositive ? 'text-positive' : 'text-negative'}`}
            >
              {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
              {formatPrice(priceChange, metadata, { sign: true })} ({formatPercent(priceChangePct)})
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-primary/10 grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Day High</div>
              <div className="font-mono-data text-sm font-semibold text-foreground">
                {formatPrice(dailyHigh, metadata)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Day Low</div>
              <div className="font-mono-data text-sm font-semibold text-foreground">
                {formatPrice(dailyLow, metadata)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Prev Close</div>
              <div className="font-mono-data text-sm font-semibold text-foreground">
                {formatPrice(prevClose, metadata)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-0.5">Volume</div>
              <div className="font-mono-data text-sm font-semibold text-foreground">
                {formatVolume(volume, metadata)}
              </div>
            </div>
          </div>
        </div>

        {/* RSI Card */}
        <div
          className={`rounded-xl p-5 flex flex-col justify-between transition-all duration-300 ${
            rsiState === 'overbought'
              ? 'glass-card-danger glow-danger hover:glow-danger'
              : rsiState === 'oversold'
                ? 'glass-card-success glow-success'
                : 'glass-card'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              RSI (14)
            </span>
            <Activity
              size={14}
              className={
                rsiState === 'overbought'
                  ? 'text-negative'
                  : rsiState === 'oversold'
                    ? 'text-positive'
                    : 'text-muted-foreground'
              }
            />
          </div>
          <div className="font-mono-data text-3xl font-bold text-foreground">{rsi.toFixed(1)}</div>
          <div className="mt-3">
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                rsiState === 'overbought'
                  ? 'bg-danger/20 text-negative border border-danger/30'
                  : rsiState === 'oversold'
                    ? 'bg-success/20 text-positive border border-success/30'
                    : 'bg-muted text-muted-foreground border border-border'
              }`}
            >
              {rsiState === 'overbought' && <AlertTriangle size={10} />}
              {rsiState === 'oversold' && <CheckCircle size={10} />}
              {rsiState === 'neutral' && <Minus size={10} />}
              {rsiState === 'overbought'
                ? 'OVERBOUGHT — SELL'
                : rsiState === 'oversold'
                  ? 'OVERSOLD — BUY'
                  : 'NEUTRAL'}
            </div>
            <div className="mt-2 w-full h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  rsiState === 'overbought'
                    ? 'bg-danger'
                    : rsiState === 'oversold'
                      ? 'bg-success'
                      : 'bg-primary'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, rsi))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1 font-mono-data">
              <span>0</span>
              <span>30</span>
              <span>70</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* MACD Card */}
        <div
          className={`rounded-xl p-5 flex flex-col justify-between transition-all duration-300 ${
            macdState === 'bullish' ? 'glass-card-success' : 'glass-card-danger'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              MACD Signal
            </span>
            <BarChart2
              size={14}
              className={macdState === 'bullish' ? 'text-positive' : 'text-negative'}
            />
          </div>
          <div
            className={`font-mono-data text-3xl font-bold ${macdState === 'bullish' ? 'text-positive' : 'text-negative'}`}
          >
            {macd.histogram > 0 ? '+' : ''}
            {macd.histogram.toFixed(3)}
          </div>
          <div className="mt-3">
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                macdState === 'bullish'
                  ? 'bg-success/20 text-positive border border-success/30'
                  : 'bg-danger/20 text-negative border border-danger/30'
              }`}
            >
              {macdState === 'bullish' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {macdState === 'bullish' ? 'BULLISH CROSSOVER' : 'BEARISH CROSSOVER'}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">MACD: </span>
                <span className="font-mono-data text-foreground">{macd.value.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Signal: </span>
                <span className="font-mono-data text-foreground">{macd.signal.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MA200 Deviation Card */}
        <div
          className={`rounded-xl p-5 flex flex-col justify-between transition-all duration-300 ${
            ma200Extended ? 'glass-card-warning' : 'glass-card'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              MA200 Deviation
            </span>
            <Target
              size={14}
              className={ma200Extended ? 'text-warning-amber' : 'text-muted-foreground'}
            />
          </div>
          <div
            className={`font-mono-data text-3xl font-bold ${ma200Dev > 0 ? 'text-positive' : 'text-negative'}`}
          >
            {ma200Dev > 0 ? '+' : ''}
            {ma200Dev.toFixed(1)}%
          </div>
          <div className="mt-3">
            <div className="text-xs text-muted-foreground">
              MA200:{' '}
              <span className="font-mono-data text-foreground">{formatPrice(ma200, metadata)}</span>
            </div>
            {ma200Extended && (
              <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-warning-amber border border-warning/30 bg-warning/10 px-2 py-0.5 rounded-full">
                <AlertTriangle size={10} /> Extended from mean
              </div>
            )}
          </div>
        </div>

        {/* Backtest RMSE Card */}
        <div className="glass-card rounded-xl p-5 flex flex-col justify-between transition-all duration-300 hover:border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">
              Backtest RMSE
            </span>
            <CheckCircle size={14} className="text-primary" />
          </div>
          <div className="font-mono-data text-3xl font-bold text-foreground">
            {backtestRMSE.toFixed(3)}
          </div>
          <div className="mt-3">
            <div
              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${backtestConfidence.className}`}
            >
              {backtestConfidence.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Avg Error:{' '}
              <span className="font-mono-data text-foreground">
                ±{(backtestRMSE * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

HeroKPIGrid.displayName = 'HeroKPIGrid';

export default HeroKPIGrid;
