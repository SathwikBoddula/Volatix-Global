// src/app/data/__tests__/marketDataService.test.ts
// Milestone 3 — MarketDataService unit tests. Fully offline: a fake IDataProvider
// and a marker mockFetch are injected; MARKET_DATA_MODE is toggled via process.env
// per test. Uses Node's built-in runner (node:test + node:assert). Timestamp/TTL
// assertions are intentionally out of scope here (data-status lands in M4).
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createMarketDataService } from '../marketDataService';
import {
  normalizeTicker,
  type IDataProvider,
  type DataResult,
  type NormalizedTicker,
  type TickerData,
  type TickerMetadata,
  type TickerSummary,
  type HistoryRow,
  type BacktestRow,
  type ForecastRow,
} from '../mockData';

// ---------------------------------------------------------------------------
// Fixtures & fakes
// ---------------------------------------------------------------------------

function okResult<T>(data: T): DataResult<T> {
  return { data, error: null, source: 'api', timestamp: 0, cached: false };
}

function failResult<T>(retryable: boolean): DataResult<T> {
  return {
    data: null,
    error: { code: 'FAKE_FAIL', message: 'fake failure', source: 'api', retryable },
    source: 'api',
    timestamp: 0,
    cached: false,
  };
}

function metaFor(ticker: NormalizedTicker): TickerMetadata {
  return {
    ticker,
    name: 'Fake Inc.',
    currency: ticker.currency,
    timezone: 'America/New_York',
    marketHours: { open: '09:30', close: '16:00', timezone: 'America/New_York' },
    sector: 'Technology',
    industry: 'Software',
  };
}

function summaryFor(price: number): TickerSummary {
  return {
    currentPrice: price,
    prevClose: price,
    dailyHigh: price,
    dailyLow: price,
    volume: 1000,
    rsi: 50,
    macd: { value: 0, signal: 0, histogram: 0 },
    ma100: price,
    ma200: price,
    ma250: price,
    backtestRMSE: 0,
  };
}

function historyRows(): HistoryRow[] {
  return [
    {
      date: '2024-01-02',
      open: 100,
      high: 101,
      low: 99,
      close: 100,
      volume: 1000,
      ma100: 100,
      ma200: 100,
      ma250: 100,
      rsi: 50,
      macdLine: 0,
      macdSignal: 0,
      macdHistogram: 0,
    },
  ];
}

function backtestRows(): BacktestRow[] {
  return [{ date: '2024-01-02', actual: 100, predicted: 100 }];
}

function forecastRows(): ForecastRow[] {
  return [{ date: '2024-01-03', predicted: 100, low: 99, high: 101, confidence: 80 }];
}

/** A full TickerData with an identifiable marker price (used for mockFetch). */
function mockTickerData(price: number): TickerData {
  return {
    metadata: metaFor(normalizeTicker('NVDA')),
    summary: summaryFor(price),
    history: historyRows(),
    backtest: backtestRows(),
    forecast: forecastRows(),
  };
}

/** Mutable controls the fake provider reads at call time. */
interface ProviderState {
  fail: boolean;
  retryable: boolean;
  price: number;
  summaryCalls: number; // == number of assemble attempts (getSummary runs once per assemble)
}

function makeProvider(state: ProviderState): IDataProvider {
  return {
    type: 'api',
    name: 'FakeProvider',
    supports: () => true,
    async getMetadata(ticker) {
      return state.fail ? failResult<TickerMetadata>(state.retryable) : okResult(metaFor(ticker));
    },
    async getHistory() {
      return state.fail ? failResult<HistoryRow[]>(state.retryable) : okResult(historyRows());
    },
    async getSummary() {
      state.summaryCalls++;
      return state.fail
        ? failResult<TickerSummary>(state.retryable)
        : okResult(summaryFor(state.price));
    },
    async getForecast() {
      return state.fail ? failResult<ForecastRow[]>(state.retryable) : okResult(forecastRows());
    },
    async getBacktest() {
      return state.fail ? failResult<BacktestRow[]>(state.retryable) : okResult(backtestRows());
    },
    async healthCheck() {
      return true;
    },
  };
}

