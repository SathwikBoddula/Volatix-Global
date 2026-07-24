// src/app/data/YahooDataProvider.ts
/**
 * Volatix — Yahoo Finance Data Provider (Milestone 2)
 *
 * Real market-data implementation of `IDataProvider`, backed by `yahoo-finance2`.
 * Returns real OHLCV, quote, and metadata; technical indicators are derived from
 * real closes using the existing pure functions. Forecast and backtest remain
 * Volatix-modeled outputs (clearly not from Yahoo), but are computed from the
 * real price history so they stay anchored to reality.
 *
 * INTEGRATION NOTE (M2 scope): this provider is intentionally wired into nothing.
 * `mockData.ts` is imported by a client component, and `yahoo-finance2` is a
 * Node-only library — so registry wiring + the server-only boundary land in
 * Milestone 3. In M2 this file is imported only by its unit test, giving it zero
 * runtime/bundle impact.
 *
 * @server-only  — do not import from a Client Component (enforced at wiring in M3).
 * @module data/YahooDataProvider
 */

import {
  type IDataProvider,
  type DataSourceType,
  type DataResult,
  type DataError,
  type NormalizedTicker,
  type HistoryRow,
  type HistoryRequest,
  type SummaryRequest,
  type ForecastRequest,
  type BacktestRequest,
  type TickerSummary,
  type ForecastRow,
  type BacktestRow,
  type TickerMetadata,
  calculateSMA,
  calculateRSI,
  calculateMACD,
} from './mockData';

// ============================================================================
// INJECTABLE YAHOO CLIENT (structural — decouples us from the library's types)
// ============================================================================

export interface YahooChartQuote {
  date: Date;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  adjclose?: number | null;
}

export interface YahooChartResult {
  quotes: YahooChartQuote[];
}

export interface YahooQuote {
  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  currency?: string;
  longName?: string;
  shortName?: string;
}

export interface YahooQuoteSummary {
  price?: { longName?: string; shortName?: string; currency?: string; exchangeName?: string };
  assetProfile?: { sector?: string; industry?: string };
}

/** Minimal surface of `yahoo-finance2` this provider depends on. */
export interface YahooClient {
  chart(
    symbol: string,
    options: { period1: Date | string; period2?: Date | string; interval?: '1d' | '1wk' | '1mo' }
  ): Promise<YahooChartResult>;
  quote(symbol: string): Promise<YahooQuote>;
  quoteSummary(symbol: string, options: { modules: string[] }): Promise<YahooQuoteSummary>;
}

export interface YahooProviderOptions {
  /** Inject a client (tests, alternate transports). Omit → lazy real yahoo-finance2. */
  client?: YahooClient;
  /** Per-request timeout in ms (default 10s). */
  timeoutMs?: number;
}

/** Cleaned, chronological (oldest→newest) OHLCV bar. */
interface CleanBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Non-retryable "symbol has no data" signal. */
class NoDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoDataError';
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

export class YahooDataProvider implements IDataProvider {
  readonly type: DataSourceType = 'api';
  readonly name = 'YahooDataProvider';

  private client: YahooClient | null;
  private readonly timeoutMs: number;
  /** Coalesces concurrent chart fetches for the same symbol/lookback. */
  private readonly inflightChart = new Map<string, Promise<CleanBar[]>>();

