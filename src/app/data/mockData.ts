// src/app/data/mockData.ts
/**
 * Production-ready data layer for Volatix stock analytics platform.
 * Supports multiple data sources (mock, API, cache, database) with a unified interface.
 * Maintains full backward compatibility with existing dashboard components.
 */

// ============================================================================
// PUBLIC TYPES (Preserved for backward compatibility)
// ============================================================================

export interface HistoryRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma100: number;
  ma200: number;
  ma250: number;
  rsi: number;
  macdLine: number;
  macdSignal: number;
  macdHistogram: number;
}

export interface BacktestRow {
  date: string;
  actual: number;
  predicted: number;
}

export interface ForecastRow {
  date: string;
  predicted: number;
  low: number;
  high: number;
  confidence: number;
}

export interface TickerSummary {
  currentPrice: number;
  prevClose: number;
  dailyHigh: number;
  dailyLow: number;
  volume: number;
  rsi: number;
  macd: { value: number; signal: number; histogram: number };
  ma100: number;
  ma200: number;
  ma250: number;
  backtestRMSE: number;
}

export interface TickerData {
  metadata: TickerMetadata;
  summary: TickerSummary;
  history: HistoryRow[];
  backtest: BacktestRow[];
  forecast: ForecastRow[];
}

// ============================================================================
// INTERNAL TYPES (New - for extensibility)
// ============================================================================

/** Supported data source types */
export type DataSourceType = 'mock' | 'api' | 'cache' | 'database';

/** Exchange/market identifiers for global support */
export type ExchangeCode =
  | 'NSE'
  | 'BSE' // India
  | 'NASDAQ'
  | 'NYSE'
  | 'AMEX' // US
  | 'LSE'
  | 'EURONEXT' // Europe
  | 'TSE'
  | 'HKEX' // Asia
  | 'OTHER';

/** Normalized ticker with exchange context */
export interface NormalizedTicker {
  symbol: string;
  exchange: ExchangeCode;
  normalized: string;
  displaySymbol: string;
  currency: string;
}

/** Configuration for a data provider */
export interface DataProviderConfig {
  type: DataSourceType;
  priority: number; // Lower = higher priority
  enabled: boolean;
  timeoutMs?: number;
  cacheTtlMs?: number;
  apiKey?: string;
  baseUrl?: string;
  rateLimit?: { requests: number; windowMs: number };
  customOptions?: Record<string, unknown>;
}

/** Result wrapper for consistent error handling */
export interface DataResult<T> {
  data: T | null;
  error: DataError | null;
  source: DataSourceType;
  timestamp: number;
  cached: boolean;
}

/** Structured error information */
export interface DataError {
  code: string;
  message: string;
  source: DataSourceType;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/** Market metadata for a ticker */
export interface TickerMetadata {
  ticker: NormalizedTicker;
  name: string;
  currency: string;
  timezone: string;
  marketHours: { open: string; close: string; timezone: string };
  lotSize?: number;
  tickSize?: number;
  isin?: string;
  sector?: string;
  industry?: string;
}

/** Request parameters for data fetching */
export interface HistoryRequest {
  ticker: NormalizedTicker;
  interval?: '1d' | '1w' | '1mo';
  range?: '1m' | '3m' | '6m' | '1y' | '2y' | '5y' | 'max';
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  adjusted?: boolean;
}

export interface SummaryRequest {
  ticker: NormalizedTicker;
}

export interface ForecastRequest {
  ticker: NormalizedTicker;
  horizonDays?: number;
  confidenceLevel?: number;
}

export interface BacktestRequest {
  ticker: NormalizedTicker;
  modelVersion?: string;
  startDate?: string;
  endDate?: string;
}

/** Provider interface for data sources */
export interface IDataProvider {
  readonly type: DataSourceType;
  readonly name: string;

  /** Check if provider can handle this ticker */
  supports(ticker: NormalizedTicker): boolean;

  /** Fetch historical OHLCV + indicators */
  getHistory(request: HistoryRequest): Promise<DataResult<HistoryRow[]>>;

  /** Fetch current summary with key indicators */
  getSummary(request: SummaryRequest): Promise<DataResult<TickerSummary>>;

  /** Fetch forecast predictions */
  getForecast(request: ForecastRequest): Promise<DataResult<ForecastRow[]>>;

  /** Fetch backtest results */
  getBacktest(request: BacktestRequest): Promise<DataResult<BacktestRow[]>>;

  /** Fetch ticker metadata */
  getMetadata(ticker: NormalizedTicker): Promise<DataResult<TickerMetadata>>;