function freshState(overrides: Partial<ProviderState> = {}): ProviderState {
  return { fail: false, retryable: true, price: 111, summaryCalls: 0, ...overrides };
}

afterEach(() => {
  delete process.env.MARKET_DATA_MODE;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('mock mode returns mockFetch result and never touches the live provider', async () => {
  process.env.MARKET_DATA_MODE = 'mock';
  const state = freshState();
  const service = createMarketDataService({
    liveProvider: makeProvider(state),
    mockFetch: async () => mockTickerData(999),
  });

  const data = await service.getTickerData('NVDA');

  assert.ok(data);
  assert.equal(data!.summary.currentPrice, 999); // from mockFetch
  assert.equal(state.summaryCalls, 0); // live provider never invoked in mock mode
});

test('live mode assembles and returns fresh live data', async () => {
  process.env.MARKET_DATA_MODE = 'live';
  const state = freshState({ price: 111 });
  const service = createMarketDataService({
    liveProvider: makeProvider(state),
    mockFetch: async () => mockTickerData(999),
  });

  const data = await service.getTickerData('NVDA');

  assert.ok(data);
  assert.equal(data!.summary.currentPrice, 111); // live data, not mock
  assert.equal(state.summaryCalls, 1); // one assemble, no retry needed
});

test('live failure serves the last-good cached data (stale), not mock or null', async () => {
  process.env.MARKET_DATA_MODE = 'live';
  const state = freshState({ price: 111 });
  const service = createMarketDataService({
    liveProvider: makeProvider(state),
    mockFetch: async () => mockTickerData(999),
  });

  const fresh = await service.getTickerData('NVDA'); // primes the cache
  assert.equal(fresh!.summary.currentPrice, 111);

  state.fail = true; // subsequent live fetches fail
  const stale = await service.getTickerData('NVDA');

  assert.ok(stale);
  assert.equal(stale!.summary.currentPrice, 111); // served from cache — not mock (999), not null
});

test('live failure retries retryable errors then returns null when no cache exists', async () => {
  process.env.MARKET_DATA_MODE = 'live';
  const state = freshState({ fail: true, retryable: true });
  const service = createMarketDataService({
    liveProvider: makeProvider(state),
    mockFetch: async () => mockTickerData(999),
  });

  const data = await service.getTickerData('NVDA');

  assert.equal(data, null);
  assert.equal(state.summaryCalls, 2); // initial attempt + 1 retry (default maxRetries = 1)
});

test('live failure does not retry non-retryable errors', async () => {
  process.env.MARKET_DATA_MODE = 'live';
  const state = freshState({ fail: true, retryable: false });
  const service = createMarketDataService({
    liveProvider: makeProvider(state),
    mockFetch: async () => mockTickerData(999),
  });

  const data = await service.getTickerData('NVDA');

  assert.equal(data, null);
  assert.equal(state.summaryCalls, 1); // broke immediately on non-retryable failure
});

test('live mode never silently falls back to mock', async () => {
  process.env.MARKET_DATA_MODE = 'live';
  const state = freshState({ fail: true, retryable: false });
  let mockCalls = 0;
  const service = createMarketDataService({
    liveProvider: makeProvider(state),
    mockFetch: async () => {
      mockCalls++;
      return mockTickerData(999);
    },
  });

  const data = await service.getTickerData('NVDA');

  assert.equal(data, null); // no data rather than fake data
  assert.equal(mockCalls, 0); // mock fetcher is never invoked in live mode
});

test('maxRetries is honored', async () => {
  process.env.MARKET_DATA_MODE = 'live';
  const state = freshState({ fail: true, retryable: true });
  const service = createMarketDataService({
    liveProvider: makeProvider(state),
    mockFetch: async () => mockTickerData(999),
    maxRetries: 3,
  });

  const data = await service.getTickerData('NVDA');

  assert.equal(data, null);
  assert.equal(state.summaryCalls, 4); // 1 initial + 3 retries
});