  constructor(options: YahooProviderOptions = {}) {
    this.client = options.client ?? null;
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  supports(ticker: NormalizedTicker): boolean {
    // Yahoo covers US + NSE/BSE (via .NS/.BO). Accept anything with a display symbol.
    return Boolean(ticker?.displaySymbol);
  }

  async getHistory(request: HistoryRequest): Promise<DataResult<HistoryRow[]>> {
    return this.wrap(async () => {
      const symbol = this.yahooSymbol(request.ticker);
      const bars = await this.fetchChartCoalesced(symbol, this.lookbackFor(request.range));
      return this.buildHistory(bars);
    });
  }

  async getSummary(request: SummaryRequest): Promise<DataResult<TickerSummary>> {
    return this.wrap(async () => {
      const symbol = this.yahooSymbol(request.ticker);
      const [bars, quote] = await Promise.all([
        this.fetchChartCoalesced(symbol, this.lookbackFor('1y')),
        this.getClient().then((c) => this.withTimeout(c.quote(symbol), `quote(${symbol})`)),
      ]);

      const recentFirst = [...bars].reverse();
      const closes = recentFirst.map((b) => b.close);
      const { macd, signal, histogram } = calculateMACD(closes, 0);
      const rmse = this.computeRMSE(this.buildBacktest(bars));

      const currentPrice = firstFinite(quote.regularMarketPrice, closes[0]);
      const prevClose = firstFinite(quote.regularMarketPreviousClose, closes[1], closes[0]);

      return {
        currentPrice: round2(currentPrice),
        prevClose: round2(prevClose),
        dailyHigh: round2(firstFinite(quote.regularMarketDayHigh, currentPrice)),
        dailyLow: round2(firstFinite(quote.regularMarketDayLow, currentPrice)),
        volume: Math.round(firstFinite(quote.regularMarketVolume, recentFirst[0]?.volume, 0)),
        rsi: round2(calculateRSI(closes, 0)),
        macd: { value: round4(macd), signal: round4(signal), histogram: round4(histogram) },
        ma100: round2(calculateSMA(closes, 100, 0)),
        ma200: round2(calculateSMA(closes, 200, 0)),
        ma250: round2(calculateSMA(closes, 250, 0)),
        backtestRMSE: rmse,
      };
    });
  }

  async getForecast(request: ForecastRequest): Promise<DataResult<ForecastRow[]>> {
    return this.wrap(async () => {
      const symbol = this.yahooSymbol(request.ticker);
      const bars = await this.fetchChartCoalesced(symbol, this.lookbackFor('1y'));
      return this.buildForecast(bars, request.horizonDays ?? 7);
    });
  }

  async getBacktest(request: BacktestRequest): Promise<DataResult<BacktestRow[]>> {
    return this.wrap(async () => {
      const symbol = this.yahooSymbol(request.ticker);
      const bars = await this.fetchChartCoalesced(symbol, this.lookbackFor('1y'));
      let rows = this.buildBacktest(bars);
      if (request.startDate) rows = rows.filter((r) => r.date >= request.startDate!);
      if (request.endDate) rows = rows.filter((r) => r.date <= request.endDate!);
      return rows;
    });
  }

  async getMetadata(ticker: NormalizedTicker): Promise<DataResult<TickerMetadata>> {
    return this.wrap(async () => {
      const symbol = this.yahooSymbol(ticker);
      const client = await this.getClient();
      // Metadata is best-effort: a profile miss must not fail the whole fetch.
      const summary = await this.withTimeout(
        client.quoteSummary(symbol, { modules: ['price', 'assetProfile'] }),
        `quoteSummary(${symbol})`
      ).catch(() => ({}) as YahooQuoteSummary);

      const isIndia = ticker.exchange === 'NSE' || ticker.exchange === 'BSE';
      return {
        ticker,
        name: summary.price?.longName ?? summary.price?.shortName ?? ticker.symbol,
        currency: summary.price?.currency ?? ticker.currency,
        timezone: isIndia ? 'Asia/Kolkata' : 'America/New_York',
        marketHours: isIndia
          ? { open: '09:15', close: '15:30', timezone: 'Asia/Kolkata' }
          : { open: '09:30', close: '16:00', timezone: 'America/New_York' },
        lotSize: isIndia ? 1 : undefined,
        tickSize: isIndia ? 0.05 : 0.01,
        sector: summary.assetProfile?.sector ?? 'Unknown',
        industry: summary.assetProfile?.industry ?? 'Unknown',
      };
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      const q = await this.withTimeout(client.quote('AAPL'), 'healthCheck');
      return Number.isFinite(q.regularMarketPrice);
    } catch {
      return false;
    }
  }

  // ---- data assembly -------------------------------------------------------

  /** Newest-first indicator series → HistoryRow[] (row 0 = most recent). */
  private buildHistory(bars: CleanBar[]): HistoryRow[] {
    const recentFirst = [...bars].reverse();
    const closes = recentFirst.map((b) => b.close);
    const maxRows = Math.min(recentFirst.length, 400);

    const rows: HistoryRow[] = [];
    for (let i = 0; i < maxRows; i++) {
      const bar = recentFirst[i];
      const { macd, signal, histogram } = calculateMACD(closes, i);
      rows.push({
        date: bar.date,
        open: round2(bar.open),
        high: round2(bar.high),
        low: round2(bar.low),
        close: round2(bar.close),
        volume: Math.round(bar.volume),
        ma100: round2(calculateSMA(closes, 100, i)),
        ma200: round2(calculateSMA(closes, 200, i)),
        ma250: round2(calculateSMA(closes, 250, i)),
        rsi: round2(calculateRSI(closes, i)),
        macdLine: round4(macd),
        macdSignal: round4(signal),
        macdHistogram: round4(histogram),
      });
    }
    return rows;
  }

  /** Deterministic drift/vol projection from the real close series (modeled). */
  private buildForecast(bars: CleanBar[], horizon: number): ForecastRow[] {
    const closes = bars.map((b) => b.close); // chronological
    const last = closes[closes.length - 1];
    const { drift, vol } = estimateReturns(closes);

    const rows: ForecastRow[] = [];
    const baseDate = new Date();
    let price = last;
    for (let i = 0; i < horizon; i++) {
      price = price * (1 + drift);
      const band = price * vol * Math.sqrt(i + 1);
      rows.push({
        date: toDateString(addBusinessDays(baseDate, i + 1)),
        predicted: round2(price),
        low: round2(price - band),
        high: round2(price + band),
        confidence: round1(clamp(85 - i * 4, 50, 95)),
      });
    }
    return rows;
  }

  /** Naive trailing-SMA predictor vs. real actuals over the recent window (modeled). */
  private buildBacktest(bars: CleanBar[]): BacktestRow[] {
    const window = 5;
    const rows: BacktestRow[] = [];
    const start = Math.max(window, bars.length - 120); // last ~120 trading days
    for (let i = start; i < bars.length; i++) {
      let sum = 0;
      for (let j = i - window; j < i; j++) sum += bars[j].close;
      rows.push({
        date: bars[i].date,
        actual: round2(bars[i].close),
        predicted: round2(sum / window),
      });
    }
    return rows;
  }

  private computeRMSE(backtest: BacktestRow[]): number {
    if (backtest.length === 0) return 0;
    const se = backtest.map((b) => ((b.predicted - b.actual) / b.actual) ** 2);
    return round4(Math.sqrt(se.reduce((a, b) => a + b, 0) / se.length));
  }

  // ---- fetching ------------------------------------------------------------

  private async fetchChartCoalesced(symbol: string, lookbackDays: number): Promise<CleanBar[]> {
    const key = `${symbol}:${lookbackDays}`;
    const existing = this.inflightChart.get(key);
    if (existing) return existing;

    const p = this.loadChart(symbol, lookbackDays).finally(() => this.inflightChart.delete(key));
    this.inflightChart.set(key, p);
    return p;
  }

  private async loadChart(symbol: string, lookbackDays: number): Promise<CleanBar[]> {
    const client = await this.getClient();
    const period1 = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
    const result = await this.withTimeout(
      client.chart(symbol, { period1, interval: '1d' }),
      `chart(${symbol})`
    );

    const bars: CleanBar[] = [];
    for (const q of result?.quotes ?? []) {
      if (q == null || q.open == null || q.high == null || q.low == null || q.close == null)
        continue;
      bars.push({
        date: toDateString(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      });
    }
    if (bars.length === 0) throw new NoDataError(`No chart data for ${symbol}`);
    return bars; // chronological (oldest → newest)
  }

  private async getClient(): Promise<YahooClient> {
    if (this.client) return this.client;
    // Lazy, dynamic import: keeps the Node library out of tests and any bundle
    // until this provider is actually used at runtime (server-only, from M3).
    const mod = await import('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf: any = (mod as any).default ?? mod;
    if (typeof yf.suppressNotices === 'function') yf.suppressNotices(['yahooSurvey']);
    this.client = {
      chart: (symbol, options) => yf.chart(symbol, options),
      quote: (symbol) => yf.quote(symbol),
      quoteSummary: (symbol, options) => yf.quoteSummary(symbol, options),
    };
    return this.client;
  }

  // ---- helpers -------------------------------------------------------------

  /** NormalizedTicker → Yahoo symbol. `displaySymbol` is already Yahoo-shaped. */
  private yahooSymbol(ticker: NormalizedTicker): string {
    return ticker.displaySymbol;
  }

  /** Calendar-day lookback, generous enough for a ≥250 trading-day MA window. */
  private lookbackFor(range?: HistoryRequest['range']): number {
    const map: Record<string, number> = {
      '1m': 420,
      '3m': 480,
      '6m': 560,
      '1y': 1000,
      '2y': 1200,
      '5y': 2200,
      max: 3000,
    };
    return map[range ?? '1y'] ?? 1000;
  }

  private async wrap<T>(produce: () => Promise<T>): Promise<DataResult<T>> {
    try {
      const data = await produce();
      return { data, error: null, source: this.type, timestamp: Date.now(), cached: false };
    } catch (err) {
      return {
        data: null,
        error: this.toError(err),
        source: this.type,
        timestamp: Date.now(),
        cached: false,
      };
    }
  }

  private toError(err: unknown): DataError {
    const noData = err instanceof NoDataError;
    return {
      code: noData ? 'YAHOO_NO_DATA' : 'YAHOO_FETCH_FAILED',
      message: err instanceof Error ? err.message : String(err),
      source: this.type,
      retryable: !noData, // network/timeout = retryable; "no data" = not
      details: { provider: this.name },
    };
  }

  private withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Yahoo request timed out after ${this.timeoutMs}ms: ${label}`)),
        this.timeoutMs
      );
      promise.then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        }
      );
    });
  }
}

// ============================================================================
// MODULE-LEVEL PURE HELPERS
// ============================================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function firstFinite(...vals: Array<number | undefined | null>): number {
  for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
  return 0;
}

function toDateString(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().split('T')[0];
}

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function estimateReturns(closes: number[]): { drift: number; vol: number } {
  if (closes.length < 2) return { drift: 0, vol: 0.01 };
  const rets: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (prev > 0) rets.push((closes[i] - prev) / prev);
  }
  if (rets.length === 0) return { drift: 0, vol: 0.01 };
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return { drift: clamp(mean, -0.02, 0.02), vol: Math.sqrt(variance) || 0.01 };
}
