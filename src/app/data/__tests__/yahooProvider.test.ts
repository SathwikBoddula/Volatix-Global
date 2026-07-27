// src/app/data/__tests__/YahooDataProvider.test.ts
// PR#005 — Unit tests for YahooDataProvider (Milestone 2 production behavior).
// Fully offline: a fake YahooClient is injected via YahooProviderOptions.client
// (the injection point the provider was built for), so no network calls and no
// real yahoo-finance2 import happen in this suite. Mirrors the fixture style of
// marketDataService.test.ts (Node's built-in test runner, plain fakes).
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  YahooDataProvider,
  type YahooClient,
  type YahooChartResult,
  type YahooChartQuote,
  type YahooQuote,
  type YahooQuoteSummary,
} from '../YahooDataProvider';
import { normalizeTicker } from '../mockData';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** `n` chronological (oldest→newest) bars on a steady uptrend, for deterministic ordering checks. */
function makeBars(n: number, startPrice = 100): YahooChartResult {
  const quotes: YahooChartQuote[] = [];
  let price = startPrice;
  const base = new Date('2024-01-01T00:00:00.000Z');
  for (let i = 0; i < n; i++) {
    const date = new Date(base);
    date.setUTCDate(date.getUTCDate() + i);
    quotes.push({
      date,
      open: price,
      high: price * 1.01,
      low: price * 0.99,
      close: price,
      volume: 1_000_000 + i,
    });
    price *= 1.001;
  }
  return { quotes };
}

interface FakeClientOptions {
  chartResult?: YahooChartResult;
  chartError?: unknown;
  chartDelayMs?: number;
  quote?: YahooQuote;
  quoteSummaryError?: unknown;
}

function makeFakeClient(opts: FakeClientOptions = {}): {
  client: YahooClient;
  calls: { chart: number; quote: number; quoteSummary: number };
} {
  const calls = { chart: 0, quote: 0, quoteSummary: 0 };
  const client: YahooClient = {
    async chart(): Promise<YahooChartResult> {
      calls.chart++;
      if (opts.chartDelayMs) await new Promise((r) => setTimeout(r, opts.chartDelayMs));
      if (opts.chartError) throw opts.chartError;
      return opts.chartResult ?? makeBars(300);
    },
    async quote(): Promise<YahooQuote> {
      calls.quote++;
      return opts.quote ?? {};
    },
    async quoteSummary(): Promise<YahooQuoteSummary> {
      calls.quoteSummary++;
      if (opts.quoteSummaryError) throw opts.quoteSummaryError;
      return {
        price: { longName: 'Fake Corp', currency: 'USD' },
        assetProfile: { sector: 'Technology', industry: 'Software' },
      };
    },
  };
  return { client, calls };
}

const NVDA = normalizeTicker('NVDA');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('getHistory returns newest-first rows with correct ordering', async () => {
  const { client } = makeFakeClient({ chartResult: makeBars(300) });
  const provider = new YahooDataProvider({ client });

  const result = await provider.getHistory({ ticker: NVDA, range: '1y' });

  assert.equal(result.error, null);
  assert.ok(result.data && result.data.length > 0);
  // Uptrend fixture: row 0 (most recent) must have a higher close than the last row.
  assert.ok(result.data![0].close > result.data![result.data!.length - 1].close);
});

test('getSummary prefers live quote fields over derived closes', async () => {
  const { client } = makeFakeClient({
    chartResult: makeBars(300),
    quote: { regularMarketPrice: 555.55, regularMarketPreviousClose: 550 },
  });
  const provider = new YahooDataProvider({ client });

  const result = await provider.getSummary({ ticker: NVDA });

  assert.equal(result.error, null);
  assert.equal(result.data!.currentPrice, 555.55);
  assert.equal(result.data!.prevClose, 550);
});

test('getSummary falls back to the most recent close when quote fields are missing', async () => {
  const bars = makeBars(300);
  const { client } = makeFakeClient({ chartResult: bars, quote: {} });
  const provider = new YahooDataProvider({ client });

  const result = await provider.getSummary({ ticker: NVDA });

  assert.equal(result.error, null);
  const mostRecentClose = bars.quotes[bars.quotes.length - 1].close!;
  assert.equal(result.data!.currentPrice, Math.round(mostRecentClose * 100) / 100);
});

test('getMetadata degrades gracefully when quoteSummary fails', async () => {
  const { client } = makeFakeClient({ quoteSummaryError: new Error('profile unavailable') });
  const provider = new YahooDataProvider({ client });

  const result = await provider.getMetadata(NVDA);

  assert.equal(result.error, null); // a profile miss must not fail the whole fetch
  assert.equal(result.data!.name, NVDA.symbol); // falls back to the raw symbol
  assert.equal(result.data!.sector, 'Unknown');
  assert.equal(result.data!.industry, 'Unknown');
});

test('empty chart data surfaces as non-retryable YAHOO_NO_DATA', async () => {
  const { client } = makeFakeClient({ chartResult: { quotes: [] } });
  const provider = new YahooDataProvider({ client });

  const result = await provider.getHistory({ ticker: NVDA, range: '1y' });

  assert.equal(result.data, null);
  assert.equal(result.error!.code, 'YAHOO_NO_DATA');
  assert.equal(result.error!.retryable, false);
});

test('a generic fetch failure surfaces as retryable YAHOO_FETCH_FAILED', async () => {
  const { client } = makeFakeClient({ chartError: new Error('network blip') });
  const provider = new YahooDataProvider({ client });

  const result = await provider.getHistory({ ticker: NVDA, range: '1y' });

  assert.equal(result.data, null);
  assert.equal(result.error!.code, 'YAHOO_FETCH_FAILED');
  assert.equal(result.error!.retryable, true);
});

test('a request exceeding timeoutMs surfaces as a retryable failure', async () => {
  const { client } = makeFakeClient({ chartDelayMs: 50 });
  const provider = new YahooDataProvider({ client, timeoutMs: 5 });

  const result = await provider.getHistory({ ticker: NVDA, range: '1y' });

  assert.equal(result.data, null);
  assert.equal(result.error!.retryable, true);
});

test('concurrent requests for the same symbol/range are coalesced into one chart() call', async () => {
  const { client, calls } = makeFakeClient({ chartResult: makeBars(300) });
  const provider = new YahooDataProvider({ client });

  const [a, b] = await Promise.all([
    provider.getHistory({ ticker: NVDA, range: '1y' }),
    provider.getHistory({ ticker: NVDA, range: '1y' }),
  ]);

  assert.equal(calls.chart, 1); // coalesced — not two independent fetches
  assert.ok(a.data && b.data);
});

test('healthCheck reflects live quote availability', async () => {
  const healthy = makeFakeClient({ quote: { regularMarketPrice: 200 } });
  const healthyProvider = new YahooDataProvider({ client: healthy.client });
  assert.equal(await healthyProvider.healthCheck(), true);

  const unhealthy = makeFakeClient({ quote: {} });
  const unhealthyProvider = new YahooDataProvider({ client: unhealthy.client });
  assert.equal(await unhealthyProvider.healthCheck(), false);
});