  /** Health check */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
// ============================================================================
// DATA MODE (Milestone 1 — flag scaffolding; no runtime effect yet)
// ============================================================================

/** Data source mode. `mock` = simulated data; `live` = real provider (later milestones). */
export type MarketDataMode = 'live' | 'mock';

/**
 * Single source of truth for the active data mode.
 * Defaults to 'mock' so current behavior is unchanged until a real provider is
 * registered (Milestone 2+). Anything other than 'live' resolves to 'mock'.
 */
export function getMarketDataMode(): MarketDataMode {
  return process.env.MARKET_DATA_MODE === 'live' ? 'live' : 'mock';
}

/** Default configuration - can be overridden via environment or config file */
const DEFAULT_PROVIDER_CONFIGS: DataProviderConfig[] = [
  {
    type: 'cache',
    priority: 1,
    enabled: true,
    cacheTtlMs: 5 * 60 * 1000, // 5 minutes
  },
  {
    type: 'mock',
    priority: 100,
    enabled: true,
  },
  // API provider would be added here when ready:
  // {
  //   type: 'api',
  //   priority: 10,
  //   enabled: process.env.ENABLE_REAL_API === 'true',
  //   timeoutMs: 10000,
  //   cacheTtlMs: 60 * 1000,
  //   apiKey: process.env.MARKET_DATA_API_KEY,
  //   baseUrl: process.env.MARKET_DATA_API_URL,
  //   rateLimit: { requests: 100, windowMs: 60000 },
  // },
];

/** Ticker profiles for mock data generation */
const TICKER_PROFILES: Record<string, TickerProfile> = {
  // US Equities
  NVDA: {
    base: 1087.42,
    vol: 0.028,
    trend: 0.0008,
    seed: 42,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'NVDA',
  },
  AAPL: {
    base: 211.56,
    vol: 0.014,
    trend: 0.0003,
    seed: 77,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'AAPL',
  },
  TSLA: {
    base: 248.3,
    vol: 0.038,
    trend: -0.0002,
    seed: 13,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'TSLA',
  },
  MSFT: {
    base: 447.8,
    vol: 0.016,
    trend: 0.0004,
    seed: 55,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'MSFT',
  },
  AMZN: {
    base: 198.45,
    vol: 0.02,
    trend: 0.0005,
    seed: 88,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'AMZN',
  },
  META: {
    base: 523.7,
    vol: 0.022,
    trend: 0.0006,
    seed: 31,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'META',
  },
  GOOGL: {
    base: 178.9,
    vol: 0.017,
    trend: 0.0003,
    seed: 64,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'GOOGL',
  },
  AMD: {
    base: 162.4,
    vol: 0.032,
    trend: 0.0004,
    seed: 47,
    exchange: 'NASDAQ',
    currency: 'USD',
    symbol: 'AMD',
  },

  // US ETFs
  SPY: {
    base: 542.3,
    vol: 0.01,
    trend: 0.0002,
    seed: 99,
    exchange: 'NYSE',
    currency: 'USD',
    isEtf: true,
    symbol: 'SPY',
  },
  QQQ: {
    base: 473.6,
    vol: 0.013,
    trend: 0.0003,
    seed: 22,
    exchange: 'NASDAQ',
    currency: 'USD',
    isEtf: true,
    symbol: 'QQQ',
  },

  // Indian Equities (NSE)
  'RELIANCE.NS': {
    base: 2950.0,
    vol: 0.015,
    trend: 0.0001,
    seed: 101,
    exchange: 'NSE',
    currency: 'INR',
    symbol: 'RELIANCE',
  },
  RELIANCE: {
    base: 2950.0,
    vol: 0.015,
    trend: 0.0001,
    seed: 101,
    exchange: 'NSE',
    currency: 'INR',
    aliasFor: 'RELIANCE.NS',
    symbol: 'RELIANCE',
  },
  'TCS.NS': {
    base: 3850.0,
    vol: 0.012,
    trend: 0.0001,
    seed: 202,
    exchange: 'NSE',
    currency: 'INR',
    symbol: 'TCS',
  },
  TCS: {
    base: 3850.0,
    vol: 0.012,
    trend: 0.0001,
    seed: 202,
    exchange: 'NSE',
    currency: 'INR',
    aliasFor: 'TCS.NS',
    symbol: 'TCS',
  },
  'INFY.NS': {
    base: 1520.0,
    vol: 0.02,
    trend: 0.0002,
    seed: 303,
    exchange: 'NSE',
    currency: 'INR',
    symbol: 'INFY',
  },
  INFY: {
    base: 1520.0,
    vol: 0.02,
    trend: 0.0002,
    seed: 303,
    exchange: 'NSE',
    currency: 'INR',
    aliasFor: 'INFY.NS',
    symbol: 'INFY',
  },
  'HDFCBANK.NS': {
    base: 1610.0,
    vol: 0.013,
    trend: 0.0001,
    seed: 505,
    exchange: 'NSE',
    currency: 'INR',
    symbol: 'HDFCBANK',
  },
  HDFCBANK: {
    base: 1610.0,
    vol: 0.013,
    trend: 0.0001,
    seed: 505,
    exchange: 'NSE',
    currency: 'INR',
    aliasFor: 'HDFCBANK.NS',
    symbol: 'HDFCBANK',
  },
  'TATAMOTORS.NS': {
    base: 940.0,
    vol: 0.028,
    trend: 0.0004,
    seed: 404,
    exchange: 'NSE',
    currency: 'INR',
    symbol: 'TATAMOTORS',
  },
  TATAMOTORS: {
    base: 940.0,
    vol: 0.028,
    trend: 0.0004,
    seed: 404,
    exchange: 'NSE',
    currency: 'INR',
    aliasFor: 'TATAMOTORS.NS',
    symbol: 'TATAMOTORS',
  },
  'SBIN.NS': {
    base: 820.0,
    vol: 0.018,
    trend: 0.0002,
    seed: 606,
    exchange: 'NSE',
    currency: 'INR',
    symbol: 'SBIN',
  },
  SBIN: {
    base: 820.0,
    vol: 0.018,
    trend: 0.0002,
    seed: 606,
    exchange: 'NSE',
    currency: 'INR',
    aliasFor: 'SBIN.NS',
    symbol: 'SBIN',
  },
  'WIPRO.NS': {
    base: 480.0,
    vol: 0.016,
    trend: 0.0001,
    seed: 707,
    exchange: 'NSE',
    currency: 'INR',
    symbol: 'WIPRO',
  },
  WIPRO: {
    base: 480.0,
    vol: 0.016,
    trend: 0.0001,
    seed: 707,
    exchange: 'NSE',
    currency: 'INR',
    aliasFor: 'WIPRO.NS',
    symbol: 'WIPRO',
  },
};

const DEFAULT_PROFILE: TickerProfile = {
  base: 150.0,
  vol: 0.022,
  trend: 0.0003,
  seed: 11,
  exchange: 'OTHER',
  currency: 'USD',
  symbol: 'UNKNOWN',
};

/** Ticker profile for mock generation */
interface TickerProfile {
  base: number;
  vol: number;
  trend: number;
  seed: number;
  exchange: ExchangeCode;
  currency: string;
  symbol: string;
  isEtf?: boolean;
  aliasFor?: string;
}

/** Company name mapping */
const COMPANY_NAMES: Record<string, string> = {
  NVDA: 'NVIDIA Corporation',
  AAPL: 'Apple Inc.',
  TSLA: 'Tesla Inc.',
  MSFT: 'Microsoft Corporation',
  AMZN: 'Amazon.com Inc.',
  META: 'Meta Platforms Inc.',
  GOOGL: 'Alphabet Inc.',
  AMD: 'Advanced Micro Devices Inc.',
  SPY: 'SPDR S&P 500 ETF Trust',
  QQQ: 'Invesco QQQ Trust',
  RELIANCE: 'Reliance Industries Ltd',
  TCS: 'Tata Consultancy Services Ltd',
  INFY: 'Infosys Ltd',
  HDFCBANK: 'HDFC Bank Ltd',
  TATAMOTORS: 'Tata Motors Ltd',
  SBIN: 'State Bank of India',
  WIPRO: 'Wipro Ltd',
};

/** Sector mapping */
const SECTORS: Record<string, string> = {
  NVDA: 'Technology',
  AAPL: 'Technology',
  MSFT: 'Technology',
  AMD: 'Technology',
  TSLA: 'Consumer Cyclical',
  AMZN: 'Consumer Cyclical',
  META: 'Communication Services',
  GOOGL: 'Communication Services',
  SPY: 'Financial Services',
  QQQ: 'Financial Services',
  RELIANCE: 'Energy',
  TCS: 'Technology',
  INFY: 'Technology',
  HDFCBANK: 'Financial Services',
  TATAMOTORS: 'Consumer Cyclical',
  SBIN: 'Financial Services',
  WIPRO: 'Technology',
};

/** Industry mapping */
const INDUSTRIES: Record<string, string> = {
  NVDA: 'Semiconductors',
  AMD: 'Semiconductors',
  AAPL: 'Consumer Electronics',
  MSFT: 'Software—Infrastructure',
  TSLA: 'Auto Manufacturers',
  AMZN: 'Internet Retail',
  META: 'Internet Content & Information',
  GOOGL: 'Internet Content & Information',
  RELIANCE: 'Oil & Gas Integrated',
  TCS: 'Information Technology Services',
  INFY: 'Information Technology Services',
  HDFCBANK: 'Banks—Regional',
  TATAMOTORS: 'Auto Manufacturers',
  SBIN: 'Banks—Regional',
  WIPRO: 'Information Technology Services',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Deterministic seeded random number generator (Mulberry32) */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Add business days (skip weekends) */
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

/** Subtract business days */
function subtractBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let subtracted = 0;
  while (subtracted < days) {
    result.setDate(result.getDate() - 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) subtracted++;
  }
  return result;
}

/** Format date as YYYY-MM-DD */
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/** Parse ticker string into normalized form */
export function normalizeTicker(rawTicker: string): NormalizedTicker {
  const upper = rawTicker.trim().toUpperCase();

  // Handle NSE suffixes
  if (upper.endsWith('.NS') || upper.endsWith('.BO')) {
    const symbol = upper.slice(0, -3);
    const exchange: ExchangeCode = upper.endsWith('.NS') ? 'NSE' : 'BSE';
    return {
      symbol,
      exchange,
      normalized: `${exchange}:${symbol}`,
      displaySymbol: upper,
      currency: 'INR',
    };
  }

  // Check if it's a known NSE ticker without suffix
  const nseTickers = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'TATAMOTORS', 'SBIN', 'WIPRO'];
  if (nseTickers.includes(upper)) {
    return {
      symbol: upper,
      exchange: 'NSE',
      normalized: `NSE:${upper}`,
      displaySymbol: `${upper}.NS`,
      currency: 'INR',
    };
  }

