// src/app/data/__tests__/dataLayer.contract.test.ts
// Milestone 1 — data contract guard. Protects the SHAPE of generateMockData()
// output (values change by design once real providers land in M2+). Uses Node's
// built-in test runner (node:test + node:assert) — no test framework dependency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateMockData, getMarketDataMode, type TickerData } from '../mockData';

const TICKERS = ['NVDA', 'RELIANCE.NS', 'TCS', 'ZZZZ']; // US, NSE-suffixed, NSE-alias, unknown→default

function assertTickerDataShape(data: TickerData | null): asserts data is TickerData {
  assert.ok(data, 'generateMockData returned null');
  assert.deepEqual(Object.keys(data).sort(), [
    'backtest',
    'forecast',
    'history',
    'metadata',
    'summary',
  ]);

  assert.equal(typeof data.metadata.name, 'string');
  assert.equal(typeof data.metadata.currency, 'string');
  assert.ok(data.metadata.ticker);

  for (const k of [
    'currentPrice',
    'prevClose',
    'dailyHigh',
    'dailyLow',
    'volume',
    'rsi',
    'ma100',
    'ma200',
    'ma250',
    'backtestRMSE',
  ] as const) {
    assert.ok(Number.isFinite(data.summary[k]), `summary.${k} not finite`);
  }
  for (const k of ['value', 'signal', 'histogram'] as const) {
    assert.ok(Number.isFinite(data.summary.macd[k]), `summary.macd.${k} not finite`);
  }

  assert.ok(data.history.length > 0, 'history empty');
  const row = data.history[0];
  for (const k of [
    'date',
    'open',
    'high',
    'low',
    'close',
    'volume',
    'ma100',
    'ma200',
    'ma250',
    'rsi',
    'macdLine',
    'macdSignal',
    'macdHistogram',
  ] as const) {
    assert.notEqual(row[k], undefined, `history row missing ${k}`);
  }

  assert.equal(data.forecast.length, 7, 'forecast horizon != 7');
  for (const f of data.forecast) {
    assert.ok(f.confidence >= 0 && f.confidence <= 100, 'confidence out of range');
    assert.ok(f.high >= f.low, 'forecast high < low');
  }

  assert.ok(data.backtest.length > 0, 'backtest empty');
  for (const b of data.backtest) {
    assert.ok(
      Number.isFinite(b.actual) && Number.isFinite(b.predicted),
      'backtest value not finite'
    );
  }
}

test('Milestone 1 flag defaults to mock mode', () => {
  assert.equal(getMarketDataMode(), 'mock');
});

for (const ticker of TICKERS) {
  test(`data contract holds for ${ticker}`, async () => {
    assertTickerDataShape(await generateMockData(ticker));
  });
}

test('generateMockData is deterministic per ticker (seeded engine)', async () => {
  const [a, b] = await Promise.all([generateMockData('NVDA'), generateMockData('NVDA')]);
  assert.ok(a && b);
  assert.equal(a.summary.currentPrice, b.summary.currentPrice); // seed-deterministic, date-independent
  assert.equal(a.history[0].close, b.history[0].close);
});