  // Default to US/NASDAQ for known tickers
  const usTickers = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD', 'SPY', 'QQQ'];
  if (usTickers.includes(upper)) {
    const exchange: ExchangeCode = ['SPY'].includes(upper) ? 'NYSE' : 'NASDAQ';
    return {
      symbol: upper,
      exchange,
      normalized: `${exchange}:${upper}`,
      displaySymbol: upper,
      currency: 'USD',
    };
  }

  // Fallback: assume US ticker
  return {
    symbol: upper,
    exchange: 'NASDAQ',
    normalized: `NASDAQ:${upper}`,
    displaySymbol: upper,
    currency: 'USD',
  };
}

/** Get profile for a normalized ticker */
function getProfile(ticker: NormalizedTicker): TickerProfile {
  // Try display symbol first (e.g., "RELIANCE.NS")
  if (TICKER_PROFILES[ticker.displaySymbol]) {
    return TICKER_PROFILES[ticker.displaySymbol];
  }
  // Try normalized form
  if (TICKER_PROFILES[ticker.normalized]) {
    return TICKER_PROFILES[ticker.normalized];
  }
  // Try raw symbol
  if (TICKER_PROFILES[ticker.symbol]) {
    return TICKER_PROFILES[ticker.symbol];
  }
  return DEFAULT_PROFILE;
}

// ============================================================================
// TECHNICAL INDICATOR CALCULATIONS (Pure functions, tested, reusable)
// ============================================================================

/** Calculate Simple Moving Average */
function calculateSMA(prices: number[], window: number, index: number): number {
  if (index + window > prices.length) return prices[index];
  const slice = prices.slice(index, index + window);
  return slice.reduce((sum, p) => sum + p, 0) / window;
}

/** Calculate Exponential Moving Average */
function calculateEMA(prices: number[], index: number, period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[Math.min(index + period - 1, prices.length - 1)];
  for (let i = Math.min(index + period - 2, prices.length - 2); i >= index; i--) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

/** Calculate RSI (Wilder's smoothing) */
function calculateRSI(prices: number[], index: number, period: number = 14): number {
  const end = Math.min(index + period + 1, prices.length);
  if (end - index < 2) return 50;

  let avgGain = 0;
  let avgLoss = 0;
  let first = true;

  for (let i = index; i < end - 1; i++) {
    const diff = prices[i] - prices[i + 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    if (first) {
      avgGain = gain;
      avgLoss = loss;
      first = false;
    } else {
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Calculate MACD components */
function calculateMACD(
  prices: number[],
  index: number
): { macd: number; signal: number; histogram: number } {
  const ema12 = calculateEMA(prices, index, 12);
  const ema26 = calculateEMA(prices, index, 26);
  const macdLine = ema12 - ema26;

  // Signal line: EMA9 of MACD (approximated using recent MACD values)
  // For mock data, we use a deterministic approximation
  const macdSignal = macdLine * 0.85; // Simplified for consistency
  const macdHistogram = macdLine - macdSignal;

  return { macd: macdLine, signal: macdSignal, histogram: macdHistogram };
}

// ============================================================================
// CACHE IMPLEMENTATION
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize = 1000;

  private makeKey(provider: DataSourceType, method: string, params: unknown): string {
    return `${provider}:${method}:${JSON.stringify(params)}`;
  }

  get<T>(provider: DataSourceType, method: string, params: unknown, ttlMs: number): T | null {
    const key = this.makeKey(provider, method, params);
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(provider: DataSourceType, method: string, params: unknown, data: T, ttlMs: number): void {
    if (this.cache.size >= this.maxSize) {
      // Simple LRU: delete oldest
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    const key = this.makeKey(provider, method, params);
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) this.cache.delete(key);
    }
  }
}

const dataCache = new DataCache();

// ============================================================================
// MOCK DATA PROVIDER (Production-grade, deterministic, realistic)
// ============================================================================

class MockDataProvider implements IDataProvider {
  readonly type: DataSourceType = 'mock';
  readonly name = 'MockDataProvider';

  supports(ticker: NormalizedTicker): boolean {
    // Mock provider supports everything as fallback
    return true;
  }

  async getHistory(request: HistoryRequest): Promise<DataResult<HistoryRow[]>> {
    try {
      const profile = getProfile(request.ticker);
      const rand = createSeededRandom(profile.seed);
      const baseDate = new Date();

      // Determine number of days based on range
      const rangeDays = this.getRangeDays(request.range ?? '1y');
      const totalDays = Math.min(rangeDays + 260, 500); // Extra for indicators

      // Generate price series using GBM with mean reversion
      const prices = this.generatePriceSeries(profile, totalDays, rand);
      prices.reverse(); // Most recent first

      const history: HistoryRow[] = [];
      const maxRows = Math.min(totalDays - 260, 400);

      for (let i = 0; i < maxRows; i++) {
        const close = prices[i];
        const dayRand = createSeededRandom(profile.seed + i);
        const dayVol = profile.vol * 0.6;

        const open = close * (1 + (dayRand() - 0.5) * dayVol);
        const high = Math.max(open, close) * (1 + dayRand() * dayVol * 0.5);
        const low = Math.min(open, close) * (1 - dayRand() * dayVol * 0.5);
        const volume = this.generateVolume(profile, dayRand);

        const ma100 = calculateSMA(prices, 100, i);
        const ma200 = calculateSMA(prices, 200, i);
        const ma250 = calculateSMA(prices, 250, i);
        const rsi = calculateRSI(prices, i);
        const { macd, signal, histogram } = calculateMACD(prices, i);

        const rowDate = subtractBusinessDays(baseDate, i);

        history.push({
          date: formatDate(rowDate),
          open: this.round2(open),
          high: this.round2(high),
          low: this.round2(low),
          close: this.round2(close),
          volume,
          ma100: this.round2(ma100),
          ma200: this.round2(ma200),
          ma250: this.round2(ma250),
          rsi: this.round2(rsi),
          macdLine: this.round4(macd),
          macdSignal: this.round4(signal),
          macdHistogram: this.round4(histogram),
        });
      }

      return { data: history, error: null, source: 'mock', timestamp: Date.now(), cached: false };
    } catch (err) {
      return this.wrapError(err, 'mock');
    }
  }

  async getSummary(request: SummaryRequest): Promise<DataResult<TickerSummary>> {
    try {
      const profile = getProfile(request.ticker);
      const rand = createSeededRandom(profile.seed);
      const prices = this.generatePriceSeries(profile, 500, rand).reverse();

      const currentPrice = prices[0];
      const prevClose = prices[1];
      const dayRand = createSeededRandom(profile.seed + 99999);

      const dailyHigh = this.round2(currentPrice * (1 + dayRand() * profile.vol * 0.6));
      const dailyLow = this.round2(currentPrice * (1 - dayRand() * profile.vol * 0.6));
      const volume = this.generateVolume(profile, dayRand);

      const rsi = this.round2(calculateRSI(prices, 0));
      const { macd, signal, histogram } = calculateMACD(prices, 0);

      const ma100 = this.round2(calculateSMA(prices, 100, 0));
      const ma200 = this.round2(calculateSMA(prices, 200, 0));
      const ma250 = this.round2(calculateSMA(prices, 250, 0));

      // Generate backtest for RMSE
      const backtest = await this.generateBacktest(profile, prices);
      const squaredErrors = backtest.map((b) => Math.pow((b.predicted - b.actual) / b.actual, 2));
      const rmse = this.round4(
        Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length)
      );

      return {
        data: {
          currentPrice: this.round2(currentPrice),
          prevClose: this.round2(prevClose),
          dailyHigh,
          dailyLow,
          volume,
          rsi,
          macd: {
            value: this.round4(macd),
            signal: this.round4(signal),
            histogram: this.round4(histogram),
          },
          ma100,
          ma200,
          ma250,
          backtestRMSE: rmse,
        },
        error: null,
        source: 'mock',
        timestamp: Date.now(),
        cached: false,
      };
    } catch (err) {
      return this.wrapError(err, 'mock');
    }
  }

  async getForecast(request: ForecastRequest): Promise<DataResult<ForecastRow[]>> {
    try {
      const profile = getProfile(request.ticker);
      const rand = createSeededRandom(profile.seed);
      const prices = this.generatePriceSeries(profile, 500, rand).reverse();

      const horizon = request.horizonDays ?? 7;
      const forecast: ForecastRow[] = [];
      let forecastPrice = prices[0];
      const baseDate = new Date();

      for (let i = 0; i < horizon; i++) {
        const dayRand = createSeededRandom(profile.seed + i + 9000);
        const dailyShift = (dayRand() - 0.48) * profile.vol * forecastPrice;
        forecastPrice += dailyShift;

        const uncertainty = 0.008 + i * 0.003;
        const low = this.round2(forecastPrice * (1 - uncertainty));
        const high = this.roundPrice(forecastPrice * (1 + uncertainty));
        const confidence = this.round1(Math.max(55, 82 - i * 3.5 + (dayRand() - 0.5) * 4));
        const fDate = addBusinessDays(baseDate, i + 1);

        forecast.push({
          date: formatDate(fDate),
          predicted: this.round2(forecastPrice),
          low,
          high,
          confidence,
        });
      }

      return { data: forecast, error: null, source: 'mock', timestamp: Date.now(), cached: false };
    } catch (err) {
      return this.wrapError(err, 'mock');
    }
  }

  async getBacktest(request: BacktestRequest): Promise<DataResult<BacktestRow[]>> {
    try {
      const profile = getProfile(request.ticker);
      const rand = createSeededRandom(profile.seed);
      const prices = this.generatePriceSeries(profile, 500, rand).reverse();

      const backtest = await this.generateBacktest(
        profile,
        prices,
        request.startDate,
        request.endDate
      );
      return { data: backtest, error: null, source: 'mock', timestamp: Date.now(), cached: false };
    } catch (err) {
      return this.wrapError(err, 'mock');
    }
  }

  async getMetadata(ticker: NormalizedTicker): Promise<DataResult<TickerMetadata>> {
    const profile = getProfile(ticker);
    const metadata: TickerMetadata = {
      ticker,
      name: this.getCompanyName(ticker.symbol),
      currency: profile.currency,
      timezone: profile.exchange === 'NSE' ? 'Asia/Kolkata' : 'America/New_York',
      marketHours:
        profile.exchange === 'NSE'
          ? { open: '09:15', close: '15:30', timezone: 'Asia/Kolkata' }
          : { open: '09:30', close: '16:00', timezone: 'America/New_York' },
      lotSize: profile.exchange === 'NSE' ? 1 : undefined,
      tickSize: profile.exchange === 'NSE' ? 0.05 : 0.01,
      sector: this.getSector(ticker.symbol),
      industry: this.getIndustry(ticker.symbol),
    };
    return { data: metadata, error: null, source: 'mock', timestamp: Date.now(), cached: false };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  // ---- Private helpers ----

  private getRangeDays(range: string): number {
    const ranges: Record<string, number> = {
      '1m': 30,
      '3m': 90,
      '6m': 180,
      '1y': 365,
      '2y': 730,
      '5y': 1825,
      max: 2000,
    };
    return ranges[range] ?? 365;
  }

  private generatePriceSeries(profile: TickerProfile, days: number, rand: () => number): number[] {
    const prices: number[] = [profile.base];
    for (let i = 1; i < days; i++) {
      const r = rand();
      const shock = (r - 0.5) * 2 * profile.vol;
      const prev = prices[i - 1];
      const target = profile.base * (1 + profile.trend * i);
      const meanReversion = (target - prev) * 0.01;
      const next = Math.max(prev * (1 + shock) + meanReversion, profile.base * 0.3);
      prices.push(next);
    }
    return prices;
  }

  private generateVolume(profile: TickerProfile, rand: () => number): number {
    const baseVol = profile.isEtf ? 50_000_000 : 15_000_000;
    const multiplier = profile.symbol === 'NVDA' ? 2.5 : 1;
    return Math.floor((baseVol + rand() * 40_000_000) * multiplier);
  }

  private async generateBacktest(
    profile: TickerProfile,
    prices: number[],
    startDate?: string,
    endDate?: string
  ): Promise<BacktestRow[]> {
    const backtest: BacktestRow[] = [];
    const startIdx = 120;
    const endIdx = Math.min(240, prices.length - 1);

    for (let i = startIdx; i < endIdx; i++) {
      const actual = this.round2(prices[i]);
      const noiseRand = createSeededRandom(profile.seed + i + 5000);
      const noise = (noiseRand() - 0.5) * actual * 0.018;
      const predicted = this.round2(actual + noise);

      const rowDate = subtractBusinessDays(new Date(), i);
      const dateStr = formatDate(rowDate);

      // Filter by date range if provided
      if (startDate && dateStr < startDate) continue;
      if (endDate && dateStr > endDate) continue;

      backtest.push({ date: dateStr, actual, predicted });
    }
    return backtest;
  }

  private getCompanyName(symbol: string): string {
    return COMPANY_NAMES[symbol] ?? `${symbol} Inc.`;
  }

  private getSector(symbol: string): string {
    return SECTORS[symbol] ?? 'Unknown';
  }

  private getIndustry(symbol: string): string {
    return INDUSTRIES[symbol] ?? 'Unknown';
  }

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }
  private round4(n: number): number {
    return Math.round(n * 10000) / 10000;
  }
  private round1(n: number): number {
    return Math.round(n * 10) / 10;
  }
  private roundPrice(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private wrapError(err: unknown, source: DataSourceType): DataResult<never> {
    const error: DataError = {
      code: 'MOCK_GENERATION_FAILED',
      message: err instanceof Error ? err.message : 'Unknown error in mock data generation',
      source,
      retryable: false,
      details: { originalError: String(err) },
    };
    return { data: null, error, source, timestamp: Date.now(), cached: false };
  }
}

// ============================================================================
// CACHE PROVIDER (Wraps other providers with caching)
// ============================================================================

class CacheProvider implements IDataProvider {
  readonly type: DataSourceType = 'cache';
  readonly name = 'CacheProvider';

  private wrapped: IDataProvider | null = null;
  private defaultTtl = 5 * 60 * 1000; // 5 minutes

  setWrappedProvider(provider: IDataProvider): void {
    this.wrapped = provider;
  }

  setDefaultTtl(ttlMs: number): void {
    this.defaultTtl = ttlMs;
  }

  supports(ticker: NormalizedTicker): boolean {
    return this.wrapped?.supports(ticker) ?? false;
  }

  private async cached<T>(
    method: string,
    params: unknown,
    fetchFn: () => Promise<DataResult<T>>,
    ttlMs?: number
  ): Promise<DataResult<T>> {
    const ttl = ttlMs ?? this.defaultTtl;

    // Try cache first
    const cached = dataCache.get<T>(this.type, method, params, ttl);
    if (cached) {
      return { data: cached, error: null, source: this.type, timestamp: Date.now(), cached: true };
    }

    // Fetch fresh
    const result = await fetchFn();
    if (result.data !== null && !result.error) {
      dataCache.set(this.type, method, params, result.data, ttl);
    }
    return { ...result, cached: false };
  }

  async getHistory(request: HistoryRequest): Promise<DataResult<HistoryRow[]>> {
    if (!this.wrapped) {
      return {
        data: null,
        error: {
          code: 'NO_WRAPPED_PROVIDER',
          message: 'Cache provider has no wrapped provider',
          source: 'cache',
          retryable: false,
        },
        source: 'cache',
        timestamp: Date.now(),
        cached: false,
      };
    }
    const wrapped = this.wrapped;
    return this.cached('getHistory', request, () => this.wrapped!.getHistory(request));
  }

  async getSummary(request: SummaryRequest): Promise<DataResult<TickerSummary>> {
    if (!this.wrapped) {
      return {
        data: null,
        error: {
          code: 'NO_WRAPPED_PROVIDER',
          message: 'Cache provider has no wrapped provider',
          source: 'cache',
          retryable: false,
        },
        source: 'cache',
        timestamp: Date.now(),
        cached: false,
      };
    }
    const wrapped = this.wrapped;
    return this.cached('getSummary', request, () => this.wrapped!.getSummary(request));
  }

  async getForecast(request: ForecastRequest): Promise<DataResult<ForecastRow[]>> {
    if (!this.wrapped) {
      return {
        data: null,
        error: {
          code: 'NO_WRAPPED_PROVIDER',
          message: 'Cache provider has no wrapped provider',
          source: 'cache',
          retryable: false,
        },
        source: 'cache',
        timestamp: Date.now(),
        cached: false,
      };
    }
    const wrapped = this.wrapped;
    return this.cached('getForecast', request, () => this.wrapped!.getForecast(request));
  }

  async getBacktest(request: BacktestRequest): Promise<DataResult<BacktestRow[]>> {
    if (!this.wrapped) {
      return {
        data: null,
        error: {
          code: 'NO_WRAPPED_PROVIDER',
          message: 'Cache provider has no wrapped provider',
          source: 'cache',
          retryable: false,
        },
        source: 'cache',
        timestamp: Date.now(),
        cached: false,
      };
    }
    const wrapped = this.wrapped;
    return this.cached('getBacktest', request, () => this.wrapped!.getBacktest(request));
  }

  async getMetadata(ticker: NormalizedTicker): Promise<DataResult<TickerMetadata>> {
    if (!this.wrapped) {
      return {
        data: null,
        error: {
          code: 'NO_WRAPPED_PROVIDER',
          message: 'Cache provider has no wrapped provider',
          source: 'cache',
          retryable: false,
        },
        source: 'cache',
        timestamp: Date.now(),
        cached: false,
      };
    }
    const wrapped = this.wrapped;
    return this.cached(
      'getMetadata',
      ticker,
      () => this.wrapped!.getMetadata(ticker),
      60 * 60 * 1000
    ); // 1 hour for metadata
  }

  async healthCheck(): Promise<boolean> {
    return this.wrapped?.healthCheck() ?? false;
  }

  invalidatePattern(pattern: string): void {
    dataCache.invalidatePattern(pattern);
  }

  clear(): void {
    dataCache.clear();
  }
}

// ============================================================================
// PROVIDER REGISTRY & FACTORY
// ============================================================================

class ProviderRegistry {
  private providers: IDataProvider[] = [];
  private cacheProvider = new CacheProvider();
  private initialized = false;

  initialize(configs: DataProviderConfig[] = DEFAULT_PROVIDER_CONFIGS): void {
    if (this.initialized) return;

    // Sort by priority
    const sorted = [...configs].sort((a, b) => a.priority - b.priority);

    for (const config of sorted) {
      if (!config.enabled) continue;

      let provider: IDataProvider | null = null;

      switch (config.type) {
        case 'mock':
          provider = new MockDataProvider();
          break;
        case 'cache':
          // Cache provider wraps the next available provider
          this.cacheProvider.setDefaultTtl(config.cacheTtlMs ?? 5 * 60 * 1000);
          provider = this.cacheProvider;
          break;
        case 'api':
          // Placeholder for future API provider
          // provider = new ApiDataProvider(config);
          console.warn('[DataLayer] API provider not yet implemented');
          break;
        case 'database':
          // Placeholder for future database provider
          console.warn('[DataLayer] Database provider not yet implemented');
          break;
      }

      if (provider) {
        this.providers.push(provider);
      }
    }

    // Set up cache wrapping
    const mockProvider = this.providers.find((p) => p.type === 'mock');
    if (mockProvider && this.providers.some((p) => p.type === 'cache')) {
      this.cacheProvider.setWrappedProvider(mockProvider);
    }

    this.initialized = true;
  }

  getProviders(): IDataProvider[] {
    return [...this.providers];
  }

  getCacheProvider(): CacheProvider {
    return this.cacheProvider;
  }

  /** Find the best provider for a ticker */
  resolveProvider(ticker: NormalizedTicker): IDataProvider | null {
    for (const provider of this.providers) {
      if (provider.supports(ticker)) return provider;
    }
    return null;
  }

  /** Invalidate cache for a ticker */
  invalidateCache(ticker?: NormalizedTicker): void {
    if (ticker) {
      this.cacheProvider.invalidatePattern(ticker.normalized);
    } else {
      this.cacheProvider.clear();
    }
  }
}

const providerRegistry = new ProviderRegistry();

// Initialize on module load
providerRegistry.initialize();

// ============================================================================
// PUBLIC API (Backward compatible)
// ============================================================================

/**
 * Main entry point - generates complete ticker data for dashboard components.
 * Maintains exact same signature and return type as original generateMockData.
 * Now uses the provider architecture with caching and fallback.
 */
export async function generateMockData(ticker: string): Promise<TickerData | null> {
  const normalized = normalizeTicker(ticker);
  const provider = providerRegistry.resolveProvider(normalized);

  if (!provider) {
    console.error(`[DataLayer] No provider supports ticker: ${ticker}`);
    return null;
  }

  try {
    // Fetch all data in parallel for performance
    const [metadataResult, historyResult, summaryResult, forecastResult, backtestResult] =
      await Promise.all([
        provider.getMetadata(normalized),
        provider.getHistory({ ticker: normalized, range: '1y' }),
        provider.getSummary({ ticker: normalized }),
        provider.getForecast({ ticker: normalized, horizonDays: 7 }),
        provider.getBacktest({ ticker: normalized }),
      ]);

    // Check for errors
    const errors = [metadataResult, historyResult, summaryResult, forecastResult, backtestResult]
      .filter((r) => r.error)
      .map((r) => r.error!);

    if (errors.length > 0) {
      // If mock provider fails, something is seriously wrong
      console.error('[DataLayer] Data fetch errors:', errors);
      // Try to return partial data if summary succeeded
      if (summaryResult.data && historyResult.data) {
        return {
          metadata: metadataResult.data!,
          summary: summaryResult.data,
          history: historyResult.data,
          backtest: backtestResult.data ?? [],
          forecast: forecastResult.data ?? [],
        };
      }
      return null;
    }

    return {
      metadata: metadataResult.data!,
      summary: summaryResult.data!,
      history: historyResult.data!,
      backtest: backtestResult.data!,
      forecast: forecastResult.data!,
    };
  } catch (err) {
    console.error('[DataLayer] Unexpected error in generateMockData:', err);
    return null;
  }
}

/** Synchronous version for backward compatibility (uses mock provider directly) */
export function generateMockDataSync(ticker: string): TickerData | null {
  const normalized = normalizeTicker(ticker);
  const mockProvider = providerRegistry.getProviders().find((p) => p.type === 'mock') as
    | MockDataProvider
    | undefined;

  if (!mockProvider) {
    console.error('[DataLayer] Mock provider not available');
    return null;
  }

  try {
    // Run synchronously by using the mock provider's internal logic directly
    // This maintains exact backward compatibility for synchronous callers
    return runMockGenerationSync(mockProvider, normalized);
  } catch (err) {
    console.error('[DataLayer] Sync generation failed:', err);
    return null;
  }
}

/** Internal sync runner for backward compatibility */
function runMockGenerationSync(
  provider: MockDataProvider,
  ticker: NormalizedTicker
): TickerData | null {
  const profile = getProfile(ticker);
  const rand = createSeededRandom(profile.seed);
  const baseDate = new Date();
  const TOTAL_DAYS = 500;

  // Generate price series
  const prices: number[] = [profile.base];
  for (let i = 1; i < TOTAL_DAYS; i++) {
    const r = rand();
    const shock = (r - 0.5) * 2 * profile.vol;
    const prev = prices[i - 1];
    const meanReversion = (profile.base * (1 + profile.trend * i) - prev) * 0.01;
    const next = Math.max(prev * (1 + shock) + meanReversion, profile.base * 0.3);
    prices.push(next);
  }
  prices.reverse();

  // Build history
  const history: HistoryRow[] = [];
  for (let i = 0; i < Math.min(TOTAL_DAYS - 260, 400); i++) {
    const close = prices[i];
    const dayRand = createSeededRandom(profile.seed + i);
    const dayVol = profile.vol * 0.6;
    const open = close * (1 + (dayRand() - 0.5) * dayVol);
    const high = Math.max(open, close) * (1 + dayRand() * dayVol * 0.5);
    const low = Math.min(open, close) * (1 - dayRand() * dayVol * 0.5);
    const volume = Math.floor(
      (15_000_000 + dayRand() * 40_000_000) * (ticker.symbol === 'NVDA' ? 2.5 : 1)
    );

    const ma100 = calculateSMA(prices, 100, i);
    const ma200 = calculateSMA(prices, 200, i);
    const ma250 = calculateSMA(prices, 250, i);
    const rsi = calculateRSI(prices, i);
    const { macd, signal, histogram } = calculateMACD(prices, i);
    const rowDate = subtractBusinessDays(baseDate, i);

    history.push({
      date: formatDate(rowDate),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
      ma100: parseFloat(ma100.toFixed(2)),
      ma200: parseFloat(ma200.toFixed(2)),
      ma250: parseFloat(ma250.toFixed(2)),
      rsi: parseFloat(rsi.toFixed(2)),
      macdLine: parseFloat(macd.toFixed(4)),
      macdSignal: parseFloat(signal.toFixed(4)),
      macdHistogram: parseFloat(histogram.toFixed(4)),
    });
  }

  // Build backtest
  const backtest: BacktestRow[] = [];
  for (let i = 120; i < 240 && i < history.length; i++) {
    const actual = history[i].close;
    const noiseRand = createSeededRandom(profile.seed + i + 5000);
    const noise = (noiseRand() - 0.5) * actual * 0.018;
    const predicted = parseFloat((actual + noise).toFixed(2));
    backtest.push({ date: history[i].date, actual, predicted });
  }

  // Build forecast
  const forecast: ForecastRow[] = [];
  let forecastPrice = prices[0];
  for (let i = 0; i < 7; i++) {
    const fr = createSeededRandom(profile.seed + i + 9000);
    const dailyShift = (fr() - 0.48) * profile.vol * forecastPrice;
    forecastPrice += dailyShift;
    const uncertainty = 0.008 + i * 0.003;
    const low = parseFloat((forecastPrice * (1 - uncertainty)).toFixed(2));
    const high = parseFloat((forecastPrice * (1 + uncertainty)).toFixed(2));
    const confidence = parseFloat(Math.max(55, 82 - i * 3.5 + (fr() - 0.5) * 4).toFixed(1));
    const fDate = addBusinessDays(baseDate, i + 1);
    forecast.push({
      date: formatDate(fDate),
      predicted: parseFloat(forecastPrice.toFixed(2)),
      low,
      high,
      confidence,
    });
  }

  // Summary
  const currentPrice = prices[0];
  const prevClose = prices[1];
  const r0 = createSeededRandom(profile.seed + 99999);
  const dailyHigh = parseFloat((currentPrice * (1 + r0() * profile.vol * 0.6)).toFixed(2));
  const dailyLow = parseFloat((currentPrice * (1 - r0() * profile.vol * 0.6)).toFixed(2));
  const volume = Math.floor(15_000_000 + r0() * 40_000_000);

  const rsi = parseFloat(Math.min(100, Math.max(0, calculateRSI(prices, 0))).toFixed(2));
  const { macd: macdVal, signal: macdSig, histogram: macdHist } = calculateMACD(prices, 0);

  const ma100 = calculateSMA(prices, 100, 0);
  const ma200 = calculateSMA(prices, 200, 0);
  const ma250 = calculateSMA(prices, 250, 0);

  const squaredErrors = backtest.map((b) => Math.pow((b.predicted - b.actual) / b.actual, 2));
  const rmse = parseFloat(
    Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / squaredErrors.length).toFixed(4)
  );

  const metadata: TickerMetadata = {
    ticker,
    name: COMPANY_NAMES[ticker.symbol] ?? `${ticker.symbol} Inc.`,
    currency: profile.currency,
    timezone: profile.exchange === 'NSE' ? 'Asia/Kolkata' : 'America/New_York',
    marketHours:
      profile.exchange === 'NSE'
        ? { open: '09:15', close: '15:30', timezone: 'Asia/Kolkata' }
        : { open: '09:30', close: '16:00', timezone: 'America/New_York' },
    lotSize: profile.exchange === 'NSE' ? 1 : undefined,
    tickSize: profile.exchange === 'NSE' ? 0.05 : 0.01,
    sector: SECTORS[ticker.symbol] ?? 'Unknown',
    industry: INDUSTRIES[ticker.symbol] ?? 'Unknown',
  };

  return {
    metadata,
    summary: {
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      prevClose: parseFloat(prevClose.toFixed(2)),
      dailyHigh,
      dailyLow,
      volume,
      rsi,
      macd: {
        value: parseFloat(macdVal.toFixed(4)),
        signal: parseFloat(macdSig.toFixed(4)),
        histogram: parseFloat(macdHist.toFixed(4)),
      },
      ma100: parseFloat(ma100.toFixed(2)),
      ma200: parseFloat(ma200.toFixed(2)),
      ma250: parseFloat(ma250.toFixed(2)),
      backtestRMSE: rmse,
    },
    history,
    backtest,
    forecast,
  };
}

// ============================================================================
// EXPORTS FOR ADVANCED USAGE (New - opt-in)
// ============================================================================

export {
  providerRegistry,
  dataCache,
  createSeededRandom,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
};

// ============================================================================
// DEVELOPMENT HELPERS
// ============================================================================

/** Reset all providers and cache (useful for testing) */
export function resetDataLayer(): void {
  dataCache.clear();
  providerRegistry.initialize(DEFAULT_PROVIDER_CONFIGS);
}

/** Configure data layer programmatically (for tests or dynamic config) */
export function configureDataLayer(configs: DataProviderConfig[]): void {
  providerRegistry.initialize(configs);
}

/** Get current provider status */
export function getProviderStatus(): Array<{
  type: DataSourceType;
  name: string;
  healthy: boolean;
}> {
  return providerRegistry.getProviders().map((p) => ({
    type: p.type,
    name: p.name,
    healthy: false, // Would need async check
  }));
}
